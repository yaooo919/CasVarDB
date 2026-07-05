#!/usr/bin/env bash
set -euo pipefail

export API_PORT="${API_PORT:-8888}"
export FRONTEND_PORT="${FRONTEND_PORT:-3000}"
export PUBLIC_URL="${PUBLIC_URL:-/CasVarDB}"
export REACT_APP_API_URL="${REACT_APP_API_URL:-http://163.1.88.125:8888}"

export DB_HOST="${DB_HOST:-mysql}"
export DB_PORT="${DB_PORT:-3306}"
export DB_USER="${DB_USER:-collab_casvardb}"
export DB_PASSWORD="${DB_PASSWORD:-Cv2y*%}"
export DB_NAME="${DB_NAME:-casvardb}"

export AWS_REGION="${AWS_REGION:-ap-southeast-2}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export SQS_ENDPOINT="${SQS_ENDPOINT:-http://localstack:4566}"
export SQS_QUEUE_NAME="${SQS_QUEUE_NAME:-casvardb-jobs}"
export SQS_WAIT_TIME_SECONDS="${SQS_WAIT_TIME_SECONDS:-10}"
export SQS_VISIBILITY_TIMEOUT_SECONDS="${SQS_VISIBILITY_TIMEOUT_SECONDS:-300}"
export WORKER_POLL_INTERVAL_MS="${WORKER_POLL_INTERVAL_MS:-1000}"
export WORKER_CONCURRENCY="${WORKER_CONCURRENCY:-4}"

wait_for_mysql() {
  for _ in $(seq 1 90); do
    if mysqladmin ping -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" --silent >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "MySQL did not become ready."
  exit 1
}

wait_for_localstack() {
  for _ in $(seq 1 90); do
    if curl -fs "$SQS_ENDPOINT/_localstack/health" | grep -q '"sqs"' >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "LocalStack SQS did not become ready."
  exit 1
}

table_count() {
  local table="$1"
  local count

  count="$(mysql -h "$DB_HOST" -P "$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -N -B -e "SELECT COUNT(*) FROM $DB_NAME.$table;" 2>/dev/null | tr -d '\r' | tail -n 1 || true)"
  if [[ "$count" =~ ^[0-9]+$ ]]; then
    echo "$count"
  else
    echo "0"
  fi
}

echo "[UAT app] Waiting for MySQL..."
wait_for_mysql

echo "[UAT app] Waiting for LocalStack SQS..."
wait_for_localstack

printf "PUBLIC_URL=%s\nREACT_APP_API_URL=%s\n" "$PUBLIC_URL" "$REACT_APP_API_URL" > /app/frontend/.env

cas9_count="$(table_count cas9)"
cas12_count="$(table_count cas12)"
grna_count="$(table_count grna_scaffold)"

echo "[UAT app] DB rows: cas9=$cas9_count cas12=$cas12_count grna_scaffold=$grna_count"
if [[ "$cas9_count" == "0" || "$cas12_count" == "0" || "$grna_count" == "0" ]]; then
  echo "[UAT app] Clean/incomplete DB detected. Running db:init..."
  (cd /app/backend-nestjs && npm run db:init)
fi

echo "[UAT app] Starting FE, BE, and worker with supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
