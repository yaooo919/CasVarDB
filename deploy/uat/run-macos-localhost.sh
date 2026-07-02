#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-nestjs"
FRONTEND_DIR="$ROOT_DIR/frontend"

backend_pid=""
worker_pid=""
frontend_pid=""
DOCKER_CMD=()
COMPOSE_CMD=()

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1"
    exit 1
  fi
}

install_user_docker_compose_plugin() {
  local arch
  local download_url
  local plugin_dir
  local plugin_path
  local tmp_path

  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required to install the Docker Compose plugin."
    exit 1
  fi

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

  echo "Docker is installed, but the Docker Compose plugin is missing."
  echo "Installing Docker Compose plugin for this user..."
  echo "  $plugin_path"

  mkdir -p "$plugin_dir"
  curl -fL --retry 3 "$download_url" -o "$tmp_path"
  chmod +x "$tmp_path"
  mv "$tmp_path" "$plugin_path"
}

ensure_docker_compose() {
  local docker_desktop_cli="/Applications/Docker.app/Contents/Resources/bin/docker"
  local has_docker_cli=0

  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_CMD=(docker)
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if command -v docker >/dev/null 2>&1; then
    DOCKER_CMD=(docker)
    has_docker_cli=1
  fi

  if [[ -x "$docker_desktop_cli" ]] && "$docker_desktop_cli" compose version >/dev/null 2>&1; then
    DOCKER_CMD=("$docker_desktop_cli")
    COMPOSE_CMD=("$docker_desktop_cli" compose)
    return 0
  fi

  if [[ -x "$docker_desktop_cli" ]]; then
    DOCKER_CMD=("$docker_desktop_cli")
    has_docker_cli=1
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  if [[ "$has_docker_cli" == "0" ]]; then
    echo "Docker is required but was not found."
    echo "Install Docker Desktop for macOS, start it, and rerun this script."
    exit 1
  fi

  install_user_docker_compose_plugin

  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_CMD=(docker)
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if [[ -x "$docker_desktop_cli" ]] && "$docker_desktop_cli" compose version >/dev/null 2>&1; then
    DOCKER_CMD=("$docker_desktop_cli")
    COMPOSE_CMD=("$docker_desktop_cli" compose)
    return 0
  fi

  echo "Docker Compose plugin was installed, but 'docker compose version' is still unavailable."
  echo "Check Docker CLI plugin discovery or run: docker compose version"
  exit 1
}

docker_compose() {
  "${COMPOSE_CMD[@]}" "$@"
}

docker_info() {
  [[ "${#DOCKER_CMD[@]}" -gt 0 ]] && "${DOCKER_CMD[@]}" info >/dev/null 2>&1
}

try_docker_desktop_socket() {
  local socket_path="$HOME/.docker/run/docker.sock"
  local previous_docker_host="${DOCKER_HOST-}"
  local had_docker_host=0

  if [[ -n "${DOCKER_HOST-}" ]]; then
    had_docker_host=1
  fi

  if [[ ! -S "$socket_path" ]]; then
    return 1
  fi

  export DOCKER_HOST="unix://$socket_path"
  if docker_info; then
    echo "Using Docker Desktop socket: $socket_path"
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

  if docker_info || try_docker_desktop_socket; then
    return 0
  fi

  if [[ -d "/Applications/Docker.app" ]] && command -v open >/dev/null 2>&1; then
    echo "Docker is installed, but the Docker daemon is not reachable. Starting Docker Desktop..."
    open -ga Docker >/dev/null 2>&1 || true

    for attempt in $(seq 1 90); do
      if docker_info || try_docker_desktop_socket; then
        return 0
      fi
      sleep 2
    done
  fi

  echo "Docker is installed, but the Docker daemon is not reachable."
  echo "Start Docker Desktop and wait until it is running, then rerun this script."
  echo "If Docker Desktop is already running, check the active Docker context:"
  echo "  docker context ls"
  echo "  docker context use desktop-linux"
  echo "  docker info"
  exit 1
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

echo "[CasVarDB UAT] Starting macOS local stack..."

ensure_docker_compose
require_command npm
require_command lsof
require_command curl
ensure_docker_daemon

assert_port_free 8888 "NestJS API"
assert_port_free 3000 "React frontend"

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

echo "[CasVarDB UAT] Launching NestJS API, queue worker, and React frontend..."
echo "NestJS API: http://localhost:8888"
echo "React frontend: http://localhost:3000"
echo "LocalStack SQS: $SQS_ENDPOINT"

(cd "$BACKEND_DIR" && AWS_REGION=ap-southeast-2 AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test SQS_ENDPOINT="$SQS_ENDPOINT" SQS_QUEUE_NAME=casvardb-jobs SQS_WAIT_TIME_SECONDS=10 SQS_VISIBILITY_TIMEOUT_SECONDS=300 npm start) &
backend_pid="$!"

(cd "$BACKEND_DIR" && AWS_REGION=ap-southeast-2 AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test SQS_ENDPOINT="$SQS_ENDPOINT" SQS_QUEUE_NAME=casvardb-jobs SQS_WAIT_TIME_SECONDS=10 SQS_VISIBILITY_TIMEOUT_SECONDS=300 WORKER_POLL_INTERVAL_MS=1000 WORKER_CONCURRENCY=4 npm run start:worker) &
worker_pid="$!"

(cd "$FRONTEND_DIR" && REACT_APP_API_URL=http://localhost:8888 npm start) &
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
