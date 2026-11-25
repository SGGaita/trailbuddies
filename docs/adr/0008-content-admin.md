# ADR 0008: Built-in content is edited in a staff area and stored as versions in the database

**Status:** accepted · 21 Nov 2026 (Sprint 12, CMS-01…04)

## Context
Until Sprint 12, every change to the built-in units was a JSON edit and a pull request. Steve
wants staff to fix and improve lessons on the web, with roles, a draft and a preview, without
a developer. Devices already download content packs (CNT-02, ADR 0006) and play them offline.

## Decision
- **Database versions, bundled copy kept.** Content lives in `content_versions` and
  `content_docs` (one document per catalogue, unit and asset manifest; a version holds only the
  documents it changed). Version 1 is imported from the files bundled in the web app, and
  builds byte-for-byte the packs the content CLI makes (a test checks this). The files in
  `packages/content/src` stay as the copy every install starts with; **Export** plus
  `pnpm content export:apply` refreshes it.
- **Publishing reuses the packs.** Publishing builds the production and preview packs and
  manifests into the same storage keys as `python -m app.packs publish`. Devices need no change.
- **One set of rules.** The API validates with a copy of the same JSON Schemas
  (`app/content_schemas.json`, generated, checked by a test); the editor validates as you type
  with the same package.
- **Roles in the API.** `staff_members` holds editors, reviewers and moderators; admins come from
  `TB_ADMIN_EMAILS` (or a staff row). Every route checks the role; every change is logged in
  `admin_log`. The moderation queue moved under the moderator role.
- **Staff area on the same site** at `/admin`, using the normal magic-link sign-in.
- **Uploaded pictures** are prepared and checked on the device (ADR 0007), stored like other
  media, and need a reviewer's or admin's approval; only approved ones are public and only they
  can ship in a ready unit.
- **Review before publishing (Sprint 13).** An editor submits; a reviewer or admin who didn't
  work on the draft approves it or sends it back with a comment; then an admin publishes.
  Approving and publishing are separate steps (Steve's choice). Any edit after review sends
  the draft back. (Sprint 12 had admin-only publishing with a confirmation for own changes.)
- **Roll back** publishes an earlier version's content as a new version; history is never
  rewritten.
- **The map and badges travel in the manifest.** `manifest.map` carries trail order, archived
  trails, uploaded island art and new trails; `manifest.badges` points at a `badges/1` file.
  Devices keep both and apply them at launch, before the first render. The JS and Python pack
  builders stay byte-for-byte identical (a test checks this).

## Consequences
- Content changes reach children without an app release, and still work offline.
- The database is the source of truth after the import; a PR that edits unit files only changes
  new installs until it is imported again (it isn't: import runs once). Exports keep them close.
- Trails, units, map order and badges are edited in the same draft (Sprint 13, E04–E06).
- The first five trails in map order take the world map's valley spots; with the built-in order
  every trail keeps the spot its art was drawn for.
