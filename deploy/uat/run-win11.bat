@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0..\.."
for %%I in ("%ROOT_DIR%") do set "ROOT_DIR=%%~fI"
set "BACKEND_DIR=%ROOT_DIR%\backend-nestjs"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"

echo [CasVarDB UAT] Starting Windows 11 local stack...

call :require_command docker-compose || exit /b 1
call :require_command npm || exit /b 1
call :assert_port_free 8888 "NestJS API" || exit /b 1
call :assert_port_free 3000 "React frontend" || exit /b 1

pushd "%BACKEND_DIR%" || exit /b 1

echo [1/5] Starting Docker MySQL...
docker-compose up -d
if errorlevel 1 exit /b 1

echo [2/5] Waiting for MySQL to become healthy...
call :wait_for_mysql
if errorlevel 1 exit /b 1

if not exist "node_modules\@fastify\multipart" (
  echo [3/5] Installing backend dependencies...
  npm install
  if errorlevel 1 exit /b 1
) else (
  echo [3/5] Backend dependencies already installed.
)

echo [4/5] Checking database data...
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
  if errorlevel 1 exit /b 1
) else (
  echo     Existing data detected. Skipping db init.
)

popd

pushd "%FRONTEND_DIR%" || exit /b 1
if not exist "node_modules\typescript" (
  echo [5/5] Installing frontend dependencies...
  npm install
  if errorlevel 1 exit /b 1
) else (
  echo [5/5] Frontend dependencies already installed.
)
popd

echo [CasVarDB UAT] Launching NestJS API and React frontend...
start "CasVarDB NestJS API" /D "%BACKEND_DIR%" cmd /k npm start
start "CasVarDB React Frontend" /D "%FRONTEND_DIR%" cmd /k "set REACT_APP_API_URL=http://localhost:8888&& npm start"

echo.
echo NestJS API: http://localhost:8888
echo React frontend: http://localhost:3000
echo MySQL is managed by backend-nestjs\docker-compose.yml
exit /b 0

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

:get_table_count
set "%~2=0"
for /f "usebackq tokens=*" %%A in (`docker-compose exec -T mysql mysql -uroot -prootpass -N -B -e "SELECT COUNT(*) FROM casvardb.%~1;" 2^>nul`) do set "%~2=%%A"
exit /b 0
