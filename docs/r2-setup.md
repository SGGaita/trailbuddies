# Cloudflare R2 setup for photos and voice clips

Trailbuddies keeps grown-ups' photos and voice clips (Lesson Builder, Sprint 5) in an S3-compatible bucket. Locally that's MinIO in Docker. In production it's **Cloudflare R2**.

This guide lists what to create in R2, what to copy into the server's settings and how to check it works.

**How it works.** The browser never sees an R2 key. The API hands out short-lived (15 minute) presigned links:
1. The browser uploads the file directly to R2 with a presigned `PUT`.
2. The API reads it back, checks it (type, size, no GPS data in photos) and marks it ready.
3. Pictures and clips are shown through presigned `GET` links.

Objects stay private. Nothing is ever public.

---

## What you need from R2 (checklist)

| # | Item | Where it goes |
|---|---|---|
| 1 | Your Cloudflare **Account ID** | Part of the endpoint URL |
| 2 | A private bucket named **`trailbuddies-media`** | `TB_S3_BUCKET` |
| 3 | An R2 API token's **Access Key ID** | `TB_S3_ACCESS_KEY` |
| 4 | The same token's **Secret Access Key** (shown once) | `TB_S3_SECRET_KEY` |
| 5 | A **CORS policy** on the bucket for your web app's address | Set in the R2 dashboard |
| 6 | A long random **media secret** (made by you, not by R2) | `TB_MEDIA_SECRET` |

Store items 3, 4 and 6 in the password manager straight away. Never paste them into chat, issues, commits or Slack.

---

## Step 1: Turn on R2 and note your Account ID

1. Sign in to the Cloudflare dashboard and open **R2 Object Storage**.
2. If asked, subscribe to R2. The free tier needs a payment method on file but costs nothing at our size: 10 GB of storage plus generous monthly request limits, with no egress fees.
3. On the R2 **Overview** page, copy your **Account ID**. Your endpoint is:
   ```
   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```

## Step 2: Create the bucket

1. **R2 → Create bucket**.
2. **Name:** `trailbuddies-media`.
3. **Location:** our VPS is in the EU (ADR 0003). Either choose the **EU jurisdiction**, which keeps data in the EU, or give a **Location hint** of Western or Eastern Europe.
   - The jurisdiction can't be changed later.
   - The EU jurisdiction changes the endpoint to `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`.
4. **Storage class:** Standard.
5. Create it.

Then, in the bucket's **Settings**, keep it private:
- **Public access / r2.dev subdomain:** leave **disabled**.
- **Custom domains:** none.

Children's family photos must only ever be reached through the API's short-lived links.

The API does **not** create the bucket in production (`TB_ENV=production`). It must exist before the first upload.

## Step 3: Create an API token for the API

1. **R2 → Overview → Manage R2 API tokens → Create API token**. Name it something like `trailbuddies-api-prod`.
2. **Permissions:** **Object Read & Write**. This is enough: the API only puts, gets and deletes objects.
3. **Specify bucket(s):** apply to **`trailbuddies-media` only**.
4. **TTL:** forever, or a date you'll remember to rotate it.
5. **Client IP filtering:** optional. You can limit the token to the VPS's IP address.
6. Create it, then copy into the password manager:
   - **Access Key ID** → `TB_S3_ACCESS_KEY`
   - **Secret Access Key** → `TB_S3_SECRET_KEY` (Cloudflare shows it only once)

Ignore the "Token value" shown alongside: that's for Cloudflare's own API, not S3.

## Step 4: Add the CORS policy

Browsers upload straight to R2, so the bucket must allow your web app's address. Without this rule, uploads fail with a CORS error in the browser console. They stay waiting on the device, and the "items waiting to upload" banner appears.

1. **R2 → `trailbuddies-media` → Settings → CORS policy → Add CORS policy → JSON**.
2. Paste the policy below, using your real web addresses. Origins are scheme and host only, with no path and no trailing slash. List each one separately: wildcards aren't allowed in ports.

```json
[
  {
    "AllowedOrigins": [
      "https://YOUR-WEB-DOMAIN",
      "https://www.YOUR-WEB-DOMAIN"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

- `YOUR-WEB-DOMAIN` is where the web app runs: your Vercel domain, or the custom domain that points at it. It must match `TB_WEB_URL` on the server.
- To test Vercel **preview** deployments against production storage, add the exact preview URL. A better option is a separate staging bucket (see "Staging" below).
- Don't add `http://localhost:3000` to the production bucket. Local development uses MinIO.

## Step 5: Make the media secret

The API signs some links itself, and it refuses to start in production with the default secret. Generate a long random value on any computer:

| Shell | Command |
|---|---|
| PowerShell | `[Convert]::ToBase64String((1..48 \| ForEach-Object { Get-Random -Maximum 256 }))` |
| bash (VPS) | `openssl rand -base64 48` |

Save it in the password manager as `TB_MEDIA_SECRET`.

## Step 6: Configure the API on the VPS

Add these lines to `infra/.env` **on the VPS only**, never in git:

```ini
TB_ENV=production
TB_MEDIA_BACKEND=s3
TB_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
TB_S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
TB_S3_BUCKET=trailbuddies-media
TB_S3_REGION=auto
TB_S3_ACCESS_KEY=<Access Key ID from the password manager>
TB_S3_SECRET_KEY=<Secret Access Key from the password manager>
TB_MEDIA_SECRET=<the long random value>
```

- `TB_S3_ENDPOINT` and `TB_S3_PUBLIC_ENDPOINT` are the same for R2. They only differ locally, where the API reaches MinIO at `http://minio:9000` but the browser uses `http://localhost:9000`.
- With the EU jurisdiction, use `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com` for both.
- `TB_S3_REGION` must be `auto` for R2.
- Don't start the `minio` service on the VPS.

Restart the API and worker so they read the new values:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env --profile prod up -d api worker
docker compose -f infra/docker-compose.yml --env-file infra/.env --profile prod logs --tail 50 api
```

## Step 7: Check it works

1. Sign in on the live web app and open **Grown-ups → Create → Add a card → Photo**.
2. Allow photos when asked, then pick a photo.
3. You should see **"Ready · location data removed"**, and no "waiting to upload" banner after you save.
4. In the R2 dashboard, the bucket should now hold an object under `media/…`.
5. Record a short voice clip on a card and play it back.

If something fails, see the troubleshooting table.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Browser console: "blocked by CORS policy" on `*.r2.cloudflarestorage.com` | The CORS policy is missing, or its origin doesn't match the address in the address bar exactly (`https`, `www`, no trailing slash). |
| Upload returns **403 SignatureDoesNotMatch** | Wrong secret key, or the endpoint has the bucket name in it. The endpoint is just `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. |
| **403 AccessDenied** | The token isn't Object Read & Write, or isn't applied to `trailbuddies-media`. |
| **NoSuchBucket** | The bucket name in `TB_S3_BUCKET` doesn't match, or the bucket was made in a different jurisdiction from the endpoint (EU bucket with the non-EU endpoint, or the other way round). |
| API won't start: "TB_MEDIA_SECRET must be set in production" | Set `TB_MEDIA_SECRET` (Step 5). |
| Photos stay "waiting to upload" | Open the browser's network tab. Usually it's CORS (above). Press **Retry** on the banner after fixing it. |
| A photo is rejected for location data | Working as intended (SAF-02): the server refuses photos that still carry GPS data. The app strips it first, so this only happens with a modified client. |

## Staging (when you add it)

Make a second bucket, `trailbuddies-media-staging`, with its own token scoped to that bucket and its own CORS origins (the staging web address and Vercel preview URLs). Point the staging API's `TB_S3_BUCKET` and keys at it. Never let staging and production share a bucket or a token.

## Housekeeping

- **Rotate** the token yearly, or straight away if it might have leaked:
  1. Create a new token.
  2. Update `infra/.env` on the VPS.
  3. Restart the api and worker.
  4. Delete the old token.
- **Costs:** watch R2 → Overview → Metrics. Photos are under 2 MB and clips under 1 MB, so the 10 GB free tier holds thousands of cards.
- **Deleting data:** when a card or family is deleted, the API deletes the object too. Never edit or delete objects by hand in the dashboard.
- **Backups:** the photos are the family's own copies and also live on their devices. If you later want R2 backups, use a second bucket with a separate read-only token.

## Sources

- [R2 CORS configuration](https://developers.cloudflare.com/r2/buckets/cors)
- [Using R2 with the AWS SDK](https://developers.cloudflare.com/r2/examples/aws-sdk-js-v3)
