# Trailbuddies

A journey-based learning app for learners aged 3 and up (no upper limit). Each child picks a buddy who guides them along illustrated learning trails. Parents and teachers can make their own lessons, trails and badges. *(Working name.)*

**Status:** design and planning are done; the interactive prototype is complete. Sprint 0 (the real codebase) starts on 2 November 2026.

## What's in this repo

| Folder | What it holds |
|---|---|
| [`docs/`](docs) | Concept report, development plan, user stories (228 stories with Given/When/Then criteria) and the backlog spreadsheet |
| [`prototype/`](prototype) | The clickable prototype of all four apps (learner, parent, teacher, school and safety) across tablet, phone and web, with shared live state, plus its build script and browser tests |
| [`design/wireframes/`](design/wireframes) | Low-fidelity wireframes: 70 screens across the child, parent and teacher apps |
| [`tools/backlog/`](tools/backlog) | Source of truth for the user stories, and the scripts that build the Markdown/Excel backlog and sync GitHub Issues |

The 228 user stories are also tracked as [GitHub Issues](../../issues) with epic, persona, priority and points labels, grouped into release milestones (MVP, P2–P5).

## Planned codebase (from Sprint 0)

```
apps/web        Next.js (App Router) + MUI, JavaScript, PWA
apps/mobile     React Native CLI (bare), Android first   (Phase 3)
packages/       domain logic, content schema, content, i18n, tokens, sync, api-client
services/api    Python FastAPI + PostgreSQL
services/worker background jobs
infra/          Docker Compose for the VPS
```

See [`docs/Trailbuddies-development-plan.md`](docs/Trailbuddies-development-plan.md) for the sprint-by-sprint plan, and §3.4 for which devices each app supports.

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
