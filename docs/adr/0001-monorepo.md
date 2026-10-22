# ADR 0001: One monorepo with pnpm workspaces and Turborepo

**Status:** accepted · 22 Oct 2026

## Context
Trailbuddies has a Next.js web app now and a React Native CLI app from Phase 3. Both need the same lesson logic, content, tokens and sync. One developer works with Claude, so one place for code, docs and CI matters more than independent release trains.

## Decision
- One repository: `apps/` (web, later mobile), `packages/` (shared JS), `services/` (Python API and worker), `infra/`, `docs/`, plus the `prototype/` and `design/` references.
- **pnpm workspaces** for JS packages, **Turborepo** to run lint/test/build across them with caching.
- Packages are plain ES modules with JSDoc types (no TypeScript, no build step); Next compiles them through `transpilePackages`.
- Python uses **pip + requirements.txt** (pinned) inside `services/api`, outside the pnpm workspace.

## Consequences
- One pull request can change a package and both apps together; CI runs everything.
- Before React Native lands (Sprint 12), add `node-linker=hoisted` and Metro `watchFolders`, and pin React to one version for web and mobile.
- Content JSON is imported with `with { type: "json" }`, which needs Node 22+ and current bundlers.
