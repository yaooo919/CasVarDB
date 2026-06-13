---
name: casvardb-project
description: Maintain the CasVarDB project across the old Express backend, new NestJS backend, React TypeScript frontend, Docker MySQL local runtime, UAT runner scripts, exact 1:1 Express route compatibility, DB init/import flow, AWS deployment configuration, and cross-stack validation.
---

# CasVarDB Project

## Project Layout

- `backend/`: old Express backend. Treat this as the source of truth for legacy API contracts. Do not modify it unless the user explicitly asks.
- `backend-nestjs/`: new NestJS/Fastify replacement backend.
- `frontend/`: React frontend, migrated to TypeScript/TSX.
- `deploy/uat/`: local UAT runner scripts for Win11 and macOS.
- `skill/`: this project skill.

## Non-Negotiables

- Preserve old Express route paths and response shapes 1:1 in `backend-nestjs`. This is the acceptance criterion.
- Keep `backend/` untouched during Nest migration work.
- Keep working source and local npm scripts TypeScript-first. Do not add local scripts that run `node dist/*.js`.
- Do not add a Dockerfile or Dockerized API/worker runtime for local work unless explicitly requested.
- Docker is local MySQL only for now. Do not add LocalStack, API, worker, or db-init services to `backend-nestjs/docker-compose.yml`.
- Future local queue emulation may be added later, but do not reintroduce LocalStack preemptively.
- Use `mysql2/promise` pool for app DB access.
- Use parameterized SQL. Never interpolate selected IDs or search values.
- HTTP handlers should validate input and delegate work; CPU-heavy or long-running exports belong in worker/job flow.
- Keep generated artifacts out of the repo after verification, especially `frontend/build`, `backend-nestjs/dist`, and temporary upload/test files.

## Local Runtime

Docker Compose starts only MySQL from `backend-nestjs/docker-compose.yml`:

```bash
cd backend-nestjs
docker-compose up -d
```

The MySQL host port is not fixed. Compose publishes container port `3306` to a Docker-assigned host port:

```bash
docker-compose port mysql 3306
```

Local `.env` should not include `DB_PORT`. The Nest app and `db:init` discover the Docker port automatically in non-production runtimes.

Reset local Docker MySQL only when a clean DB is intended:

```bash
cd backend-nestjs
docker-compose down -v --remove-orphans
docker-compose up -d
```

## UAT Runner Scripts

Root UAT scripts live in `deploy/uat`:

- `run-win11.bat`
- `run-macos.sh`

These scripts run the local stack as a whole:

- Docker Compose starts MySQL only.
- Backend runs with `npm start` from `backend-nestjs`.
- Frontend runs with `REACT_APP_API_URL=http://localhost:8888 npm start` from `frontend`.
- DB init is conditional: check `cas9`, `cas12`, and `grna_scaffold` row counts; run `npm run db:init` only when the DB is clean or incomplete.
- Check ports `8888` and `3000` before launching app processes.
- Install npm dependencies only when missing or incomplete.

For macOS, `run-macos.sh` must check whether `docker-compose` exists. If missing, try to install it with Homebrew:

```bash
brew install docker-compose
```

If `brew` is unavailable, fail clearly and ask the user to install Homebrew first. Re-check `docker-compose` after installation before continuing.

## Backend NestJS

Use TypeScript entrypoints directly in `backend-nestjs`:

```bash
npm run validate
npm run db:init
npm start
npm run start:worker
```

Expected meanings:

- `validate`: lint and typecheck only; it must not generate `dist/`.
- `db:init`: run `ts-node src/db-init/main.ts`.
- `start`: run `ts-node src/main.ts`.
- `start:worker`: run `ts-node src/worker/main.ts`.

Use `ts-node`, not `tsx`, for Nest runtime scripts. Nest dependency injection needs TypeScript decorator metadata from `emitDecoratorMetadata`; `tsx`/esbuild does not emit it.

Avoid adding `npm run build` to local backend instructions. AWS packaging can bundle TypeScript via Serverless/esbuild.

### Runtime Hygiene

Local API uses port `8888`.

Before starting a validation API on Windows, check whether the port is already owned by this backend:

```powershell
Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*backend-nestjs*src/main.ts*' }
```

If a previous validation process owns the port, stop only that process. Do not kill unrelated processes.

Do not leave background validation API processes running after the user needs to start the API themselves.

## Frontend

Frontend source in `frontend/src` should be TypeScript only:

- Use `.tsx` for React files.
- Do not leave `.js` or `.jsx` source files in `frontend/src`.
- Keep ESLint as an actual style-enforcing config in `frontend/.eslintrc.json`.
- Enforce 2-space indentation for TSX/JSX with ESLint rules.
- Use `REACT_APP_API_URL=http://localhost:8888` for local Nest API testing.

Frontend commands:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

Remove `frontend/build` after build verification unless the user explicitly wants build artifacts left in place.

## DB Init

`backend-nestjs/src/db-init/main.ts` aggregates the old backend DB setup:

- Schema source: `backend/mysql_casvardb.sql`
- Import behavior source: `backend/import_data.py`
- Creates: `cas9`, `cas12`, `grna_scaffold`, `backend_jobs`
- Downloads source CSVs from the original Google Drive file IDs.
- Caches CSVs in `backend-nestjs/data` locally unless `DATA_DIR` overrides it.
- Uses streaming CSV parsing.
- `ensureNotHtml` must only read a small file header, not the entire CSV. Cas9 CSV is very large.
- Skips importing a dataset if its target table already has rows unless `FORCE_DB_IMPORT=true`.
- Retries MySQL connections while Docker MySQL is starting.

Only run full `npm run db:init` when it is acceptable to download/import the full datasets.

## Local Env

`backend-nestjs/.env.example` should stay minimal:

```text
NODE_ENV=development
PORT=8888
DB_HOST=127.0.0.1
DB_USER=collab_casvardb
DB_PASSWORD=Cv2y*%
DB_NAME=casvardb
DB_CONNECTION_LIMIT=10
DATA_DIR=./data
```

Do not add AWS credentials or local SQS settings to committed env files.

## Old Express Route Contract

Source of truth:

- `backend/server.js`
- `backend/routes/*.js`

Nest must expose every old Express route below with the same visible contract.

### Data Routes

- `GET /data/cas9`
- `GET /data/cas12`

Old response shape is exactly:

```ts
{ data, count }
```

Do not add extra top-level keys on these old paths.

`GET /data` is a new compatibility alias for Cas9 and may return the migration shape:

```ts
{ rows, total, data, count }
```

### Scaffold Route

- `GET /grna`

Return an array of `grna_scaffold` rows, not an object wrapper.

### Download Route

- `POST /download`

Old request body:

```ts
{ selectedIds: number[] }
```

Old visible behavior:

- Query Cas9 by default.
- Return CSV content.
- Set `Content-Disposition` filename to `selected_data.csv`.
- Return 400-ish failure for missing IDs and 404-ish failure when no rows match.

The Nest implementation may keep safer parameterized SQL and CSV escaping, but must preserve the route and normal response contract.

### Submit Route

- `POST /submit`

Accept `multipart/form-data` with fields:

- `file`
- `metadata`

Frontend sends `file` before `metadata`; when using `@fastify/multipart`, consume the file stream before relying on parsed sibling fields.

Store uploads under `backend-nestjs/uploads` at runtime. Response must include the old fields:

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

### Statistics Routes

- `GET /statistics/cas9-freq-per-variant`
- `GET /statistics/cas12-freq-per-variant`
- `GET /statistics/freq-per-scaffold`
- `GET /statistics/data-count-per-study`
- `GET /statistics/cas9-freq-per-mismatch`
- `GET /statistics/cas12-freq-per-mismatch`
- `GET /statistics/freq-mismatch-per-variant`
- `GET /statistics/heatmap-data`
- `GET /statistics/activity-graph`

Port aggregation behavior from `backend/routes/statistics.js`. Frontend pages `/statistics` and `/statistics/activity-graph` depend on these exact paths and shapes.

## New Job Routes

Queued job routes are additive, not old Express compatibility routes:

- `POST /jobs/export`
- `GET /jobs/:id`
- `GET /jobs/:id/result`

If local queue env is not configured, the app may start, but queued job creation should fail clearly with "Queue is not configured".

## AWS/PROD

AWS uses RDS/Aurora MySQL, not Docker MySQL.

PROD database values should come from GitLab CI variables:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

If RDS is private, Lambda must be configured for the same VPC/subnets/security groups. Add VPC settings to `serverless.yml` only when the real IDs/variable names are known.

Serverless handlers should point to TypeScript sources and bundle via `serverless-esbuild`:

```yaml
handler: src/lambda.handler
handler: src/worker/lambda.handler
```

SQS is for AWS deployment and later local queue emulation. Do not put AWS credentials in committed env files.

## Validation

After backend changes:

```bash
cd backend-nestjs
npm run validate
docker-compose config
```

After frontend changes:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

For 1:1 route work, also validate representative old paths against the local Nest API and Docker MySQL:

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
