@echo off
cd /d "%~dp0"
set LOG=%~dp0diag-log2.txt
echo ==== start %time% > "%LOG%"
echo ---- host nslookup pypi.org via router >> "%LOG%"
nslookup pypi.org 192.168.0.1 >> "%LOG%" 2>&1
echo ---- host curl pypi x3 >> "%LOG%"
for /L %%i in (1,1,3) do curl.exe -sS -o NUL --max-time 20 -w "curl %%{http_code} %%{time_total}s\n" https://pypi.org/simple/fastapi/ >> "%LOG%" 2>&1
echo ==== R1 default bridge default DNS >> "%LOG%"
docker run --rm -v "%~dp0.:/d" python:3.12-slim python /d/probe2.py >> "%LOG%" 2>&1
echo ==== R2 default bridge dns 8.8.8.8 + 1.1.1.1 >> "%LOG%"
docker run --rm --dns 8.8.8.8 --dns 1.1.1.1 -v "%~dp0.:/d" python:3.12-slim python /d/probe2.py >> "%LOG%" 2>&1
echo ==== R3 user network (like compose) default DNS >> "%LOG%"
docker network create tbtest >> "%LOG%" 2>&1
docker run --rm --network tbtest -v "%~dp0.:/d" python:3.12-slim python /d/probe2.py >> "%LOG%" 2>&1
docker network rm tbtest >> "%LOG%" 2>&1
echo ==== DONE %time% >> "%LOG%"
