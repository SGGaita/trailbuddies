import socket, time, subprocess, sys
ok=0; fails=[]
for i in range(8):
    t=time.time()
    try: socket.getaddrinfo("pypi.org",443); ok+=1
    except Exception as e: fails.append(f"{e.__class__.__name__}@{time.time()-t:.1f}s")
    time.sleep(1)
print(f"DNS pypi.org: {ok}/8 ok", fails)
t=time.time()
r=subprocess.run([sys.executable,"-m","pip","download","--no-deps","-q","-d","/tmp/x","--timeout","20","fastapi==0.120.4","pydantic"],capture_output=True,text=True)
print(f"pip download rc={r.returncode} {time.time()-t:.1f}s", (r.stderr.strip().splitlines() or [""])[-1][:200])
