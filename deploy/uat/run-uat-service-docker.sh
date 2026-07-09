#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.uat-service.yml"

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

if command -v colima >/dev/null 2>&1; then
  colima start --runtime docker
  docker context use colima
fi

docker-compose -f "$COMPOSE_FILE" up --build "$@"
