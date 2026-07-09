#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-nestjs"
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

require_command docker
require_command docker-compose
require_command npm
require_command curl

use_colima_if_available

echo "[Worker] Starting Docker MySQL and LocalStack..."
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
export WORKER_POLL_INTERVAL_MS="${WORKER_POLL_INTERVAL_MS:-1000}"
export WORKER_CONCURRENCY="${WORKER_CONCURRENCY:-4}"

wait_for_localstack

echo "[Worker] Ensuring queue exists: $SQS_QUEUE_NAME"
(cd "$BACKEND_DIR" && docker-compose exec -T localstack awslocal sqs create-queue --queue-name "$SQS_QUEUE_NAME" --region "$AWS_REGION" >/dev/null)

if [[ ! -d "$BACKEND_DIR/node_modules/@nestjs/core" ]]; then
  echo "[Worker] Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install)
fi

echo "[Worker] Starting queue worker; concurrency=$WORKER_CONCURRENCY"
echo "[Worker] SQS endpoint: $SQS_ENDPOINT"
(cd "$BACKEND_DIR" && npm run start:worker)
