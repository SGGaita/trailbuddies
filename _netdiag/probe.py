import socket, ssl, sys, time, os
def rd(p):
    try: return open(p).read().strip()
    except Exception as e: return f"ERR {e}"
print("eth0 mtu:", rd("/sys/class/net/eth0/mtu"))
print("resolv.conf:", rd("/etc/resolv.conf").replace("\n"," | "))
for host in ["pypi.org","files.pythonhosted.org","www.google.com","github.com"]:
    t=time.time()
    try:
        ip=socket.getaddrinfo(host,443,socket.AF_INET)[0][4][0]
    except Exception as e:
        print(f"{host}: DNS FAIL {e!r}"); continue
    try:
        s=socket.create_connection((ip,443),timeout=8)
    except Exception as e:
        print(f"{host} {ip}: TCP FAIL {e!r}"); continue
    try:
        ctx=ssl.create_default_context(); ss=ctx.wrap_socket(s,server_hostname=host); ss.settimeout(15)
        ss.sendall(f"HEAD / HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n".encode())
        line=ss.recv(200).split(b"\r\n")[0]
        print(f"{host} {ip}: OK {line!r} cert_issuer={dict(x[0] for x in ss.getpeercert()['issuer']).get('organizationName')} {time.time()-t:.1f}s")
    except Exception as e:
        print(f"{host} {ip}: TLS FAIL {e!r} {time.time()-t:.1f}s")
