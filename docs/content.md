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
| `pnpm content audio:normalise <folder>` | Trims silence and normalises loudness of every clip (needs ffmpeg) |
| `pnpm content packs:build --channel production --release 2027.03.1` | Builds one pack per subject plus a manifest in `packages/content/dist/packs` |

## Reviewing a draft unit

1. Play it in development (`pnpm dev`) or a preview deployment. Drafts are playable there.
2. Check the following:
   - every fact is true and kind
   - every word is spelt the way children are taught
   - the pictures match the words
   - each lesson builds on the one before
3. For units with illustrations (the animal units), generate the images from the prompt sheet. Save them at the paths in the `.assets.json`, then set each asset's `review_status` to `approved`.
4. Set the unit's `status` to `ready` in both the unit file and `catalogue.json`. Then run `pnpm content validate --prod`.

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
