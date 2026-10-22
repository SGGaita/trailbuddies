# CLAUDE.md: working on Trailbuddies

## Stack rules

- JavaScript with JSDoc types. **No TypeScript, no Tailwind, no Expo.**
- Web: Next.js (App Router) + MUI. Mobile: React Native CLI (bare) + React Native Paper themed from `packages/tokens`.
- Back end: Python FastAPI + SQLAlchemy 2 + Alembic, PostgreSQL.

## Where things go

- No business logic in screens. Lesson generation, difficulty, mastery, rewards, badge rules and sync live in `packages/` and are pure JS with Jest tests.
- Content is data: units are JSON validated against `packages/content-schema`.
- Every screen works on every device its app supports (development plan §3.4): learner tablet/phone/web, parent phone/tablet/web, teacher web/tablet. The prototype in `prototype/` is the reference for layout and behaviour.

## Commands

- `pnpm install` · `pnpm dev` (web on :3000) · `pnpm lint` · `pnpm test` · `pnpm content:validate`
- `pnpm --filter @trailbuddies/web build` then `pnpm --filter @trailbuddies/web e2e` (phone, tablet, desktop screenshots)
- API: `cd services/api && pip install -r requirements-dev.txt && ruff check . && pytest`; migrations with `alembic revision --autogenerate` then review the file
- Stack: `docker compose -f infra/docker-compose.yml --env-file infra/.env up -d`

## Child-safety rules

- Never add a third-party analytics or ad SDK.
- Never log a child's name, photo URL or audio URL.
- Every upload path strips EXIF. Free-text inputs only in grown-up screens.

## Definition of done

Tests written and passing, content validated, screenshots for UI changes at each supported device size, a short PR description.

## Never

Commit secrets, push to `main`, or edit an already-applied migration. Work on a branch and open a PR.
