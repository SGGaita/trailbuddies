@echo off
cd /d "%~dp0"
set LOG=%~dp0diag-log3.txt
echo ==== start %time% > "%LOG%"
set W=-sS -o NUL --max-time 30 -w "%%{http_code} %%{size_download}B %%{time_total}s %%{speed_download}B/s ip=%%{remote_ip}\n"
echo ---- host: pypi wheel (Fastly) fastapi 0.120.4 >> "%LOG%"
curl.exe %W% https://files.pythonhosted.org/packages/source/f/fastapi/fastapi-0.120.4.tar.gz -L >> "%LOG%" 2>&1
echo ---- host: github codeload (non-Fastly) >> "%LOG%"
curl.exe %W% -L https://codeload.github.com/fastapi/fastapi/tar.gz/refs/tags/0.120.4 >> "%LOG%" 2>&1
echo ---- host: npm registry (Cloudflare) >> "%LOG%"
curl.exe %W% https://registry.npmjs.org/typescript/-/typescript-5.6.3.tgz >> "%LOG%" 2>&1
echo ---- host: pypi simple index, IPv4 forced >> "%LOG%"
curl.exe -4 %W% https://pypi.org/simple/fastapi/ >> "%LOG%" 2>&1
echo ---- host: pypi simple index, IPv6 >> "%LOG%"
curl.exe -6 %W% https://pypi.org/simple/fastapi/ >> "%LOG%" 2>&1
echo ---- host: TLS issuer seen by Windows for pypi.org >> "%LOG%"
powershell -NoProfile -Command "$t=New-Object Net.Sockets.TcpClient('pypi.org',443);$s=New-Object Net.Security.SslStream($t.GetStream(),$false,{$true});$s.AuthenticateAsClient('pypi.org');$s.RemoteCertificate.Issuer" >> "%LOG%" 2>&1
echo ==== DONE %time% >> "%LOG%"
