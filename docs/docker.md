# Docker command guide (Windows: cmd and PowerShell)

How to run, inspect and fix the Trailbuddies stack with Docker Desktop on Windows, followed by a general Docker reference.

Run every command from the repo root, `C:\projects\trailbuddies`. Where cmd and PowerShell differ, both versions are shown.

---

## 1. One-time setup

1. Install **Docker Desktop**, start it, and wait until it shows *Engine running*.
2. Create your local settings file. It is never committed.

   | cmd | PowerShell |
   |---|---|
   | `copy infra\.env.example infra\.env` | `Copy-Item infra\.env.example infra\.env` |

3. Open `infra\.env` and set `POSTGRES_PASSWORD`, using letters and digits only (see §9).
4. If PostgreSQL is already installed on this PC, set `POSTGRES_HOST_PORT=5433` too.

Keep real passwords, keys and tokens in the password manager. `infra\.env` is for local values only.

## 2. A shortcut for the long compose command

Every compose command for this project starts with `docker compose -f infra/docker-compose.yml --env-file infra/.env`. Make a shortcut called `dc` once per terminal window.

**cmd**
```bat
doskey dc=docker compose -f infra/docker-compose.yml --env-file infra/.env $*
```

**PowerShell**
```powershell
function dc { docker compose -f infra/docker-compose.yml --env-file infra/.env @args }
```

To keep the PowerShell shortcut in every window, add that line to your profile (`notepad $PROFILE`).

The rest of this guide uses `dc`. Without the shortcut, type the full prefix instead of `dc`.

Note for cmd: `doskey` shortcuts only work when typed at the prompt, not inside `.bat` files. In a script, write the full command.

## 3. Everyday commands

| Task | Command |
|---|---|
| Start the back end (db, redis, mailpit, api, worker) | `dc up -d db redis mailpit api worker` |
| Start after code or requirements changed | `dc up -d --build db redis mailpit api worker` |
| Start everything including the web app (live reload) | `dc --profile web up --build --watch` |
| What's running, with health | `dc ps` |
| Follow the API's log | `dc logs -f api` |
| Last 100 lines from every service | `dc logs --tail 100` |
| Restart one service | `dc restart api` |
| Stop everything (data kept) | `dc stop` |
| Stop and remove containers (data kept in volumes) | `dc down` |
| **Delete everything, including the database** | `dc down -v` |

Check the API is up:

| cmd | PowerShell |
|---|---|
| `curl http://localhost:8000/health` | `curl.exe http://localhost:8000/health` |

In PowerShell, `curl` is an alias for `Invoke-WebRequest`. Use `curl.exe` to get the real curl.

`pnpm dev` (web on port 3000) is the fastest way to work on the web app, with only the back end in Docker. Don't run `pnpm dev` and the web container together unless you set `WEB_PORT=3001` in `infra\.env`.

## 4. What runs where

| Service | Address on your PC | What it's for |
|---|---|---|
| Web app (`pnpm dev` or the `web` profile) | http://localhost:3000 | The app |
| API | http://localhost:8000 (docs at `/docs`) | FastAPI |
| Postgres | `localhost:5432` (or your `POSTGRES_HOST_PORT`) | Database |
| Redis | `localhost:6379` | Worker queue |
| Mailpit | http://localhost:8025 | Catches sign-in emails locally |
| MinIO console (from Sprint 5) | http://localhost:9001 | Local photo and voice-clip storage |
| MinIO S3 API (from Sprint 5) | http://localhost:9000 | Presigned uploads |

Every port is bound to `127.0.0.1`, so nothing is reachable from other machines on your network.

Containers reach each other by service name (`db:5432`, `redis:6379`, `minio:9000`, `mailpit:1025`), not by `localhost`.

## 5. Database

| Task | Command |
|---|---|
| Open psql | `dc exec db psql -U trailbuddies -d trailbuddies` |
| Run one query | `dc exec db psql -U trailbuddies -d trailbuddies -c "select count(*) from learners;"` |
| List tables (inside psql) | `\dt` (quit with `\q`) |

**Back up and restore.** These steps work the same in cmd and PowerShell, because the file is written inside the container and then copied out.

```text
dc exec db pg_dump -U trailbuddies -d trailbuddies -f /tmp/backup.sql
dc cp db:/tmp/backup.sql backup.sql
```

```text
dc cp backup.sql db:/tmp/backup.sql
dc exec db psql -U trailbuddies -d trailbuddies -f /tmp/backup.sql
```

Don't use `> backup.sql` in Windows PowerShell 5. It writes UTF-16, and psql can't restore that.

Backups contain children's data. Keep them out of the repo, store them encrypted, and delete them when you're done.

**Start with an empty database.** This deletes all local data.

```text
dc down -v
dc up -d db redis mailpit api worker
```

## 6. Migrations (Alembic)

The API container runs `alembic upgrade head` every time it starts, so a restart applies new migrations.

| Task | Command |
|---|---|
| Current revision | `dc exec api alembic current` |
| History | `dc exec api alembic history` |
| Apply now | `dc exec api alembic upgrade head` |

**Creating** a migration happens on your PC rather than in the container. Files made inside the container aren't saved back to the repo. Point Alembic at the Docker database through the host port:

**cmd**
```bat
cd services\api
.venv\Scripts\activate
set TB_DATABASE_URL=postgresql+psycopg://trailbuddies:YOUR_PASSWORD@localhost:5432/trailbuddies
alembic revision --autogenerate -m "describe the change"
```

**PowerShell**
```powershell
cd services\api
.venv\Scripts\Activate.ps1
$env:TB_DATABASE_URL = "postgresql+psycopg://trailbuddies:YOUR_PASSWORD@localhost:5432/trailbuddies"
alembic revision --autogenerate -m "describe the change"
```

- Use port 5433 if you changed `POSTGRES_HOST_PORT`.
- Review the generated file before committing it.
- Never edit a migration that has already been applied.

## 7. Rebuilding images

| When | Command |
|---|---|
| `services/api/requirements.txt` or the Dockerfile changed | `dc build api` then `dc up -d api worker` |
| Build from scratch (ignore the cache) | `dc build --no-cache api` |
| Web dependencies changed (web profile) | `--watch` rebuilds automatically; otherwise `dc --profile web build web` |
| Pull newer base images | `dc pull` |

The worker uses the API's image, so rebuild `api` and restart both.

## 8. Mail and media (local)

- **Sign-in emails:** open http://localhost:8025. Every email the API sends lands there, and nothing leaves your PC.
- **Photos and voice clips** (once Sprint 5, PR #240, is merged):
  - Start MinIO with the rest of the stack: `dc up -d db redis mailpit minio api worker`.
  - Open the console at http://localhost:9001 and sign in with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from `infra\.env`.
  - The API creates the `trailbuddies-media` bucket the first time it's used.
  - `dc down -v` also deletes the stored media.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `error during connect` / `pipe/dockerDesktopLinuxEngine` | Docker Desktop isn't running. Start it and wait for *Engine running*. |
| `ports are not available ... 5432` | Another PostgreSQL is using the port. Run `netstat -ano \| findstr :5432` (cmd) or `Get-NetTCPConnection -LocalPort 5432` (PowerShell) to check. Set `POSTGRES_HOST_PORT=5433` in `infra\.env`. |
| Port 3000 busy | Stop `pnpm dev` or set `WEB_PORT=3001`. |
| API `unhealthy`, log says "Name or service not known" | The password has `@ : / # ? %` in it. Use letters and digits. If the volume already exists, change it there too: `dc exec db psql -U trailbuddies -d trailbuddies -c "ALTER USER trailbuddies PASSWORD 'newpassword';"` |
| `pip install` fails with "from versions: none" | Docker can't reach PyPI reliably. In Docker Desktop → Settings → Docker Engine, add `"dns": ["8.8.8.8", "1.1.1.1"]`, then Apply & restart. |
| A service keeps restarting | Run `dc logs --tail 200 <service>`, then `dc ps` to see its health. |
| Changes to Python code don't show | The API image has the code baked in. Rebuild: `dc up -d --build api worker`. |
| Out of disk space | See the cleanup commands in §10. |
| Something odd with WSL | `wsl --shutdown`, then restart Docker Desktop. |

## 10. General Docker reference

**Containers**

| Task | Command |
|---|---|
| Running containers | `docker ps` |
| All containers, including stopped | `docker ps -a` |
| Shell inside a container | `docker exec -it trailbuddies-api-1 sh` |
| Logs | `docker logs -f trailbuddies-api-1` |
| CPU and memory, live | `docker stats` |
| Details (env, mounts, IP) | `docker inspect trailbuddies-api-1` |
| Stop / start / remove | `docker stop <name>` · `docker start <name>` · `docker rm <name>` |
| Copy a file out / in | `docker cp <name>:/path/file .` · `docker cp file <name>:/path/` |

**Images**

| Task | Command |
|---|---|
| List | `docker images` |
| Download | `docker pull postgres:16-alpine` |
| Build from a folder | `docker build -t myimage:dev services/api` |
| Remove | `docker rmi <image>` |
| Layers and sizes | `docker history <image>` |

**Volumes and networks**

| Task | Command |
|---|---|
| List volumes | `docker volume ls` (this project's are named `trailbuddies_pgdata` etc.) |
| Inspect a volume | `docker volume inspect trailbuddies_pgdata` |
| Remove a volume (**deletes its data**) | `docker volume rm <volume>` |
| List networks | `docker network ls` |

**Cleanup**

| Task | Command |
|---|---|
| Disk use by images, containers, volumes and cache | `docker system df` |
| Remove stopped containers, unused networks and dangling images | `docker system prune` |
| Also remove all unused images | `docker system prune -a` |
| Clear the build cache | `docker builder prune` |
| Remove unused volumes (**data loss**) | `docker volume prune` |

`docker system prune` does not touch volumes unless you add `--volumes`. Never add `--volumes` if you need the local database.

**Compose, in general**

| Task | Command |
|---|---|
| Show the final config after `.env` is applied | `dc config` |
| List the services | `dc config --services` |
| Run a one-off command in a fresh container | `dc run --rm api python -c "print('hi')"` |
| Scale a service | `dc up -d --scale worker=2` |

## 11. On the VPS (production)

The VPS runs Linux, so the commands there use a bash shell.

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env --profile prod up -d
docker compose -f infra/docker-compose.yml --env-file infra/.env --profile prod pull
docker compose -f infra/docker-compose.yml --env-file infra/.env --profile prod logs -f api caddy
```

The `prod` profile adds Caddy for TLS. Production secrets live only in the VPS's `infra/.env`, copied from the password manager.
