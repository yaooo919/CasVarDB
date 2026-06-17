@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0..\.."
for %%I in ("%ROOT_DIR%") do set "ROOT_DIR=%%~fI"
set "BACKEND_DIR=%ROOT_DIR%\backend-nestjs"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"

echo [CasVarDB UAT] Starting Windows 11 local stack...

call :require_command docker-compose || goto :fail
call :require_command npm || goto :fail
call :assert_port_free 8888 "NestJS API" || goto :fail
call :assert_port_free 3000 "React frontend" || goto :fail

pushd "%BACKEND_DIR%" || goto :fail

echo [1/6] Starting Docker MySQL and LocalStack SQS...
docker-compose up -d
if errorlevel 1 goto :fail

echo [2/6] Waiting for MySQL to become healthy...
call :wait_for_mysql
if errorlevel 1 goto :fail

call :get_localstack_endpoint
if errorlevel 1 goto :fail

echo [3/6] Waiting for LocalStack SQS at %SQS_ENDPOINT%...
call :wait_for_localstack "%SQS_ENDPOINT%"
if errorlevel 1 goto :fail

if not exist "node_modules\@fastify\multipart" (
  echo [4/6] Installing backend dependencies...
  npm install
  if errorlevel 1 goto :fail
) else (
  echo [4/6] Backend dependencies already installed.
)

echo [5/6] Checking database data...
call :get_table_count cas9 CAS9_COUNT
call :get_table_count cas12 CAS12_COUNT
call :get_table_count grna_scaffold GRNA_COUNT

set "NEEDS_DB_INIT=0"
if "%CAS9_COUNT%"=="0" set "NEEDS_DB_INIT=1"
if "%CAS12_COUNT%"=="0" set "NEEDS_DB_INIT=1"
if "%GRNA_COUNT%"=="0" set "NEEDS_DB_INIT=1"

echo     cas9 rows: %CAS9_COUNT%
echo     cas12 rows: %CAS12_COUNT%
echo     grna_scaffold rows: %GRNA_COUNT%

if "%NEEDS_DB_INIT%"=="1" (
  echo     Clean or incomplete database detected. Running db init...
  npm run db:init
  if errorlevel 1 goto :fail
) else (
  echo     Existing data detected. Skipping db init.
)

popd

pushd "%FRONTEND_DIR%" || goto :fail
if not exist "node_modules\typescript" (
  echo [6/6] Installing frontend dependencies...
  npm install
  if errorlevel 1 goto :fail
) else (
  echo [6/6] Frontend dependencies already installed.
)
popd

echo [CasVarDB UAT] Launching NestJS API, queue worker, and React frontend...
start "CasVarDB NestJS API" /D "%BACKEND_DIR%" cmd /k "set AWS_REGION=ap-southeast-2&& set AWS_ACCESS_KEY_ID=test&& set AWS_SECRET_ACCESS_KEY=test&& set SQS_ENDPOINT=%SQS_ENDPOINT%&& set SQS_QUEUE_NAME=casvardb-jobs&& set SQS_WAIT_TIME_SECONDS=10&& set SQS_VISIBILITY_TIMEOUT_SECONDS=300&& npm start"
start "CasVarDB Queue Worker" /D "%BACKEND_DIR%" cmd /k "set AWS_REGION=ap-southeast-2&& set AWS_ACCESS_KEY_ID=test&& set AWS_SECRET_ACCESS_KEY=test&& set SQS_ENDPOINT=%SQS_ENDPOINT%&& set SQS_QUEUE_NAME=casvardb-jobs&& set SQS_WAIT_TIME_SECONDS=10&& set SQS_VISIBILITY_TIMEOUT_SECONDS=300&& set WORKER_POLL_INTERVAL_MS=1000&& set WORKER_CONCURRENCY=4&& npm run start:worker"
start "CasVarDB React Frontend" /D "%FRONTEND_DIR%" cmd /k "set REACT_APP_API_URL=http://localhost:8888&& npm start"

echo.
echo NestJS API: http://localhost:8888
echo React frontend: http://localhost:3000
echo LocalStack SQS: %SQS_ENDPOINT%
echo MySQL and LocalStack are managed by backend-nestjs\docker-compose.yml
goto :success

:success
echo.
pause
exit /b 0

:fail
echo.
echo [CasVarDB UAT] Startup failed. Review the messages above.
pause
exit /b 1

:require_command
where %~1 >nul 2>nul
if errorlevel 1 (
  echo Required command not found: %~1
  exit /b 1
)
exit /b 0

:assert_port_free
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort %~1 -State Listen -ErrorAction SilentlyContinue) { exit 1 }"
if errorlevel 1 (
  echo Port %~1 is already in use for %~2. Stop the existing process and rerun this script.
  exit /b 1
)
exit /b 0

:wait_for_mysql
for /L %%I in (1,1,60) do (
  docker-compose exec -T mysql mysqladmin ping -h 127.0.0.1 -prootpass --silent >nul 2>nul
  if not errorlevel 1 exit /b 0
  timeout /t 2 /nobreak >nul
)
echo MySQL did not become ready in time.
exit /b 1

:get_localstack_endpoint
set "LOCALSTACK_ADDRESS="
for /f "usebackq tokens=*" %%A in (`docker-compose port localstack 4566 2^>nul`) do set "LOCALSTACK_ADDRESS=%%A"
if not defined LOCALSTACK_ADDRESS (
  echo Could not discover LocalStack host port.
  exit /b 1
)
set "LOCALSTACK_ADDRESS=%LOCALSTACK_ADDRESS:0.0.0.0=127.0.0.1%"
set "LOCALSTACK_ADDRESS=%LOCALSTACK_ADDRESS:[::]=127.0.0.1%"
set "SQS_ENDPOINT=http://%LOCALSTACK_ADDRESS%"
exit /b 0

:wait_for_localstack
for /L %%I in (1,1,60) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $health = Invoke-RestMethod -Uri '%~1/_localstack/health' -TimeoutSec 2; if ($health.services.sqs) { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 exit /b 0
  timeout /t 2 /nobreak >nul
)
echo LocalStack SQS did not become ready in time.
exit /b 1

:get_table_count
set "%~2=0"
for /f "usebackq tokens=*" %%A in (`docker-compose exec -T mysql mysql -uroot -prootpass -N -B -e "SELECT COUNT(*) FROM casvardb.%~1;" 2^>nul`) do set "%~2=%%A"
exit /b 0
