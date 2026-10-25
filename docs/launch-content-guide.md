# Getting the content live

Four jobs, in this order:

1. Put the app on Vercel: the web app and the API in one project, the database on Supabase (Frankfurt).
2. Review the draft units and mark each one `ready`.
3. Make the animal pictures, bring them in and approve them (planned for Sprint 24, issue #252).
4. Publish the content packs to R2.

**What changed (Sprint 7):** the API no longer waits for a VPS. It runs on Vercel next to the web app, at `/api`, and the database is on Supabase. [vercel-supabase.md](vercel-supabase.md) has every step; Step 1 below is the short version.

Commands are for Windows, run from `C:\projects\trailbuddies`. Where cmd and PowerShell differ, both are shown.

---

## Step 0. Bring your copy up to date

PR #246 adds the review page and the picture commands this guide uses. Merge it on GitHub first, then run:

```bat
cd C:\projects\trailbuddies
git switch main
git pull
pnpm install
```

`pnpm install` also installs `sharp`, which `assets:import` uses to resize pictures.

---

## Step 1. Put the app on Vercel and Supabase

Follow [vercel-supabase.md](vercel-supabase.md). In short:

1. **Supabase:** a Pro project in **Central EU (Frankfurt)**. Save the transaction pooler (port 6543) and session pooler (port 5432) connection strings in the password manager.
2. **Tables:** run `alembic upgrade head` once from your PC with `TB_MIGRATE_DATABASE_URL` set to the session pooler. After that, GitHub Actions runs new migrations when you approve them.
3. **Vercel:** one project with Root Directory = the **repository root**. The root `vercel.json` defines the `web` and `api` services, the Frankfurt region (`fra1`) and the nightly cron job.
4. **Environment variables (Production):** the table in [vercel-supabase.md, Step 4b](vercel-supabase.md#4b-environment-variables), including:

   | Name | Value | Environments |
   |---|---|---|
   | `NEXT_PUBLIC_TB_CHANNEL` | `production` | Production only |
   | `TB_DATABASE_URL` | Supabase transaction pooler (port 6543) | Production |
   | `TB_MEDIA_BACKEND` and the `TB_S3_` values | R2 ([r2-setup.md](r2-setup.md)) | Production |

   Leave `NEXT_PUBLIC_TB_CHANNEL` unset for Preview, so previews show drafts for review and production hides them. `TB_API_URL` isn't needed: `/api/*` goes straight to the API.
5. **Check:** `https://<your domain>/api/health` shows `"status":"ok"`.

`NEXT_PUBLIC_` values are built into the app, so after changing one choose **Deployments → … → Redeploy**.

### Previews are for reviewing

- Every branch you push gets its own preview URL, and so does every pull request. Its `/review` page lists every unit, drafts included.
- Keep **Settings → Deployment Protection → Vercel Authentication** on for previews. Drafts are then only visible to people signed in to your Vercel team.
- Don't give previews the production database. See "Previews" in [vercel-supabase.md, Step 4b](vercel-supabase.md#4b-environment-variables).
- The Hobby plan is for non-commercial use. Move to Pro before charging families.

**Check it worked:**
- Open the production URL and go to Numbers Mountain in the demo. Units that aren't `ready` show as **coming soon**.
- On a preview URL, the same units are playable.

---

## Step 2. Review the 22 draft units

### Where to review

| Where | How |
|---|---|
| Your PC (fastest) | `pnpm dev`, then open http://localhost:3000/review |
| Anywhere, including a tablet | A Vercel preview URL + `/review` |

`/review` lists every unit with its status and how many of its pictures are approved. Each lesson button plays the lesson as a child would, but with no locks and nothing saved, then brings you back to the list.

Play each unit on a tablet-sized screen at least once. That's how most children will see it.

### What to check in every unit

- [ ] Every **fact** is true and kind. For example: "A tiger's stripes help it hide in long grass."
- [ ] Every **word and letter sound** matches how your children are taught. For example, letter sounds use "sss" for s and "a, like in apple".
- [ ] The **pictures** match the words. Colours and shapes are drawn in code; animals show emoji until Step 3.
- [ ] The **sorting groups** make sense. For example: farm animals by two or four legs, wild animals by grassland, river or forest.
- [ ] Each **lesson builds on the one before**, and the trophy feels fair.
- [ ] **Voice:** turn the sound on and listen to a few questions.

### The units

| Subject | Unit | Band | Pictures | Ready when |
|---|---|---|---|---|
| Numbers | number-shapes-0-10 · Number shapes 0 to 10 | Seedling | drawn | reviewed |
| Numbers | more-less-same · More, less, same | Seedling | drawn | reviewed |
| Numbers | numbers-11-20 · Numbers 11 to 20 | Sprout | drawn | reviewed |
| Language | letter-sounds-1 · Letter sounds: s a t p i n | Seedling | emoji | reviewed |
| Language | letter-sounds-2 · Letter sounds: m d g o c k | Sprout | emoji | reviewed |
| Language | upper-lower · Big and small letters | Sprout | emoji | reviewed |
| Language | blending-cvc · Blending c-a-t | Sprout | emoji | reviewed |
| Colours | red-yellow-blue · Red, yellow, blue | Seedling | drawn | reviewed |
| Colours | more-colours · More colours | Seedling | drawn | reviewed |
| Colours | colours-of-things · Colours of things | Seedling | emoji | reviewed |
| Colours | same-different-colour · Same and different | Seedling | drawn | reviewed |
| Colours | mixing-colours · Mixing colours | Sprout | drawn | reviewed |
| Shapes | circle-square-triangle · Circle, square, triangle | Seedling | drawn | reviewed |
| Shapes | more-shapes · More shapes | Seedling | drawn | reviewed |
| Shapes | big-small-shapes · Big and small shapes | Seedling | drawn | reviewed |
| Shapes | shapes-around-us · Shapes around us | Sprout | emoji | reviewed |
| Shapes | sides-and-corners · Sides and corners | Sprout | drawn | reviewed |
| Animals | animal-sounds · Animal sounds | Seedling | 8 to make | pictures approved |
| Animals | domestic-animals · Pets at home | Seedling | 6 to make | pictures approved |
| Animals | farm-animals · Farm animals | Seedling | 8 to make | pictures approved |
| Animals | animal-patterns · Stripes and spots | Seedling | 6 to make | pictures approved |
| Animals | wild-animals · Wild animals | Sprout | 8 to make | pictures approved |

### Fixing something

Edit the unit file in `packages\content\src\units\<subject>\<unit>.json`, for example a fact or a word, then run `pnpm content validate`. You can also tell me what's wrong and I'll change it.

### Marking a unit ready

```bat
pnpm content unit:ready numbers-11-20
pnpm content validate --prod
```

`unit:ready` sets the status in both the unit file and the catalogue. It refuses while any of the unit's pictures isn't approved, so the 17 units without pictures can go straight away and the animal units wait for Step 3.

`pnpm content unit:draft <unit>` takes a unit back.

When a batch is done, commit it on a branch and open a PR. Never push to main.

```bat
git switch -c content-review-1
git add packages/content
git commit -m "Content: mark reviewed units ready"
git push -u origin content-review-1
```

---

## Step 3. The 36 animal pictures

### Choose a tool

| | ChatGPT (image generation) | Midjourney |
|---|---|---|
| Who owns the pictures | You. OpenAI's terms assign the output to you. | You, on a paid plan. A company with over $1M a year in revenue needs Pro or Mega. |
| Privacy of what you make | Private to your account | Public in the Midjourney gallery unless you use Stealth (Pro or Mega). These are only animal pictures, so public is fine. |
| Keeping one style across 36 pictures | Generate one picture you like, then ask for each next one "in exactly the same style as the last image" | Use the first good picture as a style reference: `--sref <image URL>` |
| Plan | ChatGPT Plus is enough for 36 pictures | Basic is enough for 36 pictures |

Either works. Use one tool for all 36 pictures, so they match.

**Never upload a photo of a child**, or anything personal, to either tool. Ask only for animals, in the style below.

### The briefs

`packages\content\prompts\` has one sheet per unit, for example `farm-animals.md`. Each row has:
- **Asset id:** use it as the file name, for example `img-goat`.
- **Brief:** what to draw.

The style line at the top of each sheet is the same for every picture:

> Friendly flat illustration for children aged 3–8; soft rounded shapes; warm savanna palette (leaf green, sun yellow, sky blue, sand); thick soft outlines; single subject centred on a plain cream background; no text, no logos, no known characters; square.

**ChatGPT:** paste the style line once, then send each brief, for example "A goat, full body, facing three-quarters, looking friendly". Download each picture as PNG.

**Midjourney:** use one prompt per picture, for example:

```
A goat, full body, facing three-quarters, looking friendly. Friendly flat illustration for children aged 3-8, soft rounded shapes, warm savanna palette (leaf green, sun yellow, sky blue, sand), thick soft outlines, single subject centred on a plain cream background, no text --ar 1:1 --sref <URL of your first good picture>
```

Upscale and download each picture.

### Check each picture before you keep it

- [ ] It's clearly the animal named, with the right number of legs, ears and so on.
- [ ] Nothing scary, no text or letters, no watermark.
- [ ] It doesn't look like a known cartoon character.
- [ ] It's in the same style as the others.

### Bring them in

1. Put all the pictures in one folder, for example `C:\art\animals`. Name each file after its asset id, for example `img-goat.png` or `img-farm-cow.png`.
2. Import them, recording which tool's terms they're under:

   ```bat
   pnpm content assets:import C:\art\animals --license "ChatGPT image generation: output owned by Trailbuddies under OpenAI's terms of use"
   ```
   For Midjourney, use `--license "Midjourney paid plan: assets owned by Trailbuddies under Midjourney's terms of service"`.

   Each picture becomes a square 512 px WebP with no metadata, in `apps\web\public\art\units\animals\...`, marked `reviewed`. Files it can't match to an asset are listed so you can rename them.
3. Run `pnpm dev`, open http://localhost:3000/review, and play each animal unit. Reviewed pictures show in development and previews.
4. When a unit's pictures look right, approve them and mark the unit ready:

   ```bat
   pnpm content assets:approve farm-animals
   pnpm content unit:ready farm-animals
   pnpm content validate --prod
   ```
5. Commit on a branch and open a PR, as in Step 2.

---

## Step 4. Publish the content packs to R2

Packs let new or updated lessons reach devices without an app release. They only include `ready` units, so publish after Steps 2 and 3, and again whenever units change.

Publish from your PC straight to R2. Devices fetch the packs through `https://<your domain>/api/content/...`.

### 4a. Build the packs

```bat
pnpm content packs:build --channel production --release 2027.02.1
```

Use a new release number each time, for example `2027.02.2`.

If this fails with "can't include unapproved assets", a `ready` unit still has a picture that isn't approved. Step 3 fixes that.

### 4b. Upload them

The upload uses the R2 settings from `docs/r2-setup.md`. Take the keys from the password manager, and type them into the terminal for this session only. Never put them in a file in the repo.

**PowerShell**

```powershell
cd services\api
.venv\Scripts\Activate.ps1
$env:TB_ENV = "production"
$env:TB_MEDIA_BACKEND = "s3"
$env:TB_S3_ENDPOINT = "https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
$env:TB_S3_PUBLIC_ENDPOINT = $env:TB_S3_ENDPOINT
$env:TB_S3_BUCKET = "trailbuddies-media"
$env:TB_S3_REGION = "auto"
$env:TB_S3_ACCESS_KEY = "<from the password manager>"
$env:TB_S3_SECRET_KEY = "<from the password manager>"
python -m app.packs publish ..\..\packages\content\dist\packs
```

**cmd**

```bat
cd services\api
.venv\Scripts\activate
set TB_ENV=production
set TB_MEDIA_BACKEND=s3
set TB_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
set TB_S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
set TB_S3_BUCKET=trailbuddies-media
set TB_S3_REGION=auto
set TB_S3_ACCESS_KEY=<from the password manager>
set TB_S3_SECRET_KEY=<from the password manager>
python -m app.packs publish ..\..\packages\content\dist\packs
```

- With the EU jurisdiction, the endpoint has `.eu` in it: `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`.
- No `.venv` yet? Make one first: `py -3.12 -m venv .venv`, activate it, then `pip install -r requirements.txt`.
- `TB_ENV=production` tells the API the bucket already exists, so it doesn't try to create it.

You should see one `uploaded <subject>.<hash>.json` line per subject, then `uploaded manifest-production.json` and `✓ published`. In the Cloudflare dashboard, **R2 → trailbuddies-media** now has a `packs/` folder.

Close the terminal afterwards so the keys don't linger.

### 4c. Check it from a device

1. Open `https://<your domain>/api/content/manifest?channel=production`. It should list your packs and release.
2. Sign in on a device, open **Settings → Play without internet**, and tap **Download now**. Each subject shows ✓.

---

## Order at a glance

1. Merge #246, then `git pull` and `pnpm install`.
2. Supabase (Frankfurt) and Vercel (Root Directory = repository root), as in [vercel-supabase.md](vercel-supabase.md).
3. Review the 17 units without pictures, run `unit:ready` on each, then open a PR.
4. Make the 36 animal pictures, then `assets:import`, check them in `/review`, `assets:approve` and `unit:ready`, then open a PR.
5. Run `packs:build` and `app.packs publish` to R2.
6. Check `/api/content/manifest` and **Download now** on a device.

## Sources

- [Midjourney terms of service](https://docs.midjourney.com/docs/terms-of-service)
- [OpenAI terms of use](https://openai.com/en-GB/policies/row-terms-of-use/)
