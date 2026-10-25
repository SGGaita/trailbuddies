# ADR 0006: API on Vercel, database on Supabase (Frankfurt)

**Status:** accepted · 25 Oct 2026 · supersedes the VPS part of [ADR 0003](0003-hosting.md)

## Context
ADR 0003 planned one VPS for the API, worker, Postgres and Redis. Nobody has had time to run
a server, and the closed beta needs backups, TLS and security updates from day one. The web
app is already on Vercel and media is on Cloudflare R2.

## Decision
- **One Vercel project, two services** (root `vercel.json`): `web` (Next.js, `apps/web`) and
  `api` (FastAPI, `services/api`, entrypoint `app.main:app`). Requests to `/api/*` go to the
  API, everything else to the web app, so the session cookie stays first-party with no proxy.
  The API sees the `/api` prefix and strips it itself (`StripApiPrefix` in `app/main.py`).
- **Region `fra1` (Frankfurt)** for functions, next to the database.
- **Supabase Postgres, Pro plan, region eu-central-1 (Frankfurt).** The API connects through
  the **transaction pooler (port 6543)** with SQLAlchemy `NullPool` and psycopg prepared
  statements switched off (`prepare_threshold=None`): see `app/db.py`.
- **Migrations are not run by the API.** GitHub Actions (`.github/workflows/migrate.yml`) runs
  `alembic upgrade head` against the **session pooler (port 5432)** after a merge that adds a
  migration, behind the `production` environment's approval. GitHub runners are IPv4-only,
  so the IPv6-only direct connection isn't used.
- **No worker on Vercel.** The nightly privacy job is `GET /api/cron/daily`, called by
  Vercel Cron at 03:15 UTC with `Authorization: Bearer $CRON_SECRET`. Docker keeps the arq
  worker, which calls the same function.
- **Emails are sent inside the request** on Vercel (`VERCEL=1` sets `serverless`), because a
  function can be frozen once the response is sent.
- **Media and exports must use R2** (`TB_MEDIA_BACKEND=s3`): functions have no lasting disk.
  `/health` returns 503 with `"media": "misconfigured"` otherwise.
- Docker Compose stays for local development and as a fallback host.

## Consequences
- Backups, TLS, patching and failover are Supabase's and Vercel's job. Supabase Pro keeps
  daily backups for 7 days, inside the 35 days the privacy policy promises.
- Cold starts add a few hundred ms to the first request after a quiet spell. Acceptable for
  the beta; the web app works offline-first anyway.
- Long jobs must fit in one function call (default limit 300 s). The export ZIP and the
  nightly job are small for beta families; move them to Vercel Queues if they grow.
- Admin tasks (flags, invite codes, consent review) run from a PC with `python -m app.admin`
  against the session pooler.
