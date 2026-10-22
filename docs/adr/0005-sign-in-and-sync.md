# ADR 0005: Grown-up sign-in, sessions and two-way sync

**Status:** accepted (Sprint 2)

## Context
Grown-ups sign in on several devices (a phone, a home tablet, a laptop). Children never
sign in; they are profiles in a family. Progress must work offline (ADR 0002) and settle
the same way on every device. The web app runs on Vercel, the API on the VPS.

## Decision
- **Sign-in:** email magic link (single-use, 15 minutes, only a SHA-256 of the token is
  stored, 5 links an hour per address, always answers 202) and Google OAuth, which stays
  hidden until `TB_GOOGLE_CLIENT_ID` and `TB_GOOGLE_CLIENT_SECRET` are set.
- **Email:** generic SMTP (`TB_SMTP_*`). Locally Mailpit catches every email
  (http://localhost:8025).
- **Sessions:** server-side rows in Postgres. The `tb_session` cookie is httpOnly,
  SameSite=Lax and Secure in production. It carries a random token, and the database stores
  only its hash. Sessions last 60 days and slide forward daily. Signing out deletes the row; "Sign out of all devices" deletes every session for that grown-up.
- **Same-origin API:** the web app rewrites `/api/*` to the API (`TB_API_URL`), so the
  cookie is first-party everywhere and no CORS credentials are needed in the browser.
- **Consent first:** learners and events are refused (403) until a grown-up has agreed to
  the current policy version; consent rows keep the version, scopes and time.
- **Profiles:** learners get ULIDs made on the device. Every profile or settings edit
  carries `updated_at`, and the newest edit wins on the server and on each device.
- **Events:** the device keeps them in IndexedDB (Dexie). Each family has its own
  database, and the demo family has a separate one that never syncs. `POST /sync/events`
  is idempotent by event id. `GET /sync/events?after=<seq>` pages by server sequence (the
  cursor). Deleting a learner deletes their events explicitly.
- **Edit history:** whenever an edit replaces a version, or an older edit arrives late and
  loses, that version is kept in `edit_history` for 30 days (a nightly worker job purges it).
- **Grown-ups:** a second parent (equal access) or a carer (`viewer`, view progress only)
  is invited by email. The invitation link signs them in as that address. Viewers' devices
  pull progress but never upload, and the API refuses their writes.
- **Plans:** learner profiles per plan (Free 1, Family 6). New families start on Family
  during the closed beta (`TB_DEFAULT_PLAN`). The API answers 402 `plan_limit` beyond that.
- **Parent gate PIN:** hashed on the device with PBKDF2-SHA256 (150k iterations).
  Only `{salt, hash, iterations}` is stored and synced, so every device can check it
  offline and the PIN never reaches the server.

## Consequences
- No passwords to store or reset. A lost PIN is reset by signing in again by email.
- Clock skew between devices can make an older edit win. That's acceptable for names
  and settings; progress is append-only and never conflicts.
- E2E tests use an in-memory fake of the API (`apps/web/e2e/fakeApi.js`) that follows the
  contract tested in `services/api/tests`.
