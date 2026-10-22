# ADR 0003: Hybrid hosting (Vercel + Cloudflare R2 + one VPS)

**Status:** accepted · 22 Oct 2026

## Decision
- **Vercel** hosts the Next.js app (previews per pull request, edge caching).
- **Cloudflare R2** stores media and content packs (no egress fees).
- **One VPS** (e.g. Hetzner, EU) runs the API, worker, Postgres and Redis with `infra/docker-compose.yml`; **Caddy** terminates TLS. Staging is a second Compose project on the same server until there are paying users.
- The API image is built by GitHub Actions and pushed to GHCR; deployment over SSH is switched on with `DEPLOY_ENABLED=true` once the VPS exists.

## Consequences
- Backups (pg_dump to R2) and security updates are our job; move Postgres to a managed service at ~1,000 weekly active families or when upkeep passes an hour a month.
