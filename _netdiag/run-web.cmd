@echo off
set LOG=%~dp0web-log.txt
echo ==== %time% listeners on 3000 > "%LOG%"
netstat -ano | findstr /R /C:":3000 " >> "%LOG%" 2>&1
powershell -NoProfile -Command "Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { $p=Get-Process -Id $_.OwningProcess; '{0}:{1} pid={2} {3} started {4}' -f $_.LocalAddress,$_.LocalPort,$_.OwningProcess,$p.ProcessName,$p.StartTime }" >> "%LOG%" 2>&1
echo ==== node processes >> "%LOG%"
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | ForEach-Object { '{0} cpu={1}s mem={2}MB {3}' -f $_.ProcessId, [int]((Get-Process -Id $_.ProcessId).CPU), [int]($_.WorkingSetSize/1MB), ($_.CommandLine -replace '\s+',' ').Substring(0,[Math]::Min(180,($_.CommandLine -replace '\s+',' ').Length)) }" >> "%LOG%" 2>&1
echo ==== curl localhost:3000 (60s max) >> "%LOG%"
curl.exe -sS -o "%~dp0web-home.html" --max-time 60 -w "http=%%{http_code} bytes=%%{size_download} t=%%{time_total}s\n" http://localhost:3000/ >> "%LOG%" 2>&1
curl.exe -sS -o NUL --max-time 15 -w "127.0.0.1: http=%%{http_code} t=%%{time_total}s\n" http://127.0.0.1:3000/ >> "%LOG%" 2>&1
echo ==== DONE %time% >> "%LOG%"
