#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend-nestjs"
FRONTEND_DIR="$ROOT_DIR/frontend"

backend_pid=""
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
}

trap cleanup INT TERM EXIT

echo "[CasVarDB UAT] Starting macOS local stack..."

ensure_docker_compose
require_command npm
require_command lsof

assert_port_free 8888 "NestJS API"
assert_port_free 3000 "React frontend"

echo "[1/5] Starting Docker MySQL..."
(cd "$BACKEND_DIR" && docker-compose up -d)

echo "[2/5] Waiting for MySQL to become healthy..."
wait_for_mysql

if [[ ! -d "$BACKEND_DIR/node_modules/@fastify/multipart" ]]; then
  echo "[3/5] Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install)
else
  echo "[3/5] Backend dependencies already installed."
fi

echo "[4/5] Checking database data..."
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
  echo "[5/5] Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
else
  echo "[5/5] Frontend dependencies already installed."
fi

echo "[CasVarDB UAT] Launching NestJS API and React frontend..."
echo "NestJS API: http://localhost:8888"
echo "React frontend: http://localhost:3000"

(cd "$BACKEND_DIR" && npm start) &
backend_pid="$!"

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

  sleep 2
done
