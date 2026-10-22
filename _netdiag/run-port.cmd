@echo off
set LOG=%~dp0port-log.txt
echo ==== listeners on 5432 / 6379 / 8000 > "%LOG%"
netstat -ano | findstr /R /C:":5432 " /C:":6379 " /C:":8000 " >> "%LOG%" 2>&1
echo ==== owning processes >> "%LOG%"
powershell -NoProfile -Command "Get-NetTCPConnection -State Listen -LocalPort 5432,6379,8000 -ErrorAction SilentlyContinue | ForEach-Object { $p=Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; '{0}:{1} pid={2} {3}' -f $_.LocalAddress,$_.LocalPort,$_.OwningProcess,$p.ProcessName }" >> "%LOG%" 2>&1
echo ==== postgres services >> "%LOG%"
powershell -NoProfile -Command "Get-Service *postgres* -ErrorAction SilentlyContinue | Format-Table Name,Status,StartType -AutoSize | Out-String -Width 200" >> "%LOG%" 2>&1
echo ==== excluded port ranges tcp >> "%LOG%"
netsh interface ipv4 show excludedportrange protocol=tcp >> "%LOG%" 2>&1
echo ==== docker ps -a trailbuddies >> "%LOG%"
docker ps -a --filter "name=trailbuddies" --format "{{.Names}}  {{.Status}}  {{.Ports}}" >> "%LOG%" 2>&1
echo ==== DONE >> "%LOG%"
