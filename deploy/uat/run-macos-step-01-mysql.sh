#!/usr/bin/env bash
set -euo pipefail

MYSQL_IMAGE="${MYSQL_IMAGE:-mysql:8.0}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-casvardb-mysql}"
MYSQL_VOLUME="${MYSQL_VOLUME:-casvardb_mysql_data}"
MYSQL_HOST_PORT="${MYSQL_HOST_PORT:-3306}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-rootpass}"
MYSQL_DATABASE="${MYSQL_DATABASE:-casvardb}"
MYSQL_USER="${MYSQL_USER:-collab_casvardb}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-Cv2y*%}"

DOCKER_CMD=()

ensure_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "This script is only for macOS."
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1"
    exit 1
  fi
}

set_docker_cmd() {
  DOCKER_CMD=("$@")
}

docker_ok() {
  "${DOCKER_CMD[@]}" info >/dev/null 2>&1
}

try_docker_context() {
  local context_name="$1"

  [[ -n "$context_name" ]] || return 1
  docker context inspect "$context_name" >/dev/null 2>&1 || return 1
  unset DOCKER_HOST
  set_docker_cmd docker --context "$context_name"

  if docker_ok; then
    echo "Using Docker context: $context_name"
    return 0
  fi

  return 1
}

try_docker_socket() {
  local socket_path="$1"

  [[ -S "$socket_path" ]] || return 1
  export DOCKER_HOST="unix://$socket_path"
  set_docker_cmd docker

  if docker_ok; then
    echo "Using Docker socket: $socket_path"
    return 0
  fi

  unset DOCKER_HOST
  return 1
}

ensure_docker_daemon() {
  local attempt
  local context_name

  set_docker_cmd docker
  docker_ok && return 0

  for context_name in desktop-linux colima orbstack rancher-desktop default; do
    try_docker_context "$context_name" && return 0
  done

  for context_name in $(docker context ls --format '{{.Name}}' 2>/dev/null); do
    try_docker_context "$context_name" && return 0
  done

  try_docker_socket "$HOME/.docker/run/docker.sock" && return 0
  try_docker_socket "$HOME/Library/Containers/com.docker.docker/Data/docker.sock" && return 0
  try_docker_socket "$HOME/.colima/default/docker.sock" && return 0
  try_docker_socket "$HOME/.orbstack/run/docker.sock" && return 0
  try_docker_socket "$HOME/.rd/docker.sock" && return 0

  if command -v colima >/dev/null 2>&1; then
    echo "Docker daemon is not reachable. Trying to start Colima..."
    colima start >/dev/null 2>&1 || true
  fi

  if command -v orb >/dev/null 2>&1; then
    echo "Docker daemon is not reachable. Trying to start OrbStack..."
    orb start >/dev/null 2>&1 || true
  fi

  if command -v rdctl >/dev/null 2>&1; then
    echo "Docker daemon is not reachable. Trying to start Rancher Desktop..."
    rdctl start >/dev/null 2>&1 || true
  fi

  if [[ -d "/Applications/Docker.app" ]] && command -v open >/dev/null 2>&1; then
    echo "Docker daemon is not reachable. Trying to start Docker Desktop..."
    open -g -a Docker >/dev/null 2>&1 || true
  fi

  for attempt in $(seq 1 90); do
    set_docker_cmd docker
    docker_ok && return 0

    for context_name in desktop-linux colima orbstack rancher-desktop default; do
      try_docker_context "$context_name" && return 0
    done

    try_docker_socket "$HOME/.docker/run/docker.sock" && return 0
    try_docker_socket "$HOME/Library/Containers/com.docker.docker/Data/docker.sock" && return 0
    try_docker_socket "$HOME/.colima/default/docker.sock" && return 0
    try_docker_socket "$HOME/.orbstack/run/docker.sock" && return 0
    try_docker_socket "$HOME/.rd/docker.sock" && return 0

    sleep 2
  done

  echo "Docker CLI exists, but no reachable Docker daemon was found."
  echo "This means 'docker' is installed, but no container runtime is running for user $(whoami)."
  echo "Start Docker Desktop, Colima, OrbStack, or Rancher Desktop, then rerun this script."
  echo "Useful checks:"
  echo "  docker context ls"
  echo "  docker info"
  exit 1
}

container_exists() {
  "${DOCKER_CMD[@]}" container inspect "$MYSQL_CONTAINER" >/dev/null 2>&1
}

container_running() {
  [[ "$("${DOCKER_CMD[@]}" inspect -f '{{.State.Running}}' "$MYSQL_CONTAINER" 2>/dev/null || true)" == "true" ]]
}

assert_port_free_for_new_container() {
  if command -v lsof >/dev/null 2>&1 && lsof -iTCP:"$MYSQL_HOST_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $MYSQL_HOST_PORT is already in use."
    echo "Stop that process or rerun with another port, for example:"
    echo "  MYSQL_HOST_PORT=3307 bash run-macos-step-01-mysql.sh"
    exit 1
  fi
}

wait_for_mysql() {
  local attempt

  for attempt in $(seq 1 60); do
    if "${DOCKER_CMD[@]}" exec "$MYSQL_CONTAINER" mysqladmin ping -h 127.0.0.1 -p"$MYSQL_ROOT_PASSWORD" --silent >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "MySQL did not become ready in time."
  "${DOCKER_CMD[@]}" logs --tail 80 "$MYSQL_CONTAINER" || true
  exit 1
}

echo "[CasVarDB UAT] Step 01: MySQL Docker"

ensure_macos
require_command docker
ensure_docker_daemon

echo "Docker command: ${DOCKER_CMD[*]}"
echo "Pulling $MYSQL_IMAGE..."
"${DOCKER_CMD[@]}" pull "$MYSQL_IMAGE"

if container_exists; then
  if container_running; then
    echo "MySQL container already running: $MYSQL_CONTAINER"
  else
    echo "Starting existing MySQL container: $MYSQL_CONTAINER"
    "${DOCKER_CMD[@]}" start "$MYSQL_CONTAINER" >/dev/null
  fi
else
  assert_port_free_for_new_container
  echo "Creating MySQL container: $MYSQL_CONTAINER"
  "${DOCKER_CMD[@]}" volume create "$MYSQL_VOLUME" >/dev/null
  "${DOCKER_CMD[@]}" run -d \
    --name "$MYSQL_CONTAINER" \
    -p "$MYSQL_HOST_PORT:3306" \
    -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
    -e MYSQL_DATABASE="$MYSQL_DATABASE" \
    -e MYSQL_USER="$MYSQL_USER" \
    -e MYSQL_PASSWORD="$MYSQL_PASSWORD" \
    -v "$MYSQL_VOLUME:/var/lib/mysql" \
    "$MYSQL_IMAGE" >/dev/null
fi

echo "Waiting for MySQL..."
wait_for_mysql

echo "MySQL is ready."
echo "DB_HOST=127.0.0.1"
echo "DB_PORT=$MYSQL_HOST_PORT"
echo "DB_USER=$MYSQL_USER"
echo "DB_PASSWORD=$MYSQL_PASSWORD"
echo "DB_NAME=$MYSQL_DATABASE"
