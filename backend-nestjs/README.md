# CasVarDB NestJS backend

Parallel NestJS/Fastify backend. The existing `../backend` Express app stays untouched.

## Commands

### DEV: Windows 11

```powershell
# 1. Enter the NestJS backend folder
cd backend-nestjs

# 2. Install Node dependencies
npm install

# 3. Create local env file
Copy-Item .env.example .env -Force

# 4. Start MySQL in Docker
docker-compose up -d

# Optional: show the actual host port Docker assigned to MySQL
docker-compose port mysql 3306

# 5. Lint and typecheck
npm run validate

# 6. Create tables and import data into Docker MySQL using TypeScript
npm run db:init

# 7. Start the API locally
npm start
```

Reset local Docker data:

```powershell
# Stop and remove old containers, volumes, and stale services
docker-compose down -v --remove-orphans

# Start fresh MySQL
docker-compose up -d
```

### UAT: macOS

```bash
# 1. Enter the NestJS backend folder
cd backend-nestjs

# 2. Install Node dependencies
npm install

# 3. Create local env file
cp .env.example .env

# 4. Start MySQL in Docker
docker-compose up -d

# Optional: show the actual host port Docker assigned to MySQL
docker-compose port mysql 3306

# 5. Lint and typecheck
npm run validate

# 6. Create tables and import data into Docker MySQL using TypeScript
npm run db:init

# 7. Start the API locally
npm start
```

Reset local Docker data:

```bash
# Stop and remove old containers, volumes, and stale services
docker-compose down -v --remove-orphans

# Start fresh MySQL
docker-compose up -d
```

Expected local Docker container: `mysql`.

### PROD: AWS

```bash
cd backend-nestjs
npm ci
npm run validate
npm run serverless:package -- --stage prod
npm run serverless:deploy -- --stage prod
```

PROD AWS values are expected to come from GitLab CI variables, not from a committed env file.

## Useful npm scripts

```bash
npm run lint
npm run typecheck
npm run db:init
npm run start
npm run start:worker
```
