# CLAUDE.md: working on Trailbuddies

## Stack rules

- JavaScript with JSDoc types. **No TypeScript, no Tailwind, no Expo.**
- Web: Next.js (App Router) + MUI. Mobile: React Native CLI (bare) + React Native Paper themed from `packages/tokens`.
- Back end: Python FastAPI + SQLAlchemy 2 + Alembic, PostgreSQL.

## Where things go

- No business logic in screens. Lesson generation, difficulty, mastery, rewards, badge rules and sync live in `packages/` and are pure JS with Jest tests.
- Content is data: units are JSON validated against `packages/content-schema`. New units start as `draft` (shown in development and previews only) and become `ready` once reviewed; see `docs/content.md`. Run `pnpm content units:index` after adding a unit file.
- Every screen works on every device its app supports (development plan §3.4): learner tablet/phone/web, parent phone/tablet/web, teacher web/tablet. The prototype in `prototype/` is the reference for layout and behaviour.

## Shapes and corners (match the prototype)

- The MUI theme keeps `shape.borderRadius: 4`. A numeric `borderRadius` in `sx` is multiplied by it, so write the prototype's px value divided by 4 (or a px string). Never raise the theme base: at 18 every card turned into a pill.
- Prototype radii: profile card 30px (7.5), lesson tile 28px (7), speech bubble 22px (5.5; small 18px), island card / dialog 22px, card or list 18px (4.5), button / icon button 16px (4), input 14px, chip and coin 999px, avatar and speak button 50%.
- Cards are rounded rectangles, never stadiums: a radius must stay well under half the element's height.
- Map-style screens keep the prototype's compact layout (islands in a 3 x 2 grid from the top-left, ~305px pitch), not `%` positions that spread out on wide screens.
- Lesson screens always use the prototype header: close button (52px, 16px radius), one progress segment per step (green done, sun current, sand to come, 16px tall, 8px radius) and an "n of N" count; below it the buddy, a wide speech bubble and the speak button beside the bubble. Use `components/lesson/LessonProgress.js`, never a continuous `LinearProgress`.
- Check every UI change against the prototype screen at 390, 1180 and 1440 px.

## Commands

- `pnpm install` · `pnpm dev` (web on :3000) · `pnpm lint` · `pnpm test` · `pnpm content:validate` · `pnpm content <command>` (content CLI)
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
