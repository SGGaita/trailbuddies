@echo off
cd /d "%~dp0"
set LOG=%~dp0diag-log.txt
echo ==== start %date% %time% > "%LOG%"
echo ==== HOST: proxy / AV / adapters / wsl >> "%LOG%"
netsh winhttp show proxy >> "%LOG%" 2>&1
powershell -NoProfile -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Select-Object displayName,productState | Format-Table -AutoSize | Out-String -Width 200" >> "%LOG%" 2>&1
powershell -NoProfile -Command "Get-NetIPInterface -AddressFamily IPv4 | Where-Object ConnectionState -eq 'Connected' | Select-Object InterfaceAlias,NlMtu | Format-Table -AutoSize | Out-String -Width 200" >> "%LOG%" 2>&1
powershell -NoProfile -Command "Get-NetAdapter | Where-Object Status -eq 'Up' | Select-Object Name,InterfaceDescription | Format-Table -AutoSize | Out-String -Width 200" >> "%LOG%" 2>&1
ipconfig /all | findstr /i "DNS Servers Description" >> "%LOG%" 2>&1
wsl -l -v >> "%LOG%" 2>&1
echo ---- daemon.json >> "%LOG%"
type "%USERPROFILE%\.docker\daemon.json" >> "%LOG%" 2>&1
echo ---- host curl pypi >> "%LOG%"
curl.exe -sS -o NUL -w "host curl pypi: %%{http_code} %%{time_total}s\n" https://pypi.org/simple/fastapi/ >> "%LOG%" 2>&1
echo ---- docker info >> "%LOG%"
docker version --format "client {{.Client.Version}} server {{.Server.Version}}" >> "%LOG%" 2>&1
docker info 2>&1 | findstr /i "Proxy Kernel Operating DNS" >> "%LOG%"
echo. >> "%LOG%"
echo ==== T0 default bridge, default DNS >> "%LOG%"
docker run --rm -v "%~dp0.:/d" python:3.12-slim python /d/probe.py >> "%LOG%" 2>&1
echo ==== T1 default bridge, --dns 8.8.8.8 >> "%LOG%"
docker run --rm --dns 8.8.8.8 -v "%~dp0.:/d" python:3.12-slim python /d/probe.py >> "%LOG%" 2>&1
echo ==== A mtu1400 + dns 8.8.8.8 >> "%LOG%"
docker network create --opt com.docker.network.driver.mtu=1400 lowmtu >> "%LOG%" 2>&1
docker run --rm --network lowmtu --dns 8.8.8.8 -v "%~dp0.:/d" python:3.12-slim python /d/probe.py >> "%LOG%" 2>&1
echo ==== A2 mtu1280 + dns 8.8.8.8 >> "%LOG%"
docker network create --opt com.docker.network.driver.mtu=1280 lowmtu1280 >> "%LOG%" 2>&1
docker run --rm --network lowmtu1280 --dns 8.8.8.8 -v "%~dp0.:/d" python:3.12-slim python /d/probe.py >> "%LOG%" 2>&1
echo ==== B host network >> "%LOG%"
docker run --rm --network host -v "%~dp0.:/d" python:3.12-slim python /d/probe.py >> "%LOG%" 2>&1
docker network rm lowmtu lowmtu1280 >> "%LOG%" 2>&1
echo ==== DONE %time% >> "%LOG%"
