# Trailbuddies

A journey-based learning app for learners aged 3 and up (no upper limit). Each child picks a buddy who guides them along illustrated learning trails. Parents and teachers can make their own lessons, trails and badges. _(Working name.)_

**Status:** Sprint 0 (foundations) in progress: monorepo, shared packages, content schema, web app shells with the first screens, API skeleton, Docker and CI.

## What's in this repo

| Folder                                    | What it holds                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`docs/`](docs)                           | Concept report, development plan, user stories (228 stories with Given/When/Then criteria) and the backlog spreadsheet                                                               |
| [`prototype/`](prototype)                 | The clickable prototype of all four apps (learner, parent, teacher, school and safety) across tablet, phone and web, with shared live state, plus its build script and browser tests |
| [`design/wireframes/`](design/wireframes) | Low-fidelity wireframes: 70 screens across the child, parent and teacher apps                                                                                                        |
| [`tools/backlog/`](tools/backlog)         | Source of truth for the user stories, and the scripts that build the Markdown/Excel backlog and sync GitHub Issues                                                                   |

The 228 user stories are also tracked as [GitHub Issues](../../issues) with epic, persona, priority and points labels, grouped into release milestones (MVP, P2–P5).

## Codebase

```
apps/web            Next.js 16 (App Router) + MUI 9, JavaScript, installable PWA
packages/tokens     colours, type, spacing, breakpoints (web theme now, React Native later)
packages/content-schema  JSON Schemas + validator for subjects, units, badges, buddy lines, assets
packages/content    built-in content: subject catalogue (5 subjects, 25 units) + Counting 1 to 5
packages/domain     pure logic: age bands, progress, trail layout (lessons, rewards and badges next)
packages/sync       progress events, outbox interface, derived state
packages/i18n       UI strings (English first)
packages/api-client fetch client for the API
services/api        FastAPI + SQLAlchemy 2 + Alembic + Postgres; arq worker (app/worker.py)
infra/              Docker Compose (Postgres, Redis, API, worker, Caddy) and Caddyfile
docs/adr/           architecture decisions
```

Apps (`apps/mobile`, React Native CLI) join in Phase 3. See [`docs/Trailbuddies-development-plan.md`](docs/Trailbuddies-development-plan.md) for the sprint plan and §3.4 for which devices each app supports.

## Set up on Windows

You need **Node 22**, **pnpm 10** (`npm install -g pnpm@10`), **Python 3.12** and **Docker Desktop**.

```powershell
git clone https://github.com/SGGaita/trailbuddies.git
cd trailbuddies
pnpm install

# Web app with the demo family (no API needed in Sprint 0)
pnpm dev                       # http://localhost:3000

# Everything the CI checks
pnpm lint
pnpm test
pnpm content:validate
pnpm --filter @trailbuddies/web build
pnpm --filter @trailbuddies/web exec playwright install chromium   # once
pnpm --filter @trailbuddies/web e2e                                # screenshots in apps/web/e2e/screenshots

# API, database, Redis and worker in Docker
copy infra\.env.example infra\.env           # then set POSTGRES_PASSWORD
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build db redis api worker
curl http://localhost:8000/health              # {"status":"ok",...}

# API tests without Docker
cd services/api
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
pytest
```

## Quick start: the prototype

Open `prototype/trailbuddies-prototype.html` in Chrome or Edge. Pick an app and a device in the left panel, then follow the numbered flows or tap around. Progress is saved in your browser; "Reset demo data" (tap twice) starts over.

To change it, edit the files in `prototype/` and rebuild:

```bash
cd prototype
python3 build.py                 # writes trailbuddies-prototype.html
pip install playwright pillow    # once
python3 tests/smoke.py           # every flow, every app; cross-app checks
python3 tests/devshots.py        # screenshots of every screen on every device
```
