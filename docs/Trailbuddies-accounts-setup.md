# Trailbuddies: Account Setup Guide

**Step 3 of the development plan: set up the accounts**

Work through the sections **in order (a → f)**, because each one depends on the one before. Tick each box as you go.

> **Secrets rule:** Keep every password, API key, token and DSN in your password manager.
> **Never paste any of them into a chat, issue, commit or Slack message.** When a step is done, just say "step X is done". For the VPS step, the IP address is the only thing to share.

---

## Overview

| Step | Service | What you get | Cost | Depends on |
|---|---|---|---|---|
| a | Domain registrar | `yourdomain` | ~registrar price/yr | — |
| b | Cloudflare | DNS + R2 storage buckets | Free (card needed for R2) | a |
| c | Hetzner Cloud | VPS for the API | ~€20/mo + ~20% backups | b (for DNS) |
| d | Vercel | Web app hosting + PR previews | Free (Hobby) → $20/mo Pro | b (for DNS) |
| e | Sentry | Error reports | Free (Developer) | — |
| f | GitHub | Automatic deploys to staging | Free | c + server script |

### Addresses you'll end up with

| Address | Points to | Set up in |
|---|---|---|
| `app.yourdomain` | Vercel (the web app) | Step d |
| `api.yourdomain` | VPS (the API) | Step c |
| `staging-api.yourdomain` | VPS (test copy of the API) | Step c |
| `media.yourdomain` | Cloudflare R2 (content packs) | Configured later by Claude |

---

## a. Domain

- [ ] **Choose the domain.** `trailbuddies.africa` is the placeholder used throughout the plan.
- [ ] **Check availability** at a registrar.
- [ ] **Do a quick trademark search before paying**, because *Trailbuddies* is still a working name. Check at least:
  - Kenya: KIPI (Kenya Industrial Property Institute) trademark search
  - International: WIPO Global Brand Database
  - Any other market you plan to launch in
- [ ] **Register it** with any registrar.
  - `.co.ke` names must go through a **KENIC-accredited registrar**.
  - Turn on auto-renew and registrar lock, and use an email address you'll keep long term.
- [ ] Save the registrar login in your password manager.

**Done when:** you own the domain and can log in to the registrar.

---

## b. Cloudflare (DNS and R2 storage)

### DNS
- [ ] Create a free account at **cloudflare.com** and turn on two-factor authentication.
- [ ] **Add your domain** (Add a site → Free plan).
- [ ] Cloudflare shows **two nameservers**. Copy them and set them at your registrar, replacing the registrar's own.
- [ ] Wait for Cloudflare to show the domain as **Active**. This can take a few hours.

### R2 storage
- [ ] Go to **R2 → Enable R2**. It asks for a card even on the free allowance (10 GB free, no download/egress fees).
- [ ] Create **two buckets**. Leave both **private**:
  - [ ] `trailbuddies-staging`
  - [ ] `trailbuddies-prod`
- [ ] Go to **R2 → Manage API tokens → Create API token**:
  - Permission: **Object Read & Write**
  - Scope: **only** the two buckets above
- [ ] Save these in your password manager. Cloudflare shows the secret **only once**:
  - [ ] Access key ID
  - [ ] Secret access key
  - [ ] Account ID

**Done when:** the domain is Active in Cloudflare, both buckets exist, and the R2 token is saved.

---

## c. VPS (Hetzner Cloud)

### Account and project
- [ ] Create an account at **hetzner.com/cloud** and turn on two-factor authentication. New accounts may need ID verification.
- [ ] Create a **project** called `Trailbuddies`.

### SSH key (on your Windows PC)
- [ ] Open **PowerShell** and run:
  ```powershell
  ssh-keygen -t ed25519 -C "steve-trailbuddies"
  ```
  - Press **Enter** to accept the default file location.
  - **Add a passphrase** when prompted, and save it in your password manager.
- [ ] Show the **public** key and copy it:
  ```powershell
  Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
  ```
  > Only ever copy the **`.pub`** file. `id_ed25519` (no extension) is your private key and never leaves your computer.
- [ ] In Hetzner: **Security → SSH keys → Add SSH key**, then paste the public key.

### Create the server
- [ ] **Add Server** with:
  - [ ] Image: **Ubuntu 24.04**
  - [ ] Location: an **EU location** (e.g. Falkenstein, Nuremberg or Helsinki)
  - [ ] Type: **CPX22** (about €20/month)
  - [ ] SSH key: **your key selected** (no root password)
  - [ ] **Backups: ON** (adds about 20%)
- [ ] **Firewall** (Firewalls → Create firewall), inbound rules allowing **only**:
  | Protocol | Port | Purpose |
  |---|---|---|
  | TCP | 22 | SSH |
  | TCP | 80 | HTTP (certificate issuing / redirect) |
  | TCP | 443 | HTTPS |
  Apply it to the server.

### Point DNS at the server
- [ ] Copy the server's **IPv4 address**.
- [ ] In **Cloudflare → DNS → Records**, add:
  | Type | Name | Content | Proxy status |
  |---|---|---|---|
  | A | `api` | server IP | **DNS only (grey cloud)** |
  | A | `staging-api` | server IP | **DNS only (grey cloud)** |

  Grey cloud lets the server get its own HTTPS certificate.

### ⛔ Stop here
- [ ] **Send Claude the server's IP address** (that's the only thing to share).
- Claude then writes **`infra/vps-setup.sh`**, a single script that:
  - locks down SSH
  - turns on automatic security updates
  - installs Docker
  - creates a `deploy` user and prints a separate deploy key

Carry on with **d** and **e** while you wait. **f** needs the script to have run.

---

## d. Vercel (web app hosting)

- [ ] Sign up at **vercel.com** with **Continue with GitHub**.
- [ ] **Add New → Project**, then import **`SGGaita/trailbuddies`**. Grant Vercel access to that repo if asked.
- [ ] **Root Directory:** `apps/web`. The framework should be detected as **Next.js**.
- [ ] **Environment variables:**
  | Name | Value | Why |
  |---|---|---|
  | `NEXT_TELEMETRY_DISABLED` | `1` | No Next.js telemetry |
  | `ENABLE_EXPERIMENTAL_COREPACK` | `1` | Vercel uses the same pnpm version as the repo |
- [ ] Click **Deploy**. From now on every pull request gets its own **preview link** automatically.
- [ ] **Settings → Domains**, add `app.yourdomain`, then add the DNS record Vercel shows in **Cloudflare DNS**. Set it to **DNS only (grey cloud)** unless Vercel says otherwise.

> **Plan note:** The free **Hobby** plan is fine for development and the closed beta. **Switch to Pro (about $20/month) before you charge any customers**, because Hobby doesn't allow commercial use.

**Done when:** `https://app.yourdomain` loads the web app.

---

## e. Sentry (error reports)

- [ ] Sign up at **sentry.io** (free **Developer** plan) and turn on two-factor authentication.
- [ ] Create **two projects**:
  - [ ] `trailbuddies-web` (platform: **Next.js**)
  - [ ] `trailbuddies-api` (platform: **FastAPI**)
- [ ] **Settings → Security & Privacy** (organization level):
  - [ ] **Data Scrubber**: ON
  - [ ] **Use Default Scrubbers**: ON
  - [ ] **Prevent Storing of IP Addresses**: ON
- [ ] **Do NOT turn on Session Replay.** It records what's on screen, which here means children using the app. It stays off in the code too.
- [ ] Save each project's **DSN** in your password manager.

Claude wires Sentry in during a sprint, with child data stripped from every report.

---

## f. Switch on deploys (after `infra/vps-setup.sh` has run)

- [ ] **Prerequisite:** you've run `infra/vps-setup.sh` on the server and it printed the deploy user and deploy key.
- [ ] GitHub repo → **Settings → Environments → New environment**, name it `staging`.
- [ ] **Settings → Secrets and variables → Actions → Secrets → New repository secret**, add:
  | Secret | Value |
  |---|---|
  | `VPS_HOST` | the server IP |
  | `VPS_USER` | the deploy user the script created |
  | `VPS_SSH_KEY` | the **separate deploy key the script prints** (not your personal key) |
- [ ] **Variables tab → New repository variable**:
  | Variable | Value |
  |---|---|
  | `DEPLOY_ENABLED` | `true` |

**Result:** every merge to `main` builds the API and deploys it to **staging** (`staging-api.yourdomain`).

---

## Password manager checklist

Make one entry (or folder) per service. Store the **values only in the password manager**.

| Service | Items to store |
|---|---|
| Registrar | Login, 2FA recovery codes |
| Cloudflare | Login, 2FA recovery codes, R2 access key ID, R2 secret, Account ID |
| Hetzner | Login, 2FA recovery codes, SSH key passphrase |
| Vercel | (GitHub login) |
| Sentry | Login, 2FA recovery codes, DSN for `trailbuddies-web`, DSN for `trailbuddies-api` |
| GitHub | Deploy key (also stored as `VPS_SSH_KEY`) |

## Progress tracker

| Step | Status | Date | Notes (no secrets) |
|---|---|---|---|
| a. Domain | ☐ | | |
| b. Cloudflare | ☐ | | |
| c. VPS (IP sent to Claude) | ☐ | | |
| d. Vercel | ☐ | | |
| e. Sentry | ☐ | | |
| f. Deploys on | ☐ | | |
