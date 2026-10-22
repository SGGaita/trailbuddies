@echo off
cd /d "%~dp0.."
set LOG=%~dp0build-log.txt
echo ==== start %time% > "%LOG%"
type "%USERPROFILE%\.docker\daemon.json" >> "%LOG%" 2>&1
set BUILDKIT_PROGRESS=plain
for /L %%i in (1,1,3) do (
  echo ==== attempt %%i %time% >> "%LOG%"
  docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build db redis api worker >> "%LOG%" 2>&1 && goto :up
)
echo ==== BUILD FAILED 3x >> "%LOG%"
goto :end
:up
echo ==== up ok %time%, waiting for health >> "%LOG%"
timeout /t 45 /nobreak > NUL
docker compose -f infra/docker-compose.yml --env-file infra/.env ps >> "%LOG%" 2>&1
curl.exe -sS http://localhost:8000/health >> "%LOG%" 2>&1
echo. >> "%LOG%"
:end
echo ==== DONE %time% >> "%LOG%"
