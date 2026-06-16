# CasVarDB Setup Guide

The current UAT stack runs:

- React frontend from `frontend/`
- NestJS API from `backend-nestjs/`
- NestJS queue worker from `backend-nestjs/`
- MySQL and LocalStack SQS from `backend-nestjs/docker-compose.yml`

The old Express backend in `backend/` is kept as the legacy route contract source and is not part of the UAT runner.

## UAT Runner

Windows 11:

```bat
deploy\uat\run-win11-localhost.bat
```

macOS:

```bash
chmod +x deploy/uat/run-macos-localhost.sh
./deploy/uat/run-macos-localhost.sh
```

The runner starts Docker infra, checks whether the database already has data, runs `npm run db:init` only for a clean or incomplete DB, then starts the API, queue worker, and frontend.

Statistics pages use DB-backed queue caching in UAT. A cache miss returns a queued job ID, the NestJS worker processes the statistics job from LocalStack SQS, and the frontend polls `/jobs/:id/result`. A repeat request from the same IP with the same payload can return cached JSON directly from MySQL. If the cached result is older than 30 minutes, the API returns the stale result immediately and queues a background refresh.

## Manual Backend Commands

```bash
cd backend-nestjs
npm install
cp .env.example .env
docker-compose up -d
npm run validate
npm run db:init
npm start
```

On Windows PowerShell, create `.env` with:

```powershell
Copy-Item .env.example .env -Force
```

Use the UAT runner when the queue worker is needed; it injects the LocalStack SQS endpoint at runtime instead of storing queue settings in `.env`.

For manual local frontend runs, set `frontend/.env` to:

```text
REACT_APP_API_URL=http://localhost:8888
```

## Manual Frontend Commands

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm start
```
