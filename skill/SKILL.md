---
name: casvardb-project
description: Maintain the CasVarDB project across the legacy Express backend, parallel NestJS/Fastify backend, React TypeScript frontend, Docker MySQL plus LocalStack UAT runtime, queue-backed statistics/jobs, DB init import flow, UAT runner scripts, AWS GitLab CI deployment assumptions, and 1:1 route compatibility validation.
---

# CasVarDB Project

## Layout

- `backend/`: legacy Express backend. Treat it as the API contract and data-init source. Do not edit unless explicitly asked.
- `backend-nestjs/`: parallel NestJS/Fastify backend replacement.
- `frontend/`: React TypeScript frontend.
- `deploy/uat/`: local UAT runners.
- `skill/`: this project-wise skill.

## Hard Rules

- Preserve legacy Express route paths and visible response shapes 1:1 in `backend-nestjs`.
- Keep `backend/` untouched during Nest migration work.
- Use TypeScript runtime scripts for app work. Do not add local scripts that run `node dist/*.js`.
- Use `ts-node`, not `tsx`, for Nest runtime scripts because decorator metadata matters.
- Docker local runtime is infrastructure only: MySQL plus LocalStack SQS. Do not add API, worker, frontend, db-init services, or app Dockerfiles unless the user explicitly asks.
- Use `docker-compose`, not `docker compose`, in docs and scripts.
- Keep `.env.example` local and minimal. Do not commit AWS credentials or local SQS env; UAT scripts inject them at runtime.
- Use `mysql2/promise` pool and parameterized SQL. Never interpolate selected IDs or search input.
- Do not run CPU-heavy statistics work in HTTP handlers. HTTP handlers validate, cache/check jobs, enqueue, and return.
- Keep generated artifacts out of the repo after verification, especially `frontend/build`, `backend-nestjs/dist`, uploads, and temporary test files.

## Local UAT Runtime

Use these root scripts for the whole local stack:

```bat
deploy\uat\run-win11-localhost.bat
```

```bash
chmod +x deploy/uat/run-macos-localhost.sh
./deploy/uat/run-macos-localhost.sh
```

The runners:

- Start `backend-nestjs/docker-compose.yml`.
- Keep Docker services to `mysql` and `localstack` only.
- Discover dynamic MySQL and LocalStack host ports with `docker-compose port`.
- Install dependencies only when missing.
- Conditionally run `npm run db:init` only when `cas9`, `cas12`, or `grna_scaffold` is empty.
- Start API on `http://localhost:8888`.
- Start frontend on `http://localhost:3000` with `REACT_APP_API_URL=http://localhost:8888`.
- Start the NestJS worker with LocalStack SQS env and `WORKER_CONCURRENCY=4`.
- Refuse to launch when ports `8888` or `3000` are already in use.

For macOS, the runner checks `docker-compose`; if missing, it attempts `brew install docker-compose` and fails clearly if Homebrew is missing.

Manual infra commands:

```bash
cd backend-nestjs
docker-compose up -d
docker-compose port mysql 3306
docker-compose port localstack 4566
```

Reset infra only when a clean DB/queue is intended:

```bash
cd backend-nestjs
docker-compose down -v --remove-orphans
docker-compose up -d
```

## Backend Commands

```bash
cd backend-nestjs
npm install
npm run validate
npm run db:init
npm start
npm run start:worker
```

Script meanings:

- `validate`: lint and typecheck only.
- `db:init`: `ts-node src/db-init/main.ts`.
- `start`: `ts-node src/main.ts`.
- `start:worker`: `ts-node src/worker/main.ts`.

Local API uses port `8888`. If `EADDRINUSE` occurs on Windows, check ownership before stopping anything:

```powershell
Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*backend-nestjs*src/main.ts*' }
```

## Frontend

- `frontend/src` should be TypeScript only: `.ts` and `.tsx`.
- Keep ESLint style enforcement active, including 2-space TSX/JSX indentation.
- For local UAT, `frontend/.env` should be:

```text
REACT_APP_API_URL=http://localhost:8888
```

Frontend commands:

```bash
cd frontend
npm install
npm run validate
npm run build
```

Remove `frontend/build` after build verification unless the user asks to keep it.

## DB Init

`backend-nestjs/src/db-init/main.ts` is the TypeScript aggregation of the real legacy data setup:

- Schema source: `backend/mysql_casvardb.sql`.
- Import behavior source: `backend/import_data.py`.
- Creates/imports `cas9`, `cas12`, `grna_scaffold`, and `backend_jobs`.
- Downloads original source CSVs from the existing Google Drive file IDs.
- Caches downloads in `backend-nestjs/data` unless `DATA_DIR` overrides it.
- Uses streaming CSV parsing.
- `ensureNotHtml` must read only a small header, never the entire large Cas9 CSV.
- Skips non-empty datasets unless `FORCE_DB_IMPORT=true`.
- Retries MySQL while Docker MySQL is starting.

Only run full `npm run db:init` when downloading/importing the full datasets is acceptable.

## Local Env

Keep `backend-nestjs/.env.example` close to:

```text
NODE_ENV=development
PORT=8888
DB_HOST=127.0.0.1
DB_USER=collab_casvardb
DB_PASSWORD=Cv2y*%
DB_NAME=casvardb
DB_CONNECTION_LIMIT=10
DATA_DIR=./data
WORKER_CONCURRENCY=4
JOB_CACHE_TTL_MS=1800000
```

Do not include `DB_PORT` locally unless explicitly needed; non-production code discovers the Docker MySQL port. Do not add AWS credentials or SQS settings to committed env files.

## Legacy Route Contract

Source of truth:

- `backend/server.js`
- `backend/routes/*.js`
- Frontend consumers in `frontend/src/pages`

Compatibility routes:

- `GET /data/cas9` returns exactly `{ data, count }`.
- `GET /data/cas12` returns exactly `{ data, count }`.
- `GET /data` is a Cas9 compatibility alias and may include `{ rows, total, data, count }`.
- `GET /grna` returns an array of scaffold rows.
- `POST /download` accepts `{ selectedIds: number[] }`, defaults to Cas9, returns CSV with filename `selected_data.csv`.
- `POST /submit` accepts multipart `file` and `metadata`; with `@fastify/multipart`, consume the file stream before relying on sibling fields.

Keep `POST /submit` response fields:

```ts
{
  message,
  fileName,
  filePath,
  metadataSavedTo,
  parsedMetadataKind
}
```

Register `@fastify/multipart` in both `backend-nestjs/src/main.ts` and `backend-nestjs/src/lambda.ts`.

## Statistics Queue Contract

All `/statistics/*` routes are subqueued:

- `GET /statistics/cas9-freq-per-variant`
- `GET /statistics/cas12-freq-per-variant`
- `GET /statistics/freq-per-scaffold`
- `GET /statistics/data-count-per-study`
- `GET /statistics/cas9-freq-per-mismatch`
- `GET /statistics/cas12-freq-per-mismatch`
- `GET /statistics/freq-mismatch-per-variant`
- `GET /statistics/heatmap-data`
- `GET /statistics/activity-graph`

Execution path:

1. Controller logs endpoint, subqueue flag, and sanitized request payload.
2. `JobsService.createStatisticsJob()` hashes job type, client IP, and normalized payload into a stable job ID.
3. Fresh completed cache returns original statistics JSON directly.
4. Missing cache inserts `backend_jobs` row, sends SQS message, and returns `{ id, status }`.
5. Expired completed cache returns stale JSON immediately and queues a background refresh of the same row.
6. Worker receives from LocalStack SQS/AWS SQS, logs queue endpoint and payload, runs `StatisticsService`, updates `backend_jobs.result`, and deletes the queue message.
7. Frontend `getQueuedResult()` polls `/jobs/:id`, then reads `/jobs/:id/result`.

Cache rules:

- `JOB_CACHE_TTL_MS=1800000` means 30-minute freshness.
- TTL is not deletion. Finished job rows stay as the DB cache.
- Do not clear `result` when refreshing expired statistics jobs.
- `GET /jobs/:id/result` must return an available statistics result even if the row is currently queued/running for refresh.
- `JOB_CACHE_TTL_MS=0` means statistics cache never expires.

Worker concurrency:

- Default local `WORKER_CONCURRENCY=4`.
- `QueueService.receive()` uses it for SQS `MaxNumberOfMessages`.
- `WorkerRuntimeService` processes each received batch in parallel.
- Clamp values to SQS receive-message limit `1..10`.
- Expected worker startup log includes `Worker polling started; concurrency=4`.

Heatmap:

- Do not pull millions of rows into Node for `/statistics/heatmap-data`.
- Aggregate heatmap data in MySQL using grouped queries and `JSON_EXTRACT(mismatch_positions, '$[0]')`.
- Keep frontend heatmap shape as `Record<variant, Record<position, { raw, normalized }>>`.

## Job Routes

Additive queued job routes:

- `POST /jobs/export`
- `GET /jobs/:id`
- `GET /jobs/:id/result`

Current job types:

- `export`: worker creates CSV; `/jobs/:id/result` sends `selected_data.csv`.
- `statistics`: worker creates JSON; `/jobs/:id/result` sends the original statistics payload shape.

If queue env is not configured, startup may continue, but queued job creation must fail clearly with `Queue is not configured`.

## Logging And Observability

API logs should include:

- endpoint, including method/path/query
- whether it is subqueued
- sanitized payload

Worker logs should include:

- queue ready state
- idle heartbeat
- received batch size
- queue endpoint and payload
- job start/completion/failure
- processed count

If the frontend looks stuck but jobs are complete, check that running API/worker/frontend processes were restarted after edits and that `frontend/.env` points to `http://localhost:8888`.

## AWS/PROD

- PROD uses RDS/Aurora MySQL, not Docker MySQL.
- PROD DB values come from GitLab CI variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- GitLab CI owns AWS deployment secrets; do not put AWS values in committed env files.
- If RDS is private, Lambda must run in the same VPC/subnets/security groups.
- Use SQS maximum concurrency/event-source mapping controls in AWS for worker concurrency.
- Serverless Framework v4 may require login/license before package/deploy.

Expected TypeScript handler targets:

```yaml
handler: src/lambda.handler
handler: src/worker/lambda.handler
```

## Validation

Backend:

```bash
cd backend-nestjs
npm run validate
docker-compose config --quiet
```

Frontend:

```bash
cd frontend
npm run validate
npm run build
```

Route smoke tests should cover:

```text
GET  /grna
GET  /data/cas9
GET  /data/cas12
POST /download
POST /submit
GET  /statistics/cas9-freq-per-variant
GET  /statistics/cas12-freq-per-variant
GET  /statistics/freq-per-scaffold
GET  /statistics/data-count-per-study
GET  /statistics/cas9-freq-per-mismatch
GET  /statistics/cas12-freq-per-mismatch
GET  /statistics/freq-mismatch-per-variant
GET  /statistics/heatmap-data
GET  /statistics/activity-graph
```
