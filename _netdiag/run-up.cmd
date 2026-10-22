@echo off
cd /d "%~dp0.."
set LOG=%~dp0up-log.txt
echo ==== start %time% > "%LOG%"
docker compose -f infra/docker-compose.yml -f _netdiag/compose.port-override.yml --env-file infra/.env up -d db redis api worker >> "%LOG%" 2>&1
echo ==== up rc=%errorlevel% %time% >> "%LOG%"
timeout /t 30 /nobreak > NUL
docker compose -f infra/docker-compose.yml -f _netdiag/compose.port-override.yml --env-file infra/.env ps >> "%LOG%" 2>&1
echo ---- health >> "%LOG%"
curl.exe -sS http://localhost:8000/health >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo ---- api logs >> "%LOG%"
docker compose -f infra/docker-compose.yml -f _netdiag/compose.port-override.yml --env-file infra/.env logs --tail 25 api worker >> "%LOG%" 2>&1
echo ==== DONE %time% >> "%LOG%"
