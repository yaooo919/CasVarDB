#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
PUBLIC_URL_VALUE="${PUBLIC_URL:-/CasVarDB}"
PUBLIC_API_URL="${REACT_APP_API_URL:-http://163.1.88.125:8888}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1"
    exit 1
  fi
}

assert_port_free() {
  if lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $1 is already in use. Stop that process first."
    exit 1
  fi
}

require_command npm
require_command lsof

assert_port_free "$FRONTEND_PORT"

if [[ ! -d "$FRONTEND_DIR/node_modules/react-scripts" ]]; then
  echo "[FE] Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

echo "[FE] Writing frontend .env"
printf "PUBLIC_URL=%s\nREACT_APP_API_URL=%s\n" "$PUBLIC_URL_VALUE" "$PUBLIC_API_URL" > "$FRONTEND_DIR/.env"

echo "[FE] Starting React frontend on 0.0.0.0:$FRONTEND_PORT"
echo "[FE] PUBLIC_URL=$PUBLIC_URL_VALUE"
echo "[FE] REACT_APP_API_URL=$PUBLIC_API_URL"
(cd "$FRONTEND_DIR" && HOST=0.0.0.0 PORT="$FRONTEND_PORT" npm start)
