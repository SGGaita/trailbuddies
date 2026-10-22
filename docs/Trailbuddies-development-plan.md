# Trailbuddies: Development Plan
### From concept to MVP in ~4 months, then classroom, Android app and public launch

*Prepared 21 October 2026 for Steve Gaita. Updated 22 October 2026 with the device and platform matrix (§3.4) agreed after the interactive prototype. Companion to `Trailbuddies-concept-report.md`. Assumes a start date of **Monday 2 November 2026**.*

---

## 1. Summary

| | |
|---|---|
| **Team** | One developer working with Claude; contractors for buddy art and voice |
| **Codebase** | New monorepo, porting Martha's Learning Corner (PWA shell, phonics, planets, recorder) and Chipuka (domain logic, path layout, exercise types, data model) |
| **Clients** | **Next.js web app + PWA first** (MVP), then a **React Native CLI app** (bare, not Expo) for Android, iOS later |
| **Devices** | Learner app: tablet, phone and web · Parent app: phone, tablet and web · Teacher: web and tablet · School admin and safety: web (§3.4) |
| **Back end** | Python FastAPI + PostgreSQL |
| **Hosting** | Hybrid: managed (Vercel for the web app, Cloudflare R2 for media and content packs) + self-run (one VPS with Docker Compose for API, Postgres and workers) |
| **Assets** | Mixed and AI-assisted: licensed illustration packs + AI-assisted illustrations in a fixed style (human-reviewed) + commissioned buddy art + AI voice for drafts, a voice actor or licensed AI voice for final buddy lines |
| **Timeline** | **MVP closed beta: ~1 March 2027** (16 weeks incl. a holiday break) · Classroom beta: ~end of April 2027 · Android app: ~end of July 2027 · Public launch: ~November 2027 |
| **Budget (cash, excluding your time)** | MVP period: **~$1,500–4,500** · First 12 months: **~$6,000–16,000** (§12) |

**Change from the concept report:** §11.1 of the concept report recommended a PWA wrapped with Capacitor. This plan follows your decision instead: **Next.js web/PWA plus a React Native CLI app**, sharing all non-UI logic through monorepo packages. The concept report has been updated to match.

---

## 2. Guiding rules for a solo build

1. **Web first, one subject end to end before breadth.** Prove the whole loop (onboarding → trail → lesson → reward → parent view) on Numbers before adding subjects.
2. **Content is data, not code.** Every unit is a JSON file validated against a schema. Adding a subject should need no new code, only content and assets.
3. **Shared logic lives in packages.** Anything that isn't a screen (lesson generation, difficulty, rewards, badge rules, sync) is pure JS in `packages/`, tested once and used by both web and React Native.
4. **Claude writes most of the code and drafts most of the content; you decide, review and test with real children.** (§11)
5. **Ship something usable every sprint** (on staging), and put it in front of 2–3 children every two weeks.
6. **Cut scope, never quality on child safety.** Consent, privacy and safe uploads are in the MVP, not "later".
7. **Responsive from day one.** Every screen is built for all the devices its app supports (§3.4); layouts are chosen by breakpoint, not by separate apps.

---

## 3. MVP scope

### 3.1 In the MVP (web/PWA, closed beta)
- **Onboarding:** parent sign-up (email magic link + Google), consent, add multiple learner profiles (birth month/year, avatar), interests, family settings, hand-over to the child (concept report §4.3)
- **1 buddy** (picked at onboarding; the choose-a-buddy screen is built for 4, with the other 3 "coming soon")
- **5 subjects, first units only:** Numbers, Language (alphabet/phonics), Animals, Colours, Shapes. **~25 units / ~150 lessons**, 🌱 Seedling and 🌿 Sprout bands
- **World map + winding subject trail**, unit checkpoints
- **10 exercise types:** listen & tap, match pairs, count, name it, compare, sequence, sort into bins, odd one out, case-match, build a word
- **Games:** jigsaw (including from a parent's photo) and memory flip
- **Rewards:** stars, treasures wallet, Buddy Shop (outfits), 15 built-in badges, celebrations
- **Adaptive difficulty, mastery and review lessons**
- **Lesson Builder v1:** cards with photo upload or camera, voice recording, 3 templates (Learn the names, Sort them, Picture puzzle), preview as child, assign to children
- **Parent dashboard:** progress per child, weak items, weekly activity, screen-time limits
- **Offline:** installable PWA, offline play of downloaded subjects, background sync
- **Safety and privacy:** parent gate/PIN, EXIF removal, privacy policy, data export and delete
- **Responsive layouts:** learner app on tablet (primary), phone and laptop browser; parent app on phone (primary), tablet and desktop web (§3.4)

### 3.2 Deliberately not in the MVP
Teachers and classes · Badge Studio (custom badges) · share codes · React Native app · payments · Treasure Room and sticker albums · custom trails · 🌳 and higher bands · remaining subjects · AI features · iOS.

### 3.3 MVP definition of done
A parent in the beta installs the PWA on an Android tablet, creates profiles for two children and goes offline. Each child picks the buddy, plays Numbers and Animals lessons, earns stars, treasures and a badge, and buys a buddy outfit. Back online, progress syncs to the parent's phone. The parent builds an "Our Pets" lesson with their own photos and voice, turns a photo into a jigsaw, and sees on the dashboard that both children played it. The same child profile also plays a lesson on a phone and in a laptop browser, and the parent checks progress on desktop web. There are no P1 bugs, Lighthouse PWA checks pass, and every domain package has ≥80% unit-test coverage.

### 3.4 Device and platform matrix

One Next.js codebase serves every web device; layouts switch at breakpoints. The React Native app (Phase 3) reuses the same layout rules for phone and tablet.

| App | Primary | Also supported | Web/PWA (MVP) | Android app (Phase 3) | iOS (Phase 5) |
|---|---|---|---|---|---|
| **Learner** (children 3+, teens, adults) | Tablet, landscape | Phone (portrait), laptop/desktop browser | ✅ all three | ✅ tablet + phone | ✅ |
| **Parent** | Phone | Tablet (portrait), desktop web | ✅ all three | ✅ phone + tablet | ✅ |
| **Teacher** | Desktop web | Tablet (landscape, for walking the classroom) | ✅ both (Phase 2) | Later, if pilots ask | — |
| **School admin & safety team** | Desktop web | — | ✅ (Phase 2) | — | — |

**How each app adapts (as shown in the prototype):**

| App · device | Layout |
|---|---|
| Learner · tablet | World map of islands with a side bar (Games, Shop, Room, Badges, Wishes); trail with a side panel; answer tiles in a row |
| Learner · phone | Compact top bar (avatar, stars, treasures, grown-up lock); the map becomes a scrolling list of island cards; bottom tab bar (Map, Games, Shop, Room, Badges, Wishes); a narrower trail with a "Next lesson" bar; answers in 2-column tiles; pictures and buddy scaled for the smaller screen; jigsaw, treasure room and tracing resized |
| Learner · web | The tablet layout inside the browser; **keyboard play** (1, 2, 3… to answer, Space to hear the prompt again); class sign-in for computer labs; teens and adults keep the dark "Explorer" look |
| Parent · phone | Bottom tabs (Home, Progress, Create, Rewards, Settings); single column |
| Parent · tablet | Side rail with icon + label; content column up to 720 px; dashboards in 2 columns |
| Parent · web | Full sidebar with family name and plan; Home shows all children side by side; wider forms; sign-up and onboarding as a centred card |
| Teacher · web | Sidebar navigation; tables and heatmap at full width |
| Teacher · tablet | Icon rail instead of the sidebar, larger touch targets, compact tables |

**Breakpoints (MUI):** `xs` < 600 px phone layout · `sm`–`md` 600–1199 px tablet layout · `lg` ≥ 1200 px desktop layout. Orientation decides learner phone (portrait list) vs tablet (landscape map).

**Rules:**
- Touch targets ≥ 48 px everywhere; ≥ 64 px for children under 6 on phone.
- Every child action works by touch, mouse and keyboard (web); no hover-only actions.
- The learner map and trail are data-driven, so the same unit data renders as a map (tablet/web) or a list (phone).
- Playwright runs the critical flows (§9.3) at three viewports: 390 × 844 (phone), 1180 × 820 (tablet), 1440 × 900 (desktop).

---

## 4. Architecture for the build

### 4.1 Monorepo

**Tooling:** pnpm workspaces + Turborepo; JavaScript with JSDoc types (no TypeScript); ESLint + Prettier shared config.

```
trailbuddies/
  CLAUDE.md                    conventions for Claude (§11)
  apps/
    web/                       Next.js (App Router) + MUI: child app, grown-up zone, (later) teacher dashboard; PWA service worker
    mobile/                    React Native CLI (bare) app: added in Phase 3
  packages/
    domain/                    lesson generator, exercise specs, difficulty, mastery + spaced review,
                               trail/path layout, reward economy, badge rule engine (pure JS)
    content-schema/            JSON Schemas (item, unit, lesson, trail, badge, buddy-script) + validator (Ajv)
    content/                   built-in content packs: /subjects/<subject>/<unit>.json + asset manifests
    i18n/                      UI strings and buddy script tables (en first)
    tokens/                    design tokens (colours, type scale, spacing, radii, breakpoints), consumed by the MUI theme and the RN theme
    sync/                      outbox, event model, sync client, storage-adapter interface
    api-client/                typed-by-JSDoc fetch client for the FastAPI endpoints
  services/
    api/                       FastAPI app (routers: auth, families, learners, content, sync, media, sharing)
    worker/                    background jobs: media processing, digests, cleanup (RQ or Arq on Redis)
  infra/
    docker-compose.yml         api, worker, postgres, redis, caddy (TLS)
    backups/                   pg_dump → R2 scripts
  tools/
    content-cli/               validate content, build packs, generate asset prompt sheets, audio normalise
  docs/                        ADRs, runbooks, privacy notes
```

**React Native in a pnpm monorepo:** set `node-linker=hoisted` for React Native compatibility, add Metro `watchFolders` for `packages/*`, and keep **React on the same version in web and mobile** (pin it in the root, aligned to what the current React Native release requires). Doing this setup once in Phase 3 avoids the classic "duplicate React" errors.

### 4.2 Stack per part

| Part | Choice |
|---|---|
| Web app | Next.js (current major), App Router, JS, **MUI** (responsive breakpoints from `tokens`, §3.4); Baloo 2 + Nunito bundled; SVG + CSS animations, Lottie for buddy animations |
| Web offline storage | IndexedDB via **Dexie**, behind the `sync` storage-adapter interface |
| PWA | Custom service worker generated at build time (Martha's approach) + per-subject content-pack caching |
| Mobile app (Phase 3) | **React Native CLI (bare)**, React Navigation, Zustand, **op-sqlite** storage adapter, react-native-svg, Reanimated + Gesture Handler, react-native-audio-recorder-player, react-native-image-picker, react-native-fs (media cache); **React Native Paper** themed from `tokens` so it looks like the MUI web app; phone and tablet layouts follow §3.4 |
| State (both) | Zustand stores over the shared domain functions |
| API | FastAPI, Pydantic, SQLAlchemy 2 + Alembic, Uvicorn behind Caddy |
| Database | PostgreSQL 16+ (on the VPS, nightly + hourly WAL-style backups to R2) |
| Jobs | Redis + Arq (or RQ) worker |
| Media | Cloudflare R2 (S3-compatible) with presigned uploads; images resized and EXIF-stripped on the client, re-checked server-side |
| Auth | Grown-ups: email magic link (Resend or Postmark) + Google sign-in; signed JWT access + refresh tokens; learners are profiles |
| Monitoring | Sentry (web, API, mobile), child data scrubbed; Uptime Kuma or Better Stack free tier for uptime |
| Analytics | First-party event table in Postgres (aggregated dashboards); no third-party analytics SDKs |

### 4.3 Data and sync (decided now so both apps fit)
- **Progress is an append-only event log** (`lesson_completed`, `item_answered`, `treasure_earned`, `treasure_spent`, `badge_awarded`). Events are written to the local outbox first and sent to `POST /sync/events` in batches. The server replies with events from other devices since the last sync cursor.
- **Derived state** (stars, mastery, wallet balance) is recomputed from events by `domain` functions, so web and mobile always agree.
- **Grown-up-edited records** (profiles, custom lessons, settings) use last-write-wins with server timestamps.
- **Stable IDs everywhere** (ULIDs generated on the device), so offline-created content never collides.

### 4.4 Environments

| Env | Web | API + DB | Media | Purpose |
|---|---|---|---|---|
| Local | `pnpm dev` | Docker Compose | MinIO or R2 dev bucket | Development |
| Preview | Vercel preview per PR | Staging API | Staging bucket | Review each change |
| Staging | `staging.` domain on Vercel | VPS (staging Compose project) | Staging bucket | Kid playtests, beta candidates |
| Production | Vercel (Pro) | VPS (prod Compose project) | Prod bucket + CDN | Beta and live users |

### 4.5 Hosting: the hybrid set-up
- **Managed:** Vercel for the Next.js app (previews and edge caching for free, no server to look after); Cloudflare R2 for media and content packs (no egress fees, which matters for audio and images).
- **Self-run:** one VPS (e.g. a Hetzner 4–8 GB plan, EU region) running API, worker, Postgres and Redis with Docker Compose and Caddy for TLS. Staging runs as a second Compose project on the same box until there are paying users.
- **When to upgrade:** move Postgres to a managed service (e.g. Neon or Supabase) when backups and uptime start taking more than an hour a month, or at ~1,000 weekly active families.

---

## 5. Asset production pipeline (runs in parallel with development)

| Asset | Source | Process |
|---|---|---|
| **Style guide** | You + Claude (Sprint 0) | Palette (from `tokens`), line weight, shapes, 10 reference images; written into a prompt template for AI image tools |
| **Item illustrations** (~600 for the MVP's 25 units) | Licensed packs where they fit + **AI-assisted** generation in the style guide | Claude generates a prompt sheet per unit from the content JSON (`tools/content-cli assets:prompts`) → generate → **human review** (accuracy, inclusivity, style match, no recognisable characters or brands) → clean up → export WebP/SVG → manifest. Export at sizes that stay sharp on tablet and stay light on phone |
| **Buddy art** (1 for the MVP, 4 for launch) | **Commissioned** illustrator/animator | Character sheet, 12 poses, 6 expressions, Lottie animations (idle, talk, cheer, think, sad-but-kind, dance) |
| **Buddy voice lines** (~400 per buddy) | AI voice (e.g. ElevenLabs, commercial licence) for drafts; **voice actor or licensed AI voice** for final lines | Script table in `i18n` → batch generate → loudness-normalise (`content-cli audio:normalise`) → listen-through review |
| **Content words** (item names, questions) | Device TTS during development; AI voice pack for beta | Generated from content JSON; parents' recordings override |
| **Sound effects** | Licensed royalty-free packs (CC0 or purchased) | Curated set of ~40 |

**Rules for AI-assisted assets:**
- Use only tools whose terms grant commercial rights.
- Never imitate a known character, artist's style or brand.
- No real children's likenesses.
- Never clone a real person's voice without their written consent.
- Every asset carries a `review_status` (draft → reviewed → approved) in its manifest. CI blocks production builds that contain unapproved assets.

---

## 6. Timeline overview

| Phase | Dates (approx.) | Sprints | Outcome |
|---|---|---|---|
| **1. MVP** | 2 Nov 2026 – 26 Feb 2027 | S0–S7 (+ holiday break 24 Dec–3 Jan) | Closed beta on web/PWA (tablet, phone, desktop) with 15–30 families |
| **2. Beta iteration + Classroom** | 1 Mar – 23 Apr 2027 | S8–S11 | Teachers (web + tablet), classes, assignments, Badge Studio, share codes; 3–5 pilot classrooms |
| **3. React Native Android app** | 26 Apr – 30 Jul 2027 | S12–S17 | Android app (phone + tablet) on Play internal → closed testing, at parity with the web child experience |
| **4. Breadth + launch** | 2 Aug – 5 Nov 2027 | S18–S24 | 16 launch subjects (🌱–🌳), 4 buddies, payments, Treasure Room, custom trails, public launch on web + Play Store |
| **5. Post-launch** | Nov 2027 → | rolling | iOS (React Native, needs a Mac and Apple developer account), 🚀/🏔️ bands, remaining subjects, AI features, schools |

*Dates assume ~35–40 focused hours a week. At part-time (~20 h/week), roughly double every phase after the MVP and trim the MVP to 3 subjects.*

---

## 7. Sprint-by-sprint backlog: Phase 1 (MVP)

Two-week sprints. Each ticket is sized for one Claude-assisted working session (~2–6 hours). **(C)** means Claude can draft it almost entirely and you review; **(Y)** means it needs your hands or judgement.

### Sprint 0: Foundations (2–13 Nov 2026)
**Goal:** an empty app deploys through the full pipeline; content schema v1 exists.
- [ ] Create the monorepo (pnpm + Turborepo, ESLint/Prettier, Jest) **(C)**
- [ ] Write `CLAUDE.md` with conventions, commands and safety rules (§11.2) **(C+Y)**
- [ ] Port Martha's Next.js + MUI shell into `apps/web`: fonts, theme to `packages/tokens` (incl. breakpoints from §3.4), layout, service worker generator **(C)**
- [ ] Responsive app shells: learner (top bar + side bar on tablet/web, top bar + bottom tabs on phone), grown-up zone (bottom tabs on phone, rail on tablet, sidebar on desktop) **(C)**
- [ ] Scaffold `packages/domain`, `content-schema`, `content`, `i18n`, `tokens`, `sync`, `api-client` with READMEs and a first test each **(C)**
- [ ] **Content schema v1:** item, unit, lesson config, buddy-script, badge (with rule JSON), asset manifest; Ajv validator; `content-cli validate` **(C+Y)**
- [ ] FastAPI skeleton: health check, settings, SQLAlchemy + Alembic, pytest **(C)**
- [ ] `infra/docker-compose.yml` (api, worker, postgres, redis, caddy); provision the VPS; SSH keys; firewall; automatic security updates **(Y with C)**
- [ ] Vercel project (staging + prod), R2 buckets, Sentry projects, domain + DNS **(Y)**
- [ ] GitHub Actions: lint, unit tests, content validation on every PR; deploy API image to the VPS on `main` **(C)**
- [ ] Asset style guide + prompt template; brief the buddy illustrator **(Y with C)**
- [ ] ADRs: monorepo, sync model, hosting, responsive layout strategy **(C)**

### Sprint 1: The core lesson loop (16–27 Nov)
**Goal:** play one Numbers lesson end to end in the browser (no login yet), on tablet, phone and desktop.
- [ ] Port Chipuka's lesson generator, difficulty rules and exercise-spec format into `domain` + tests **(C)**
- [ ] Mastery model + spaced-review scheduler + tests **(C)**
- [ ] Content: Numbers units 1–2 (🌱 Counting 1–5, 6–10) as JSON + placeholder assets **(C+Y review)**
- [ ] Content-pack loader (web) **(C)**
- [ ] Lesson screen: progress bar, exercise host, hint ladder, end-of-lesson stars; tiles in a row (tablet/web) or 2 columns (phone) **(C)**
- [ ] Exercise components 1–4: listen & tap, match pairs, count, name it; keyboard play on web (number keys, Space to repeat) **(C)**
- [ ] Speech service: recorded audio → TTS fallback (from Martha's `speech.js`/`sounds.js`) **(C)**
- [ ] **Playtest #1** with 2–3 children (one lesson) on a tablet and a phone **(Y)**

### Sprint 2: Accounts, profiles and the trail (30 Nov–11 Dec)
**Goal:** a parent signs up, adds children, and each child sees their own trail.
- [ ] API: grown-up auth (magic link + Google), families, learners, guardians; Alembic migrations **(C)**
- [ ] Consent records + privacy-policy acceptance stored with versions **(C+Y)**
- [ ] Onboarding flow screens (concept report §4.3 steps 1–7); centred-card layout on tablet/desktop **(C)**
- [ ] Profile picker, parent gate (arithmetic) + PIN option **(C)**
- [ ] Dexie storage adapter + outbox; `POST /sync/events` + cursor-based pull **(C)**
- [ ] World map (5 subject places) on tablet/web, island-card list on phone; winding trail (port Chipuka's path layout to SVG on web) with a narrow phone variant **(C)**
- [ ] Unit checkpoint node + unlock logic **(C)**

### Sprint 3: Exercises and the buddy (14–23 Dec, short sprint) → holiday break 24 Dec–3 Jan
**Goal:** all 10 exercise types, and the buddy talks.
- [ ] Exercise components 5–10: compare, sequence, sort into bins, odd one out, case-match, build a word (each checked at phone, tablet and desktop sizes) **(C)**
- [ ] Buddy component: Lottie states, speech bubble, script-table lookup by event, variety rule (no repeated line twice in a row) **(C)**
- [ ] Buddy picker screen (1 live, 3 "coming soon") **(C)**
- [ ] First buddy art received and integrated **(Y)**

### Sprint 4: Rewards and games (4–15 Jan 2027)
**Goal:** the reward loop works and games are playable.
- [ ] Reward economy in `domain`: earning rules, wallet from transactions, caps; config file **(C)**
- [ ] Badge rule engine (count, content-complete, streak, mastery, combinations) + 15 built-in badges **(C)**
- [ ] Celebration overlay + badge book **(C)**
- [ ] Buddy Shop v1 (outfits, priced items, inventory) + buddy wearing items **(C+Y art)**
- [ ] Daily goal + gentle streak with rest days **(C)**
- [ ] Games: memory flip, jigsaw (4/9/16 pieces from any image), sized for phone **(C)**
- [ ] **Playtest #2**: rewards and games **(Y)**

### Sprint 5: Grown-up zone and Lesson Builder (18–29 Jan)
**Goal:** parents can see progress and make their own lessons, on phone, tablet or desktop.
- [ ] Parent dashboard: per-child progress, weak items, weekly chart, recent badges; 1 column (phone), 2 columns (tablet), side-by-side children (desktop) **(C)**
- [ ] Settings: daily goal, screen-time limit, bedtime lock, voice speed, sound **(C)**
- [ ] Media API: presigned upload, `media_assets` table, size/type checks, server-side EXIF check **(C)**
- [ ] Client media: camera/upload, square crop, resize, EXIF strip; voice recorder (port Martha's `SoundRecorder`); offline retry queue **(C)**
- [ ] Lesson Builder: cards CRUD, 3 templates, preview-as-child, assign to children **(C)**
- [ ] Custom lessons appear on the child's map ("Family Island") **(C)**

### Sprint 6: Content and offline (1–12 Feb)
**Goal:** the MVP content is complete and works offline.
- [ ] Content: remaining MVP units, ~25 units across the 5 subjects **(C drafts, Y reviews every unit)**
- [ ] Asset batch generation + review for those units; voice-line batch for the buddy + content words **(Y with C tooling)**
- [ ] Per-subject content-pack download + offline cache + storage-quota handling **(C)**
- [ ] Placement quiz (optional per subject) **(C)**
- [ ] Accessibility pass: touch targets, reduced motion, captions, contrast, keyboard play on web **(C+Y)**

### Sprint 7: Hardening and beta launch (15–26 Feb)
**Goal:** a stable beta in front of real families.
- [ ] Playwright E2E for the 5 critical flows (§9.3) green in CI at phone, tablet and desktop viewports **(C)**
- [ ] Performance on a budget Android tablet and phone (Lighthouse CI budgets, 60 fps trail scroll) **(C+Y)**
- [ ] Data export + delete; retention jobs; Sentry scrubbing verified **(C+Y)**
- [ ] Privacy policy + terms published; consent wording reviewed by a lawyer **(Y)**
- [ ] Beta onboarding: invite codes, feedback button (in the grown-up zone only), beta FAQ **(C)**
- [ ] Bug bash + fix sprint; release `v0.1.0-beta` **(Y with C)**
- [ ] Recruit 15–30 beta families **(Y)**

---

## 8. Backlog for later phases (epic level)

### Phase 2: Beta iteration + Classroom (S8–S11, Mar–Apr 2027)
| Sprint | Focus |
|---|---|
| S8 | Beta fixes from week-1 feedback; second-parent invite; view-only carer role |
| S9 | Teacher accounts, classes, roster, join codes/QR, parent ↔ class linking with scopes; teacher web layout + tablet layout (icon rail, larger touch targets) |
| S10 | Assignments (class/group/individual, due dates), class dashboard + heatmap, classroom mode (shared tablets and computer labs, picture passwords) |
| S11 | **Badge Studio** (custom badges + achievement rules + uploaded images), Wish list (real-world rewards), **share codes** for lessons and badge sets, safety checks on shared images; school admin and moderation screens (web); start 3–5 pilot classrooms |

### Phase 3: React Native Android app (S12–S17, May–Jul 2027)
| Sprint | Focus |
|---|---|
| S12 | `apps/mobile` with the React Native CLI (bare), New Architecture; monorepo Metro/pnpm set-up; port the useful Chipuka scaffolding (navigation, `ChipuMascot` pattern, TTS); RN theme from `tokens`; phone/tablet layout switch per §3.4; op-sqlite storage adapter; signed release build in CI |
| S13 | Auth, profiles, onboarding, world map (tablet) / island list (phone) + trail (react-native-svg, virtualised nodes) |
| S14 | Lesson screen + all 10 exercise components in React Native |
| S15 | Rewards, shop, badges, games (memory, jigsaw), buddy animations (lottie-react-native) |
| S16 | Grown-up zone + Lesson Builder with native camera/mic; media cache; background sync |
| S17 | Maestro E2E on a phone and a tablet emulator, device testing, Play Families declarations, internal → closed testing track |

### Phase 4: Breadth + launch (S18–S24, Aug–Nov 2027)
| Sprint | Focus |
|---|---|
| S18–S20 | Content waves: Time, Weather & seasons, Plants, Opposites, Planets, Transport, Sports, Body, Positions, Directions & compass, Feelings (🌱–🌳); new exercise types (trace, clock setter, true/false); new games |
| S21 | Buddies 2–4 (art, voices, scripts); Treasure Room + sticker albums; custom trails |
| S22 | Payments: Stripe (web), Google Play Billing (Android), plan limits, Classroom licences, receipts; parent-gated purchase flow |
| S23 | Launch hardening: load test, security review, privacy review, store listing assets (phone + tablet screenshots), ASO, support site |
| S24 | **Public launch** on web + Play Store (staged rollout), monitoring, fast-fix week |

---

## 9. Testing strategy

### 9.1 Automated testing layers
| Layer | Tool | What's covered | Gate |
|---|---|---|---|
| Domain unit tests | Jest | Lesson generation, difficulty, mastery/review, reward economy, badge rules, sync merge, path layout | ≥80% coverage in `packages/domain` and `sync`; PR blocked below that |
| Content validation | Ajv + `content-cli validate` | Every unit JSON matches the schema; referenced assets and audio exist; asset `review_status` = approved for prod builds; audio loudness in range | PR blocked |
| Component tests | React Testing Library (web), RN Testing Library (mobile) | Each exercise type with scripted right/wrong answers; Lesson Builder forms | PR blocked |
| API tests | pytest + httpx, test Postgres in CI | Auth, scopes (a teacher can't see unlinked data), sync idempotency, media signing | PR blocked |
| E2E | Playwright (web, at 390 × 844, 1180 × 820 and 1440 × 900); Maestro (Android phone + tablet, Phase 3) | Critical flows (§9.3) | `main` blocked if red |
| Visual layout | Playwright screenshots per screen per viewport | No clipped or overlapping content on key screens | PR warning |
| Accessibility | axe-core in Playwright | No serious violations on key screens | PR warning → blocker before launch |
| Performance | Lighthouse CI | PWA installable, LCP < 2.5 s on a throttled mobile profile, JS budget | PR warning |
| Offline/sync | Playwright with network toggled | Play offline → reconnect → events synced, no duplicates | `main` blocked |

### 9.2 Manual testing
- **Kid playtests every two weeks** (2–3 children aged 3–7, with a parent present and consent): watch, don't help, note where they get stuck. Alternate tablet and phone.
- **Device matrix:** a budget Android tablet (the main target), a mid-range Android phone, Chrome on a laptop/Chromebook, an iPad or Android tablet in portrait (parent app), Safari on iPhone (PWA sanity checks).
- **Content review:** every unit is checked for accuracy, age-appropriateness and inclusivity before it's approved.

### 9.3 The critical flows (always green)
1. Parent signs up → consents → adds 2 learners → child completes a lesson
2. Child plays offline → earns treasures and a badge → reconnects → the parent's device shows it
3. Parent builds a photo + voice lesson → assigns it → child plays it → jigsaw from the photo
4. Child spends treasures in the shop → the buddy wears the item on another device
5. Parent exports and deletes the family's data

---

## 10. CI/CD and release process

### 10.1 Branching and CI
- **Trunk-based:** short-lived feature branches → PR → CI → squash-merge to `main`. Claude opens branches and PRs; **you merge**.
- **On every PR:** lint, unit, component, API and content-validation tests; Vercel preview deploy; Playwright smoke tests against the preview at the three viewports.
- **On merge to `main`:** web auto-deploys to staging; API Docker image builds and is pushed to GHCR, then deployed to the staging Compose project on the VPS.

### 10.2 Production releases
| Step | Web/PWA | API | Android (Phase 3+) |
|---|---|---|---|
| Trigger | Git tag `vX.Y.Z` | Same tag | Same tag |
| Pre-flight | Release checklist (§10.4) | **Database backup before migrations**; Alembic migration dry-run on a staging copy | Version code bump; signed AAB built in CI with the keystore from secrets |
| Deploy | Vercel production promote | Pull image + `docker compose up -d` via SSH action; migrations run; health check | Upload to Play internal track → closed → production with **staged rollout** (10% → 50% → 100%) |
| PWA update | Service-worker cache version bumped per build; "new version" toast in the grown-up zone; children's sessions never interrupted mid-lesson | — | — |
| Rollback | Vercel instant rollback | Re-deploy previous image tag; down-migration only if written and tested; otherwise restore from backup | Halt rollout; ship a fix build |

### 10.3 Content releases
Content packs are versioned separately from app code (`content@2027.03.1`). They're built by `content-cli build`, uploaded to R2, and listed in a manifest the apps check. **New lessons can ship without an app release**, which matters for the Play Store's review times.

### 10.4 Release checklist (each production release)
- [ ] All CI green; E2E critical flows green on staging at all three viewports
- [ ] Tested on the budget Android tablet and an Android phone
- [ ] No new third-party SDKs (or privacy review done if added)
- [ ] Migrations backed up and reversible, or a restore has been rehearsed
- [ ] Sentry release created; source maps uploaded
- [ ] Changelog written (parent-friendly "What's new")
- [ ] For store builds: data-safety form and Families declarations still accurate

### 10.5 Beta and store milestones
- **Closed web beta (Mar 2027):** invite codes, 15–30 families, weekly feedback form, private beta group chat for parents.
- **Classroom pilots (late Apr 2027):** 3–5 teachers, signed pilot agreement covering data and consent.
- **Play Store (Jul 2027):** internal testing (you + beta parents) → closed testing (at least 12 testers for 14 days if your developer account falls under Google's new-personal-account testing rule; check the current requirement) → production. Complete the Families policy, data-safety and target-audience declarations.
- **iOS (after launch):** needs a Mac (or a cloud Mac build service) and an Apple Developer account; App Store Kids/Family review.

---

## 11. Working with Claude

### 11.1 Who does what
| Claude does | You do |
|---|---|
| Scaffolding, components, API endpoints, migrations, tests | Architecture decisions, ADR approval, merging PRs |
| Ports code from Martha and Chipuka | Feel and UX judgement, playtests with children |
| Drafts content units (items, exercises, buddy lines, fun facts) from the catalogue | Fact-checks and approves every unit |
| Generates asset prompt sheets and audio scripts | Generates/curates assets, approves them |
| Writes docs, release notes, privacy-policy first drafts | Legal review, store accounts, secrets, payments set-up |
| Reviews its own work with a second reviewer agent on risky changes | Final review of anything touching child data, auth or payments |

### 11.2 `CLAUDE.md` (root of the repo) should state
- **Stack rules:** JavaScript only with JSDoc, MUI on web, React Native Paper on mobile, FastAPI + SQLAlchemy, Postgres; no TypeScript, no Tailwind, no Expo.
- **Where things go:** no business logic in screens, which call `packages/domain`; every new domain function gets a Jest test.
- **Responsive rule:** every screen is checked at phone, tablet and desktop sizes for the devices its app supports (§3.4).
- **Commands:** `pnpm dev`, `pnpm test`, `pnpm content:validate`, `docker compose up`, `pytest`.
- **Child-safety rules:** never add a third-party analytics or ad SDK; never log a child's name, photo URL or audio URL; every upload path strips EXIF; free-text inputs are only allowed in grown-up screens.
- **Definition of done** for a ticket: tests written and passing, content validated, screenshots for UI changes (each supported device size), a short PR description.
- **Never:** commit secrets, push to `main`, or edit an already-applied migration.

### 11.3 The per-ticket loop
1. **Pick the ticket** from the sprint list (GitHub Issues/Projects, one issue per checkbox above).
2. **Plan:** ask Claude to read the relevant packages and propose a short plan (files to touch, tests to add). You approve or adjust.
3. **Build:** Claude implements on a branch, writes tests and runs them.
4. **Self-review:** Claude checks the diff against the review checklist (§11.5). For auth, sync, payments or child data, a separate reviewer agent reviews the diff cold.
5. **Verify:** Claude starts the app and checks the screen in the browser at each supported size (screenshots), or runs Playwright.
6. **PR:** Claude opens the PR; CI runs; you look at the preview and merge.

### 11.4 Skills worth creating (repeatable workflows)
| Skill | What it does | Status |
|---|---|---|
| **trailbuddies-prototype-dev-loop** | Change, test (all flows on all devices) and republish the interactive prototype | Proposed 22 Oct 2026 |
| **backlog-to-github-sync** | User stories → Markdown, Excel and GitHub Issues with labels and milestones; safe re-sync | Proposed 22 Oct 2026 |
| **clickable-multi-app-prototype** | The guide-panel + device-stage prototype pattern for any multi-app product | Proposed 22 Oct 2026 |
| **trailbuddies-dev-loop** | The build → test → preview → PR loop with the repo's commands and conventions (like your existing `chipuka-rn-dev-loop`) | Create in Sprint 0 |
| **trailbuddies-content-unit** | Takes a catalogue row (e.g. "Animals → Water animals, 🌿") and produces a schema-valid unit JSON: items, exercise mix, buddy lines, fun facts, asset prompt sheet and audio script; runs validation | Create in Sprint 1 |
| **trailbuddies-release** | Walks the release checklist, tags, deploys, verifies health and writes the changelog | Create in Sprint 7 |

### 11.5 Review checklist (Claude self-review + your PR review)
- [ ] Logic lives in `packages/`, not in a screen
- [ ] Tests cover the happy path + at least 2 edge cases
- [ ] Works offline (or fails gracefully) and doesn't break sync
- [ ] Touch targets ≥48 dp/px; everything the child needs is spoken
- [ ] Layout checked at every supported device size (§3.4); keyboard works on web
- [ ] No child personal data in logs, URLs or analytics
- [ ] Copy is age-appropriate and in `i18n`, not hard-coded
- [ ] No new dependency without a reason in the PR (licence + size checked)

### 11.6 Useful prompt patterns
- *"Read `packages/domain/difficulty.js` and Chipuka's `src/data/difficulty.js`; port the auto-adjust rules with Jest tests for these 5 cases: …"*
- *"Using the content-unit skill, draft Animals → Farm animals (🌱) with 8 items, 6 lessons and asset prompts; validate it."*
- *"Review this diff as a child-privacy reviewer: list anything that could leak a child's data or bypass the parent gate."*
- *"Build the world map so it renders as islands on tablet and desktop and as a card list on phone, matching the prototype; add Playwright screenshots at the three viewports."*

---

## 12. Budget estimate

*Cash costs only, in USD. Your own time isn't included. Prices were checked in October 2026 where noted; everything else is an estimate to confirm.*

### 12.1 Monthly running costs
| Item | MVP period | After launch | Notes |
|---|---|---|---|
| Claude plan | $100–200 | $100–200 | Max plan from $100/mo; Pro is $20/mo but likely too limited for full-time building. Claude Code is included in paid plans |
| Vercel | $0–20 | $20+ | Hobby is free but non-commercial; Pro is $20/seat/mo (incl. $20 usage credit), required once you charge customers |
| VPS (API, Postgres, Redis, worker) | $22–40 | $40–80 | e.g. Hetzner CPX22 ~€20/mo or CPX32 ~€36/mo; add a second server or managed Postgres later |
| Cloudflare R2 | $0 | $5–30 | 10 GB free, then $0.015/GB-month; no egress fees |
| Transactional email | $0 | $0–20 | Resend/Postmark free tiers cover the beta |
| Sentry | $0 | $0–26 | Free developer tier during the MVP |
| AI voice (e.g. ElevenLabs) | $22 | $22–99 | Creator ~$22/mo for batch line generation; check commercial-licence terms per plan |
| AI image tool | $10–30 | $10–30 | Depends on the tool chosen; must grant commercial rights |
| Domain + misc. | $2–5 | $5–10 | Domain, uptime monitor |
| **Monthly total** | **~$160–340** | **~$200–520** | |

### 12.2 One-off costs
| Item | Estimate | When |
|---|---|---|
| Buddy design (1 buddy: character sheet, poses, Lottie animations) | $300–1,500 per buddy | Sprint 0–3 (1), Phase 4 (3 more) |
| Licensed illustration and sound-effect packs | $100–500 | Sprints 1–6 |
| Final buddy voice (actor or licensed AI voice, ~400 lines) | $200–1,500 per buddy | Before launch |
| Legal: privacy policy, terms, consent review | $500–2,000 | Sprint 7, refreshed before launch |
| Test devices: budget Android tablet + mid-range Android phone | $150–350 | Sprint 0 |
| Google Play developer account | $25 (one-time) | Phase 3 |
| Apple Developer Program | $99/year | Phase 5 (iOS) |
| Trademark search/registration for the final name | $200–1,500 | Before launch |
| Payment set-up (Stripe) | $0 + transaction fees | Phase 4 |

### 12.3 Totals
| Period | Estimate |
|---|---|
| **MVP (Nov 2026–Feb 2027, 4 months)** | ~$640–1,360 running + ~$1,000–3,500 one-off → **~$1,500–4,500** |
| **First 12 months (to launch)** | **~$6,000–16,000** (the main variables are buddy art/voice for 4 buddies and the legal review) |

---

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Solo developer: illness, burnout, single point of failure** | Delays everything | 2-week sprints with a 20% buffer; a holiday break built in; everything documented in ADRs and `CLAUDE.md`, so a contractor could pick it up |
| **Scope creep** (the catalogue has 484 units) | MVP slips | The MVP is locked to §3; new ideas go to the backlog, not the sprint |
| **Content and asset bottleneck** | Beta has too little to play | Asset pipeline starts in Sprint 0; AI-assisted generation with a strict review step; reuse items across subjects |
| **Three device sizes per app** | More UI and testing work per screen | Shared responsive shells built once in Sprint 0; layouts switch at breakpoints rather than separate screens; Playwright screenshots at three viewports catch regressions automatically |
| **React Native in a pnpm monorepo** (duplicate React, Metro resolution) | Phase 3 slowdown | Do a 2-day spike at the start of S12; hoisted linker; pinned React version |
| **Two UI codebases** (web + React Native) | Double the UI work | All logic in packages; RN screens are thin; the RN app starts only after the web UX has settled |
| **iOS PWA limitations** before the native iOS app | iPhone users get a weaker experience | Supported as "web" during beta; the native iOS build follows launch |
| **Self-run VPS** (backups, security, uptime) | Data loss or outage | Automated backups to R2 with a monthly restore test; automatic security updates; uptime alerts; move to managed Postgres at the threshold in §4.5 |
| **AI asset quality or licensing** | Rework, legal exposure | Commercial-rights tools only; review status in manifests; no imitation of known characters |
| **Children's privacy compliance** | Store rejection, legal risk | Consent and data controls in the MVP; legal review in Sprint 7; no third-party SDKs |

---

## 14. Weekly rhythm (solo)
- **Monday:** plan the week from the sprint list (30 min); Claude drafts the week's tickets.
- **Tue–Thu:** build. Mornings on code, afternoons on content and asset review.
- **Friday:** demo to yourself on the tablet and a phone, update the changelog, triage bugs, and plan the playtest (every second Friday is a kid playtest).
- **End of sprint:** short retro note in `docs/sprints/`, then re-plan the next sprint.

---

## 15. First week checklist (2–6 Nov 2026)
1. Create the GitHub repo `trailbuddies` and the GitHub Project board with Sprint 0–7 issues from §7. *(Done: repo SGGaita/trailbuddies with 228 story issues, labels and milestones.)*
2. Buy the test tablet and an Android phone; register the domain; create Vercel, Cloudflare (R2), Sentry and VPS accounts.
3. Scaffold the monorepo and `CLAUDE.md` with Claude; set up CI.
4. Write content schema v1 and validate one hand-made unit (Numbers → Counting 1–5).
5. Brief the buddy illustrator; draft the style guide.
6. Line up 2–3 families for the first playtest at the end of Sprint 1.

---

### Sources
- [Claude plans & pricing](https://claude.com/pricing)
- [Vercel cost in 2026 (MakerKit)](https://makerkit.dev/blog/tutorials/vercel-cost)
- [Hetzner 2026 price increase (Findstack)](https://findstack.com/resources/hetzner-price-increase-2026)
- [ElevenLabs pricing (Dupple, May 2026)](https://dupple.com/pricing/elevenlabs)
- [Cloudflare R2 pricing (Semaphore)](https://semaphore.io/blog/cloudflare-r2%22)
- Internal: `Trailbuddies-concept-report.md`, `Trailbuddies-user-stories.md`, Trailbuddies Prototype (interactive, all apps and devices), `chipuka-app/PLAN.md`, `martha-learning/README.md`
