# Monitoring and alerts (OPS-05)

Three free tools, so you hear about problems before parents do:

| Tool | Watches | Alerts you by |
|---|---|---|
| Better Stack (free) | `/api/health` every 3 minutes | Email |
| UptimeRobot (free) | `/api/health` every 5 minutes, from other places | Push to your phone (UptimeRobot app) and email |
| Sentry (free Developer plan) | Errors in the web app and the API, scrubbed | Email |

Two uptime services means one failing or being blocked doesn't leave you blind, and between them you get email and a phone push for free.

## What `/api/health` reports

`https://<your domain>/api/health` answers within a second with no personal data:

```json
{"status": "ok", "version": "0.1.0", "database": "ok", "media": "ok"}
```

It returns **HTTP 503** when the database can't be reached or media storage isn't set up for Vercel, so a monitor that checks for a 2xx status catches both.

## Better Stack

1. Sign up at betterstack.com and open **Uptime → Monitors → Create monitor**.
2. **Alert us when:** URL becomes unavailable. **URL:** `https://<your domain>/api/health`.
3. **Check frequency:** 3 minutes.
4. Under the advanced settings, set the **confirmation period** so a single failed check doesn't alert you. With 3-minute checks, about 3 minutes means "two failures in a row".
5. **On-call escalation:** email to you. On the free plan, phone calls, SMS and push need a paid seat; UptimeRobot covers the phone push.
6. Optional: a second monitor for `https://<your domain>/start` (keyword `Trailbuddies`) to catch a broken web deploy.

## UptimeRobot

1. Sign up at uptimerobot.com, **Add New Monitor**, type **HTTP(s)**.
2. **URL:** `https://<your domain>/api/health`. **Interval:** 5 minutes (the free plan's shortest).
3. Install the **UptimeRobot app** on your phone and sign in. Turn on push notifications for it.
4. In **Alert contacts**, tick your email and the mobile app for this monitor.
5. UptimeRobot checks again from other locations before it alerts, so a single blip doesn't wake you.

## Sentry (errors, no child data)

Sentry is on when its DSNs are set; without them, errors go to our own scrubbed log instead (switch below).

1. Create a Sentry organisation, choose the EU data region (de.sentry.io) when asked, and make two projects: **trailbuddies-web** (Browser JavaScript) and **trailbuddies-api** (Python, FastAPI).
2. In each project's **Settings → Security & Privacy**, turn on **Data scrubber** and **Use default scrubbers**, and turn off **Store client IP addresses**. Our code scrubs first; these are a second safety net.
3. Don't add Session Replay, tracing or profiling. The app's code doesn't load them.
4. Put the DSNs in Vercel as `NEXT_PUBLIC_SENTRY_DSN` (web) and `TB_SENTRY_DSN` (API) and redeploy.
5. **Alerts → Create alert → Issues**: "A new issue is created", action "Send a notification to" your email. Add a second rule for "The issue is seen more than 20 times in 1 hour".

What a report never carries (SAF-07): learner names (replaced with `[child]`), email addresses, links to photos, clips, packs or exports, query strings, cookies, request bodies, the signed-in user, form text or button text. See `packages/domain/src/scrub.js` and `services/api/app/scrub.py`.

## Switching between Sentry and our own error log

| Setting (Vercel) | Effect |
|---|---|
| DSNs set (default) | Sentry |
| `NEXT_PUBLIC_TB_ERRORS=own` and `TB_ERRORS=own` | Our own log at `/api/errors`, kept 30 days. Read it with `python -m app.admin errors` |
| `NEXT_PUBLIC_TB_ERRORS=off` and `TB_ERRORS=off` | No error reports |

With no DSN set at all, the apps use our own log automatically.

## When an alert arrives

1. Open `/api/health`. If `database` is `unavailable`, check status.supabase.com and the Supabase dashboard (**Reports → Database**, connections).
2. Check vercel-status.com and **Vercel → Deployments**. If the last deploy broke it, promote the previous one (**… → Promote to Production**).
3. Look at the newest Sentry issue, or `python -m app.admin errors`.
4. Children keep playing offline meanwhile; progress syncs when the API is back.

## Sources

- [Better Stack vs UptimeRobot (free plan limits)](https://betterstack.com/community/comparisons/better-stack-vs-uptimerobot/)
