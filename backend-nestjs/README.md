# CasVarDB NestJS Backend

Parallel NestJS/Fastify backend. The existing `../backend` Express app stays untouched and remains the legacy contract source.

## Local Env

Create `.env` from `.env.example` before running locally.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env -Force
```

Keep `.env` focused on local DB/app settings. Do not add AWS credentials to committed env files.

## Docker Infra

Docker Compose is for local infrastructure only: MySQL and LocalStack SQS.

```bash
docker-compose up -d
docker-compose port mysql 3306
docker-compose port localstack 4566
```

Reset local infra only when a clean database is intended:

```bash
docker-compose down -v --remove-orphans
docker-compose up -d
```

## NPM Commands

```bash
npm install
npm run validate
npm run db:init
npm start
npm run start:worker
```

`npm run start:worker` needs queue env at runtime. For UAT, prefer the repo-level scripts in `../deploy/uat`; they discover the LocalStack endpoint, inject queue env, conditionally run DB init, then launch the NestJS API, queue worker, and React frontend.

In UAT, expensive statistics endpoints use DB-backed job caching. A new request inserts a `statistics` job and queues it in LocalStack SQS. A repeat request from the same IP with the same payload returns cached JSON directly when available. If the cached result is older than `JOB_CACHE_TTL_MS`, the API returns the stale result immediately and queues a background refresh.

Completed job rows are kept as the cache. `JOB_CACHE_TTL_MS` defaults to 30 minutes and only controls freshness; it does not delete rows. Cache expiry is checked when a new `/statistics/*` request arrives; `/jobs/:id/result` returns an available statistics result even while that row is being refreshed.

The local worker defaults to `WORKER_CONCURRENCY=4`. This controls the SQS receive batch size and the number of queue messages processed in parallel.
