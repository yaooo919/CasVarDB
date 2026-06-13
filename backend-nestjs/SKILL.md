---
name: casvardb-backend-nestjs
description: Maintain the CasVarDB parallel NestJS backend in backend-nestjs. Use when working on this repo's NestJS/Fastify API, TypeScript DB init/import flow, Docker MySQL local setup, MySQL/RDS configuration, SQS-backed job routes, Serverless AWS deployment, or README/package script conventions.
---

# CasVarDB NestJS Backend

## Non-Negotiables

- Keep `../backend` untouched; it is the old Express backend.
- Keep working source and local npm scripts TypeScript-first. Do not add local scripts that run `node dist/*.js`.
- Do not add a Dockerfile or Dockerized API/worker runtime for local work unless explicitly requested.
- Docker is local MySQL only for now. Do not add LocalStack, API, worker, or db-init services to `docker-compose.yml`.
- Future local queue emulation may be added later, but do not reintroduce LocalStack preemptively.
- Use `mysql2/promise` pool for app DB access.
- Use parameterized SQL. Never interpolate selected IDs or search values.
- HTTP handlers should validate input and delegate work; CPU-heavy or long-running exports belong in worker/job flow.

## Current Local Runtime

Docker Compose starts only MySQL:

```bash
docker-compose up -d
```

The MySQL host port is not fixed. Compose publishes container port `3306` to a Docker-assigned host port:

```bash
docker-compose port mysql 3306
```

Local `.env` should not include `DB_PORT`. The app and `db:init` discover the Docker port automatically in non-production runtimes.

Reset local Docker MySQL:

```bash
docker-compose down -v --remove-orphans
docker-compose up -d
```

## Local npm Scripts

Use TypeScript entrypoints directly:

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

Avoid adding `npm run build` to local instructions. AWS packaging can bundle TypeScript via Serverless/esbuild.

## DB Init

`src/db-init/main.ts` aggregates the old backend DB setup:

- Schema source: `../backend/mysql_casvardb.sql`
- Import behavior source: `../backend/import_data.py`
- Creates: `cas9`, `cas12`, `grna_scaffold`, `backend_jobs`
- Downloads source CSVs from the original Google Drive file IDs.
- Caches CSVs in `DATA_DIR` (`./data` locally).
- Uses streaming CSV parsing.
- `ensureNotHtml` must only read a small file header, not the entire CSV. Cas9 CSV is very large.
- Skips importing a dataset if its target table already has rows unless `FORCE_DB_IMPORT=true`.
- Retries MySQL connections while Docker MySQL is starting.

## Local MySQL Env

`.env.example` should stay minimal:

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

Do not add AWS credentials or local SQS settings to `.env.example`.

## Routes To Preserve

Compatibility routes:

- `GET /data`
- `GET /data/cas9`
- `GET /data/cas12`
- `GET /grna`
- `POST /download`

`GET /data*` should keep both response shapes during migration:

```ts
{ rows, total, data, count }
```

Queued job routes:

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

Run after changes:

```bash
npm run validate
docker-compose config
```

Only run full `npm run db:init` when it is acceptable to download/import the full datasets.
