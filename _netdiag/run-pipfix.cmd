@echo off
cd /d "%~dp0.."
set LOG=%~dp0pipfix-log.txt
echo ==== start %time% > "%LOG%"
set BUILDKIT_PROGRESS=plain
docker build -f _netdiag/Dockerfile.pipfix -t trailbuddies-api:local services/api >> "%LOG%" 2>&1 || goto :fail
echo ==== image built %time% >> "%LOG%"
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d db redis api worker >> "%LOG%" 2>&1 || goto :fail
echo ==== up ok %time%, waiting for health >> "%LOG%"
timeout /t 60 /nobreak > NUL
docker compose -f infra/docker-compose.yml --env-file infra/.env ps >> "%LOG%" 2>&1
curl.exe -sS http://localhost:8000/health >> "%LOG%" 2>&1
echo. >> "%LOG%"
goto :end
:fail
echo ==== FAILED %time% >> "%LOG%"
:end
echo ==== DONE %time% >> "%LOG%"
