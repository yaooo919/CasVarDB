#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-nestjs"
FRONTEND_DIR="$ROOT_DIR/frontend"
PUBLIC_IP="163.1.88.125"
API_PORT="8888"
FRONTEND_PORT="3000"
PUBLIC_API_URL="http://$PUBLIC_IP:$API_PORT"

backend_pid=""
worker_pid=""
frontend_pid=""
DOCKER_BIN=""
DOCKER_CMD=()
COMPOSE_CMD=()

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1"
    exit 1
  fi
}

ensure_docker_cli() {
  local docker_desktop_cli="/Applications/Docker.app/Contents/Resources/bin/docker"

  if command -v docker >/dev/null 2>&1; then
    DOCKER_BIN="$(command -v docker)"
    return 0
  fi

  if [[ -x "$docker_desktop_cli" ]]; then
    DOCKER_BIN="$docker_desktop_cli"
    return 0
  fi

  echo "Docker CLI is required but was not found."
  echo "Install or start your user-level Docker app, then rerun this script."
  exit 1
}

install_user_docker_compose_plugin() {
  local arch
  local download_url
  local plugin_dir
  local plugin_path
  local tmp_path

  case "$(uname -m)" in
    arm64|aarch64)
      arch="aarch64"
      ;;
    x86_64|amd64)
      arch="x86_64"
      ;;
    *)
      echo "Unsupported macOS CPU architecture for Docker Compose: $(uname -m)"
      exit 1
      ;;
  esac

  plugin_dir="${DOCKER_CONFIG:-$HOME/.docker}/cli-plugins"
  plugin_path="$plugin_dir/docker-compose"
  tmp_path="$plugin_path.tmp.$$"
  download_url="${CASVARDB_COMPOSE_DOWNLOAD_URL:-https://github.com/docker/compose/releases/latest/download/docker-compose-darwin-$arch}"

  echo "Docker Compose plugin is missing. Installing it for this user only..."
  echo "  $plugin_path"

  mkdir -p "$plugin_dir"
  curl -fL --retry 3 "$download_url" -o "$tmp_path"
  chmod +x "$tmp_path"
  mv "$tmp_path" "$plugin_path"
}

ensure_docker_compose() {
  if "$DOCKER_BIN" compose version >/dev/null 2>&1; then
    return 0
  fi

  install_user_docker_compose_plugin

  if "$DOCKER_BIN" compose version >/dev/null 2>&1; then
    return 0
  fi

  echo "Docker Compose plugin was installed, but '$DOCKER_BIN compose version' still fails."
  echo "Check Docker CLI plugin discovery for: ${DOCKER_CONFIG:-$HOME/.docker}/cli-plugins/docker-compose"
  exit 1
}

set_docker_client() {
  DOCKER_CMD=("$@")
  COMPOSE_CMD=("$@" compose)
}

docker_client_can_reach_daemon() {
  "${DOCKER_CMD[@]}" info >/dev/null 2>&1
}

compose_can_reach_daemon() {
  (cd "$BACKEND_DIR" && "${COMPOSE_CMD[@]}" ps >/dev/null 2>&1)
}

try_docker_client() {
  set_docker_client "$@"
  docker_client_can_reach_daemon && compose_can_reach_daemon
}

try_docker_socket() {
  local socket_path="$1"
  local previous_docker_host="${DOCKER_HOST-}"
  local had_docker_host=0

  if [[ -n "${DOCKER_HOST-}" ]]; then
    had_docker_host=1
  fi

  if [[ ! -S "$socket_path" ]]; then
    return 1
  fi

  export DOCKER_HOST="unix://$socket_path"

  if try_docker_client "$DOCKER_BIN"; then
    echo "Using Docker socket: $socket_path"
    return 0
  fi

  if [[ "$had_docker_host" == "1" ]]; then
    export DOCKER_HOST="$previous_docker_host"
  else
    unset DOCKER_HOST
  fi

  return 1
}

ensure_docker_daemon() {
  local attempt

  if try_docker_client "$DOCKER_BIN"; then
    return 0
  fi

  if "$DOCKER_BIN" context inspect desktop-linux >/dev/null 2>&1 && try_docker_client "$DOCKER_BIN" --context desktop-linux; then
    echo "Using Docker context: desktop-linux"
    return 0
  fi

  if try_docker_socket "$HOME/.docker/run/docker.sock"; then
    return 0
  fi

  if [[ -d "/Applications/Docker.app" ]] && command -v open >/dev/null 2>&1; then
    echo "Docker daemon is not reachable. Starting Docker Desktop..."
    open -ga Docker >/dev/null 2>&1 || true

    for attempt in $(seq 1 90); do
      if try_docker_client "$DOCKER_BIN"; then
        return 0
      fi

      if "$DOCKER_BIN" context inspect desktop-linux >/dev/null 2>&1 && try_docker_client "$DOCKER_BIN" --context desktop-linux; then
        echo "Using Docker context: desktop-linux"
        return 0
      fi

      if try_docker_socket "$HOME/.docker/run/docker.sock"; then
        return 0
      fi

      sleep 2
    done
  fi

  echo "Docker CLI is installed, but the Docker daemon is not reachable by Docker Compose."
  echo "Start Docker Desktop, Colima, or your user-level Docker daemon, then rerun this script."
  echo "Useful checks:"
  echo "  docker context ls"
  echo "  docker --context desktop-linux info"
  echo "  docker compose ps"
  echo "This script uses only user-writable paths."
  exit 1
}

docker_compose() {
  "${COMPOSE_CMD[@]}" "$@"
}

assert_port_free() {
  local port="$1"
  local name="$2"

  if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use for $name. Stop the existing process and rerun this script."
    exit 1
  fi
}

localstack_endpoint() {
  local address

  address="$(cd "$BACKEND_DIR" && docker_compose port localstack 4566 | tr -d '\r')"
  if [[ -z "$address" ]]; then
    echo "Could not discover LocalStack host port."
    exit 1
  fi

  if [[ "$address" == "[::]:"* ]]; then
    address="127.0.0.1:${address##*:}"
  else
    address="${address/0.0.0.0/127.0.0.1}"
  fi

  echo "http://$address"
}

wait_for_localstack() {
  local endpoint="$1"
  local attempt

  for attempt in $(seq 1 60); do
    if curl -fs "$endpoint/_localstack/health" | grep -q '"sqs"' >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "LocalStack SQS did not become ready in time."
  exit 1
}

wait_for_mysql() {
  local attempt

  for attempt in $(seq 1 60); do
    if (cd "$BACKEND_DIR" && docker_compose exec -T mysql mysqladmin ping -h 127.0.0.1 -prootpass --silent >/dev/null 2>&1); then
      return 0
    fi
    sleep 2
  done

  echo "MySQL did not become ready in time."
  exit 1
}

table_count() {
  local table="$1"
  local count

  count="$(cd "$BACKEND_DIR" && docker_compose exec -T mysql mysql -uroot -prootpass -N -B -e "SELECT COUNT(*) FROM casvardb.$table;" 2>/dev/null | tr -d '\r' | tail -n 1 || true)"
  if [[ "$count" =~ ^[0-9]+$ ]]; then
    echo "$count"
  else
    echo "0"
  fi
}

cleanup() {
  if [[ -n "$frontend_pid" ]] && kill -0 "$frontend_pid" >/dev/null 2>&1; then
    kill "$frontend_pid" >/dev/null 2>&1 || true
  fi

  if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" >/dev/null 2>&1; then
    kill "$backend_pid" >/dev/null 2>&1 || true
  fi

  if [[ -n "$worker_pid" ]] && kill -0 "$worker_pid" >/dev/null 2>&1; then
    kill "$worker_pid" >/dev/null 2>&1 || true
  fi
}

trap cleanup INT TERM EXIT

echo "[CasVarDB UAT] Starting macOS user-space static-IP stack..."

require_command curl
require_command lsof
require_command npm
ensure_docker_cli
ensure_docker_compose
ensure_docker_daemon

assert_port_free "$API_PORT" "NestJS API"
assert_port_free "$FRONTEND_PORT" "React frontend"

echo "[1/6] Starting Docker MySQL and LocalStack SQS..."
(cd "$BACKEND_DIR" && docker_compose up -d)

echo "[2/6] Waiting for MySQL to become healthy..."
wait_for_mysql

SQS_ENDPOINT="$(localstack_endpoint)"

echo "[3/6] Waiting for LocalStack SQS at $SQS_ENDPOINT..."
wait_for_localstack "$SQS_ENDPOINT"

if [[ ! -d "$BACKEND_DIR/node_modules/@fastify/multipart" ]]; then
  echo "[4/6] Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install)
else
  echo "[4/6] Backend dependencies already installed."
fi

echo "[5/6] Checking database data..."
cas9_count="$(table_count cas9)"
cas12_count="$(table_count cas12)"
grna_count="$(table_count grna_scaffold)"

echo "    cas9 rows: $cas9_count"
echo "    cas12 rows: $cas12_count"
echo "    grna_scaffold rows: $grna_count"

if [[ "$cas9_count" == "0" || "$cas12_count" == "0" || "$grna_count" == "0" ]]; then
  echo "    Clean or incomplete database detected. Running db init..."
  (cd "$BACKEND_DIR" && npm run db:init)
else
  echo "    Existing data detected. Skipping db init."
fi

if [[ ! -d "$FRONTEND_DIR/node_modules/typescript" ]]; then
  echo "[6/6] Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
else
  echo "[6/6] Frontend dependencies already installed."
fi

echo "[CasVarDB UAT] Writing frontend .env for static IP API..."
printf "PUBLIC_URL=/CasVarDB\nREACT_APP_API_URL=%s\n" "$PUBLIC_API_URL" > "$FRONTEND_DIR/.env"

echo "[CasVarDB UAT] Launching NestJS API, queue worker, and React frontend..."
echo "NestJS API bind: http://0.0.0.0:$API_PORT"
echo "NestJS API public: $PUBLIC_API_URL"
echo "React frontend bind: http://0.0.0.0:$FRONTEND_PORT"
echo "React frontend public: http://$PUBLIC_IP:$FRONTEND_PORT"
echo "LocalStack SQS: $SQS_ENDPOINT"

(cd "$BACKEND_DIR" && PORT="$API_PORT" AWS_REGION=ap-southeast-2 AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test SQS_ENDPOINT="$SQS_ENDPOINT" SQS_QUEUE_NAME=casvardb-jobs SQS_WAIT_TIME_SECONDS=10 SQS_VISIBILITY_TIMEOUT_SECONDS=300 npm start) &
backend_pid="$!"

(cd "$BACKEND_DIR" && AWS_REGION=ap-southeast-2 AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test SQS_ENDPOINT="$SQS_ENDPOINT" SQS_QUEUE_NAME=casvardb-jobs SQS_WAIT_TIME_SECONDS=10 SQS_VISIBILITY_TIMEOUT_SECONDS=300 WORKER_POLL_INTERVAL_MS=1000 WORKER_CONCURRENCY=4 npm run start:worker) &
worker_pid="$!"

(cd "$FRONTEND_DIR" && HOST=0.0.0.0 PORT="$FRONTEND_PORT" npm start) &
frontend_pid="$!"

while true; do
  if ! kill -0 "$backend_pid" >/dev/null 2>&1; then
    echo "NestJS API process stopped."
    exit 1
  fi

  if ! kill -0 "$frontend_pid" >/dev/null 2>&1; then
    echo "React frontend process stopped."
    exit 1
  fi

  if ! kill -0 "$worker_pid" >/dev/null 2>&1; then
    echo "Queue worker process stopped."
    exit 1
  fi

  sleep 2
done
