# Deploying the API on Vercel and the database on Supabase (Frankfurt)

This guide puts the whole app online: the web app and the API in **one Vercel project**, the database on **Supabase**, photos, clips, packs and exports on **Cloudflare R2** (already set up, see [r2-setup.md](r2-setup.md)). The decision and its trade-offs are in [ADR 0006](adr/0006-vercel-and-supabase.md).

Commands are for Windows, run from `C:\projects\trailbuddies`. Where cmd and PowerShell differ, both are shown.

Keep every password, key, token and connection string in the password manager. Paste them only into the Vercel, GitHub or Supabase dashboards, or type them into a terminal for one session. Never put them in a file in the repo, an issue, a commit or chat.

---

## What goes where

| Piece | Where | Notes |
|---|---|---|
| Web app (`apps/web`) | Vercel service `web` | Everything except `/api/*` |
| API (`services/api`) | Vercel service `api` | `https://<your domain>/api/*`, region `fra1` (Frankfurt) |
| Database | Supabase, Pro, `eu-central-1` (Frankfurt) | The API uses the transaction pooler (port 6543) |
| Migrations | GitHub Actions, "Migrate production database" | Uses the session pooler (port 5432) |
| Nightly privacy job | Vercel Cron, 03:15 UTC | Calls `/api/cron/daily` with `CRON_SECRET` |
| Photos, clips, packs, exports | Cloudflare R2 | `TB_MEDIA_BACKEND=s3` is required on Vercel |

The root `vercel.json` already describes the two services, the Frankfurt region and the cron job.

---

## Step 1. Create the Supabase project

1. Sign in at supabase.com. Create an organisation and choose the **Pro** plan ($25 a month, daily backups kept for 7 days).
2. **New project**:
   - Name: `trailbuddies`
   - Region: **Central EU (Frankfurt)**
   - Database password: generate one with **letters and digits only**, so it needs no escaping in a URL. Save it in the password manager.
3. When the project is ready, click **Connect** at the top. You need two connection strings. Copy each into the password manager.

   | Name in the password manager | Supabase calls it | Port | Used by |
   |---|---|---|---|
   | Trailbuddies DB (transaction) | Transaction pooler | 6543 | The API on Vercel |
   | Trailbuddies DB (session) | Session pooler | 5432 | Migrations and the admin CLI |

4. Change the start of both strings from `postgresql://` (or `postgres://`) to `postgresql+psycopg://`, and put your password in place of `[YOUR-PASSWORD]`. They look like this:

   ```text
   postgresql+psycopg://postgres.<project-ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   postgresql+psycopg://postgres.<project-ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```

   Use the host exactly as Supabase shows it (it may start with `aws-1-`).

Why two: Vercel functions start and stop all the time, so they use the transaction pooler and keep no connections of their own. Migrations need a normal session. The "direct connection" (`db.<ref>.supabase.co`) only has an IPv6 address, which GitHub Actions and many home networks can't reach.

## Step 2. Create the tables (first time only)

Run the migrations from your PC against the **session** pooler.

**PowerShell**
```powershell
cd services\api
.venv\Scripts\Activate.ps1
$env:TB_MIGRATE_DATABASE_URL = "<Trailbuddies DB (session) from the password manager>"
alembic upgrade head
alembic current
```

**cmd**
```bat
cd services\api
.venv\Scripts\activate
set TB_MIGRATE_DATABASE_URL=<Trailbuddies DB (session) from the password manager>
alembic upgrade head
alembic current
```

`alembic current` should print `0007 (head)`. Close the terminal afterwards. No `.venv` yet? Run `py -3.12 -m venv .venv`, activate it, then `pip install -r requirements.txt`.

## Step 3. Let GitHub run future migrations

1. GitHub → **Settings → Environments → New environment**, name it `production`. Under **Required reviewers**, add yourself. Every migration run then waits for your approval.
2. In that environment, **Add environment secret**: name `TB_MIGRATE_DATABASE_URL`, value: the session pooler string.

From now on, merging a PR that adds a migration starts **Actions → Migrate production database**. Approve it, and it runs `alembic upgrade head`. You can also start it by hand with **Run workflow**.

Merge order for a release with a migration: approve the migration run first, then let Vercel deploy. New migrations only ever add things, so the old API keeps working while they run.

## Step 4. Set up the Vercel project

### 4a. Root Directory

The root `vercel.json` defines both services, so the project's Root Directory must be the **repository root**.

- New project: **Add New… → Project**, pick `SGGaita/trailbuddies`, and leave **Root Directory** empty.
- Already imported with Root Directory `apps/web`: **Settings → Build and Deployment → Root Directory**, clear it and save.

### 4b. Environment variables

**Settings → Environment Variables.** Add these for **Production**. Values marked 🔒 come from the password manager.

| Name | Value |
|---|---|
| `TB_ENV` | `production` |
| `TB_DATABASE_URL` 🔒 | Trailbuddies DB (transaction), port 6543 |
| `TB_WEB_URL` | `https://<your domain>` (no trailing slash) |
| `TB_CORS_ORIGINS` | `["https://<your domain>"]` |
| `TB_COOKIE_SECURE` | `true` |
| `TB_MEDIA_BACKEND` | `s3` |
| `TB_S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (`.eu.` in it with the EU jurisdiction) |
| `TB_S3_PUBLIC_ENDPOINT` | the same as `TB_S3_ENDPOINT` |
| `TB_S3_BUCKET` | `trailbuddies-media` |
| `TB_S3_REGION` | `auto` |
| `TB_S3_ACCESS_KEY` 🔒 | R2 API token access key |
| `TB_S3_SECRET_KEY` 🔒 | R2 API token secret |
| `TB_MEDIA_SECRET` 🔒 | a long random value |
| `TB_SMTP_HOST`, `TB_SMTP_PORT`, `TB_SMTP_USER` 🔒, `TB_SMTP_PASSWORD` 🔒, `TB_SMTP_FROM` | your email provider's SMTP settings |
| `CRON_SECRET` 🔒 | a long random value (Vercel sends it to the cron route) |
| `TB_BETA_CODE_REQUIRED` | `true` (new families need an invite code) |
| `TB_REVIEW_EMAIL` | where "a US consent form is waiting" emails go |
| `NEXT_PUBLIC_TB_CHANNEL` | `production` |
| `TB_SENTRY_DSN` 🔒, `NEXT_PUBLIC_SENTRY_DSN` 🔒 | optional: Sentry project DSNs (see [monitoring.md](monitoring.md)) |

A long random value: in PowerShell, `[Convert]::ToBase64String((1..48 | % { Get-Random -Max 256 }))`.

`TB_API_URL` is **not** needed any more: Vercel sends `/api/*` straight to the API. If you added it earlier, delete it.

**Previews.** Don't point previews at the production database. Either leave the `TB_` variables unset for Preview (previews then run the demo only), or create a second, free Supabase project called `trailbuddies-preview`, run Step 2 against it, and give Preview its own `TB_DATABASE_URL`, `TB_WEB_URL` and R2 bucket.

### 4c. Deploy and add the domain

1. **Deployments → Redeploy** (or push to `main`).
2. **Settings → Domains**: add your domain and follow the DNS steps.
3. Update `TB_WEB_URL` and `TB_CORS_ORIGINS` if the domain changed, then redeploy.

## Step 5. Check it works

1. Open `https://<your domain>/api/health`. You should see `{"status":"ok", ..., "database":"ok","media":"ok"}`.
   - `"database":"unavailable"`: check `TB_DATABASE_URL` uses port 6543 and `postgresql+psycopg://`.
   - `"media":"misconfigured"`: set `TB_MEDIA_BACKEND=s3`.
2. Make invite codes for the first families (Step 6), then sign up on a phone with one. The sign-in email should arrive within a minute.
3. **Vercel → Settings → Cron Jobs**: `/api/cron/daily` is listed. Click **Run** once; the function log shows a line of counts such as `{"history": 0, ...}`.
4. `https://<your domain>/api/content/manifest?channel=production` lists your packs once they're published ([launch-content-guide.md](launch-content-guide.md), Step 4).

## Step 6. Admin tasks from your PC

There are no admin screens yet. Run these against the **session** pooler:

**PowerShell**
```powershell
cd services\api
.venv\Scripts\Activate.ps1
$env:TB_DATABASE_URL = "<Trailbuddies DB (session) from the password manager>"
python -m app.admin codes --new 10 --note "Nairobi playtest"
python -m app.admin flags beta-feedback --cohort beta
python -m app.admin flags beta-faq --cohort beta
python -m app.admin consents
```

(cmd: `set TB_DATABASE_URL=...` instead of `$env:...`.)

| Task | Command |
|---|---|
| Make invite codes | `python -m app.admin codes --new 10 --note "who they're for"` |
| List codes and uses | `python -m app.admin codes` |
| Turn a flag on for the beta | `python -m app.admin flags <flag> --cohort beta` |
| Turn a flag on for everyone, or off | `python -m app.admin flags <flag> --everyone on` (or `off`) |
| See all flags | `python -m app.admin flags` |
| Put a family in a cohort | `python -m app.admin cohort <family id> beta` |
| US consent forms waiting | `python -m app.admin consents` |
| Approve or reject one | `python -m app.admin consents --approve <id>` (or `--reject <id>`) |
| Grown-ups' feedback | `python -m app.admin feedback --days 7` |
| Our own error log | `python -m app.admin errors --days 1` |
| Run the nightly job now | `python -m app.admin daily` |

Approving or rejecting a consent emails the parent, so set the `TB_SMTP_` variables in that terminal too, or the email is only written to the log.

When you approve a US form, check that the name and the typed signature match, the relationship is parent or guardian, and the date is today's or yesterday's.

## Step 7. Local development doesn't change

Docker Compose still runs everything on your PC ([docker.md](docker.md)). The API container still applies migrations when it starts, and the arq worker runs the same nightly job.

## If something goes wrong

| Problem | What to do |
|---|---|
| `prepared statement "_pg3_0" already exists` | `TB_DATABASE_URL` must be the transaction pooler (port **6543**). The API turns prepared statements off for that port only. |
| `remaining connection slots are reserved` | Something is using the session pooler (5432) from Vercel. Switch `TB_DATABASE_URL` to 6543. |
| Migration run fails with "could not translate host name" | The secret has the IPv6-only direct host. Use the session pooler host. |
| Sign-in links point to localhost | Set `TB_WEB_URL` for Production and redeploy. |
| `/api/...` returns the web app's 404 page | The project's Root Directory isn't the repository root (Step 4a). |
| A bad deploy | **Deployments**, pick the last good one, **… → Promote to Production**. The database isn't touched. |

## Sources

- [Vercel: FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi)
- [Vercel Services guide](https://vercel.com/kb/guide/vercel-services)
- [Supabase: using SQLAlchemy with Supabase](https://supabase.com/docs/guides/troubleshooting/using-sqlalchemy-with-supabase-FUqebT)
- [Supabase: connection strings](https://supabase.com/docs/reference/postgres/connection-strings)
