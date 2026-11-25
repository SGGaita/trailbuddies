# Content: writing, reviewing and publishing units

First launch of the Sprint 6 units, step by step (Vercel, review, pictures, packs): see [launch-content-guide.md](launch-content-guide.md).

Units are JSON in `packages/content/src/units/<subject>/<unit>.json`, each with an asset manifest beside it (`<unit>.assets.json`). The catalogue (`packages/content/src/catalogue.json`) lists every unit and its status.

## Statuses

| Status | Meaning | Who sees it |
|---|---|---|
| `planned` | In the catalogue, no content yet | "Coming soon" on the trail |
| `draft` | Written, waiting for review | Development and preview builds only |
| `ready` | Fact-checked and approved | Everyone |

A production build (`NEXT_PUBLIC_TB_CHANNEL=production`) hides drafts. Production content packs only include `ready` units, and every asset those units use must be `approved`. CI checks this on every pull request (CNT-03).

## Commands

Run these from the repo root:

| Command | What it does |
|---|---|
| `pnpm content validate` | Checks every file against the schemas and the catalogue |
| `pnpm content validate --prod` | Also fails on any unapproved asset in a `ready` unit (CNT-03) |
| `pnpm content units:index` | Rebuilds `src/units/all.js` after you add a unit file |
| `pnpm content assets:prompts animals/farm-animals` | Writes `packages/content/prompts/farm-animals.md`, an illustration brief per item |
| `pnpm content assets:import <folder>` | Brings generated pictures in: each file named `img-<item>.png` (or `<item>.png`) becomes a 512 px WebP at its asset path in `apps/web/public/art/units/`, marked `reviewed` |
| `pnpm content assets:approve <unit>` | Approves a unit's reviewed pictures once you've checked them in the app |
| `pnpm content unit:ready <unit>` | Publishes a reviewed unit to children (refuses if a picture isn't approved); `unit:draft` takes it back |
| `pnpm content audio:normalise <folder>` | Trims silence and normalises loudness of every clip (needs ffmpeg) |
| `pnpm content packs:build --channel production --release 2027.03.1` | Builds one pack per subject plus a manifest in `packages/content/dist/packs` |

## Reviewing a draft unit

1. Open http://localhost:3000/review in development (or `/review` on a preview deployment). It lists every unit with its status, and each lesson has a button that plays it as the chosen child would: no locks, nothing saved.
2. Check the following:
   - every fact is true and kind
   - every word is spelt the way children are taught
   - the pictures match the words
   - each lesson builds on the one before
3. For units with illustrations (the animal units), generate the images from the prompt sheet and save each as `img-<item>.png`. Run `pnpm content assets:import <folder>` and look at them in the app; pictures marked `reviewed` show in development and previews only. Then run `pnpm content assets:approve <unit>`.
4. Run `pnpm content unit:ready <unit>`, which sets the status in both the unit file and the catalogue. Then run `pnpm content validate --prod`.

## Publishing new lessons without an app release (CNT-02)

1. Build the packs:
   ```
   pnpm content packs:build --channel production --release 2027.03.1
   ```
2. Upload them to the media store (R2 in production; see `docs/r2-setup.md`) from the API:
   ```
   cd services/api
   python -m app.packs publish ../../packages/content/dist/packs
   ```
   Packs upload first and the manifest last, so a device never sees a manifest pointing at a missing pack.
3. Devices check the manifest when the app opens. They download changed packs in the background on Wi-Fi, and use them from the next launch (OFF-02).

A unit that's new in a pack, rather than an update to a built-in unit, plays on the generic `/play/go?unit=…&step=…` page until the next app release gives it its own pages.

## The content admin at /admin (Sprint 12, CMS-01…04)

From Sprint 12 the built-in content can be edited on the web, without a code change. The files in `packages/content/src` stay as the **bundled copy** every install starts with; the database holds the versions staff edit.

**Roles** (CMS-01). People in `TB_ADMIN_EMAILS` are admins. Admins add other staff by email at `/admin/staff`; they sign in with the usual magic link.

| Role | Can |
|---|---|
| Admin | everything: roles, publishing, rolling back, exporting, approving pictures, moderation |
| Editor | edit units, the map and badges, and submit the draft for review |
| Reviewer | review drafts (approve or send back with a comment) and approve uploaded pictures |
| Moderator | the moderation queue only |

Every role change, save, upload, approval and publish is in the audit log on `/admin/staff`.

**First time** (CMS-02). An admin opens `/admin/content` and presses **Import the content**. The app sends its own bundled files; the API checks every one against the same JSON Schemas and saves them as version 1. Version 1 builds exactly the packs `pnpm content packs:build` makes today, so nothing changes for children.

**Editing** (CMS-03). `/admin/content/unit?id=<unit>` edits a unit's name, summary, age band, items (word, what the buddy says, fun fact, picture) and each lesson's items and exercise mix. Problems show next to the field and Save stays off until they're fixed; the API checks again. Item ids never change, so children keep their stars and mastery. Saves go into a **draft** of the next version; children keep the published one.

**Pictures**. Choose a picture from the unit, from the approved library of every unit, or an emoji, or upload one. Uploads are cropped and re-encoded on the device (no EXIF or location), pass the on-device image check, and wait for a reviewer or admin to approve them. A unit that's ready for children can't be published while it uses an unapproved upload. Approved uploads are served at `/api/content/assets/<id>`.

**Preview** (CMS-04). **Preview as a child** opens the draft in the real learner screens (`/play/go?…&preview=1&admin=1`) with a stand-in child of the unit's age band. Nothing is recorded.

**Review and publishing** (CMS-06, Sprint 13). Publishing has three steps, on `/admin/content/review`:
1. An editor presses **Submit for review** with a note saying what changed.
2. A reviewer or admin **who didn't work on the draft** sees each changed unit, the map and the badges side by side (published on the left, the draft on the right), then presses **Approve** or **Send back** with a comment. A sent-back draft shows the comment to the editor.
3. An admin presses **Publish**. This rebuilds the production and preview packs and manifests in the media store (the same keys as `python -m app.packs publish`), so devices get the new version on their next launch.

Editing a submitted or approved draft sends it back to draft, so it's reviewed again. A ready unit, trail or badge can't publish while it uses an upload that isn't approved. The change log beside the draft shows who changed, approved and published each version.

**Roll back** (CMS-07). Any earlier version can be published again from the change log. It becomes a new version (history is never rewritten), and devices pick it up on their next sync. Roll back is admin only and waits until the draft is published or discarded.

**Map & trails** (CMS-05). `/admin/content/map` sets the order of trails on the world map (the first five take the valley's spots) and of units in each trail. You can also:
- Archive a trail. It leaves every child's map; children keep their stars, badges and treasure, and the trail can be brought back.
- Add a trail with a name, a place, uploaded island art (approved like pictures) and a first unit.
- Add units, blank (four starter words to replace) or as a copy of another unit's lessons.

New units start as draft; an admin marks them ready in the unit editor. The map travels in the manifest (`map`), so every device applies it, and trails that aren't built into the app are always downloaded.

**Badges** (CMS-08). `/admin/content/badges` lists the built-in badges. You can:
- Add a badge with a rule: finish units, reach a number, keep a streak, or master items.
- Edit a badge, or give it uploaded art (approved like pictures; the emoji shows until then).
- Retire a badge. Nobody new can earn it, and children who earned it keep it.

Badges ship as their own file in the packs (`manifest.badges`), so children earn new badges on their device, offline too. If the content was imported before Sprint 13, an admin presses **Bring in the badges** once on `/admin/content`.

**Refreshing the bundled copy**. Now and then, press **Export** on `/admin/content` and commit the result so new installs start from the latest content:
```
pnpm content export:apply trailbuddies-content-v3.json
pnpm content units:index && pnpm content:validate
```
Then open a PR. Uploaded pictures stay on the server, so their manifest entries point at `/api/content/assets/<id>`.

The JSON Schemas are copied for the API by `pnpm --filter @trailbuddies/content-schema schemas:api` (writes `services/api/app/content_schemas.json`). Run it after changing a schema; a test fails if the copy is out of date.
