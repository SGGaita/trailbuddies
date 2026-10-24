# Content: writing, reviewing and publishing units

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

1. Play it in development (`pnpm dev`) or a preview deployment. Drafts are playable there.
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
