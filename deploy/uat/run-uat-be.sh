#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-nestjs"
API_PORT="${API_PORT:-8888}"
SQS_QUEUE_NAME="${SQS_QUEUE_NAME:-casvardb-jobs}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1"
    exit 1
  fi
}

use_colima_if_available() {
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi

  if command -v colima >/dev/null 2>&1; then
    colima start --runtime docker >/dev/null
    docker context use colima >/dev/null
  fi
}

assert_port_free() {
  if lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $1 is already in use. Stop that process first."
    exit 1
  fi
}

wait_for_mysql() {
  for _ in $(seq 1 60); do
    if (cd "$BACKEND_DIR" && docker-compose exec -T mysql mysqladmin ping -h 127.0.0.1 -prootpass --silent >/dev/null 2>&1); then
      return 0
    fi
    sleep 2
  done

  echo "MySQL did not become ready."
  exit 1
}

wait_for_localstack() {
  for _ in $(seq 1 60); do
    if curl -fs "$SQS_ENDPOINT/_localstack/health" | grep -q '"sqs"' >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "LocalStack SQS did not become ready."
  exit 1
}

compose_port() {
  local service="$1"
  local port="$2"
  local address

  address="$(cd "$BACKEND_DIR" && docker-compose port "$service" "$port" | tr -d '\r')"
  if [[ "$address" == "[::]:"* ]]; then
    echo "${address##*:}"
  else
    echo "${address##*:}"
  fi
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

require_command docker
require_command docker-compose
require_command npm
require_command curl
require_command lsof

use_colima_if_available
assert_port_free "$API_PORT"

echo "[BE] Starting Docker MySQL and LocalStack..."
(cd "$BACKEND_DIR" && docker-compose up -d mysql localstack)

wait_for_mysql

export DB_HOST="127.0.0.1"
export DB_PORT="$(compose_port mysql 3306)"
export DB_USER="${DB_USER:-collab_casvardb}"
export DB_PASSWORD="${DB_PASSWORD:-Cv2y*%}"
export DB_NAME="${DB_NAME:-casvardb}"

export SQS_ENDPOINT="http://127.0.0.1:$(compose_port localstack 4566)"
export AWS_REGION="${AWS_REGION:-ap-southeast-2}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export SQS_QUEUE_NAME
export SQS_WAIT_TIME_SECONDS="${SQS_WAIT_TIME_SECONDS:-10}"
export SQS_VISIBILITY_TIMEOUT_SECONDS="${SQS_VISIBILITY_TIMEOUT_SECONDS:-300}"

wait_for_localstack

echo "[BE] Ensuring queue exists: $SQS_QUEUE_NAME"
(cd "$BACKEND_DIR" && docker-compose exec -T localstack awslocal sqs create-queue --queue-name "$SQS_QUEUE_NAME" --region "$AWS_REGION" >/dev/null)

if [[ ! -d "$BACKEND_DIR/node_modules/@nestjs/core" ]]; then
  echo "[BE] Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install)
fi

cas9_count="$(table_count cas9)"
cas12_count="$(table_count cas12)"
grna_count="$(table_count grna_scaffold)"

echo "[BE] DB rows: cas9=$cas9_count cas12=$cas12_count grna_scaffold=$grna_count"
if [[ "$cas9_count" == "0" || "$cas12_count" == "0" || "$grna_count" == "0" ]]; then
  echo "[BE] Clean/incomplete DB detected. Running db:init..."
  (cd "$BACKEND_DIR" && npm run db:init)
fi

echo "[BE] Starting NestJS API on 0.0.0.0:$API_PORT"
echo "[BE] SQS endpoint: $SQS_ENDPOINT"
(cd "$BACKEND_DIR" && PORT="$API_PORT" npm start)
