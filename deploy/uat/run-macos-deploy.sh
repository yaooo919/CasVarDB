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

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1"
    exit 1
  fi
}

ensure_docker_compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    return 0
  fi

  echo "docker-compose is not installed. Installing docker-compose with Homebrew..."

  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required to auto-install docker-compose on macOS."
    echo "Install Homebrew first, then rerun this script: https://brew.sh"
    exit 1
  fi

  brew install docker-compose

  if ! command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose installation finished, but the docker-compose command is still unavailable."
    echo "Restart the terminal or check your Homebrew PATH, then rerun this script."
    exit 1
  fi
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

  address="$(cd "$BACKEND_DIR" && docker-compose port localstack 4566 | tr -d '\r')"
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
    if (cd "$BACKEND_DIR" && docker-compose exec -T mysql mysqladmin ping -h 127.0.0.1 -prootpass --silent >/dev/null 2>&1); then
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

  count="$(cd "$BACKEND_DIR" && docker-compose exec -T mysql mysql -uroot -prootpass -N -B -e "SELECT COUNT(*) FROM casvardb.$table;" 2>/dev/null | tr -d '\r' | tail -n 1 || true)"
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

echo "[CasVarDB UAT] Starting macOS static-IP stack..."

ensure_docker_compose
require_command npm
require_command lsof
require_command curl

assert_port_free "$API_PORT" "NestJS API"
assert_port_free "$FRONTEND_PORT" "React frontend"

echo "[1/6] Starting Docker MySQL and LocalStack SQS..."
(cd "$BACKEND_DIR" && docker-compose up -d)

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
