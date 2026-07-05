#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/run-macos-deploy.sh"

echo "[CasVarDB UAT] Preparing Docker runtime with Colima..."

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif command -v brew >/dev/null 2>&1; then
  eval "$(brew shellenv)"
else
  echo "Homebrew is required to start Colima on this Mac."
  echo "Expected command from sysadmin: eval \"\$(/opt/homebrew/bin/brew shellenv)\""
  exit 1
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found after loading Homebrew environment: $1"
    exit 1
  fi
}

require_command colima
require_command docker

echo "[CasVarDB UAT] Starting Colima with Docker runtime..."
colima start --runtime docker

echo "[CasVarDB UAT] Switching Docker context to Colima..."
docker context use colima

echo "[CasVarDB UAT] Checking Docker daemon..."
docker ps

echo "[CasVarDB UAT] Running Docker hello-world smoke test..."
docker run hello-world

echo "[CasVarDB UAT] Docker runtime is ready; launching CasVarDB deploy script..."
exec bash "$DEPLOY_SCRIPT"
