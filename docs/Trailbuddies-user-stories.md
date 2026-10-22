# Trailbuddies: Personas and User Stories
### Whole product, from MVP to post-launch

*Prepared 21 October 2026 for Steve Gaita. Companion to `Trailbuddies-concept-report.md` and `Trailbuddies-development-plan.md`. The same backlog is in `Trailbuddies-backlog.xlsx` and as GitHub issues in the `trailbuddies` repo; story IDs match across all three.*

---

## How to read this

- **Story format:** *As [persona], I want [goal], so that [benefit].* Acceptance criteria are written as **Given / When / Then** scenarios that can become automated tests.
- **Priority (MoSCoW):** Must = the milestone fails without it · Should = important, can slip one sprint · Could = nice to have.
- **Size:** XS (1 pt) · S (2) · M (3) · L (5) · XL (8). One point is roughly half a day of Claude-assisted work for a solo developer.
- **Milestone and sprint** follow the development plan: **MVP** MVP (closed web beta) (S0–S7) · **P2** Beta iteration + Classroom (S8–S11) · **P3** React Native Android app (S12–S17) · **P4** Breadth + public launch (S18–S24) · **P5** Post-launch (rolling).
- **Screens** refer to the wireframe IDs in the clickable prototype (P = parent phone, C = child tablet, T = teacher desktop, A = older learner).

## Backlog at a glance

| Milestone | Stories | Must | Should | Could | Points |
|---|---|---|---|---|---|
| Phase 1 — MVP (closed web beta) | 110 | 100 | 10 | 0 | 264 |
| Phase 2 — Beta iteration + Classroom | 51 | 28 | 18 | 5 | 130 |
| Phase 3 — React Native Android app | 6 | 6 | 0 | 0 | 25 |
| Phase 4 — Breadth + public launch | 38 | 11 | 17 | 10 | 117 |
| Phase 5 — Post-launch | 23 | 0 | 13 | 10 | 106 |
| **Total** | **228** | **145** | **58** | **25** | **642** |

> **Capacity check:** the MVP holds 264 points across 8 sprints (~33 points a sprint). That is ambitious for one developer, even with Claude. If velocity after Sprint 2 is lower, move the MVP's *Should* and *Could* stories into Phase 2 first; the *Must* stories are the beta.

| Epic | Stories | Points | Milestones |
|---|---|---|---|
| [ONB: Onboarding & accounts](#onb-onboarding--accounts) | 14 | 31 | MVP, P2, P4, P5 |
| [FAM: Family & learner profiles](#fam-family--learner-profiles) | 8 | 16 | MVP, P2, P4 |
| [BUD: Buddy tutor](#bud-buddy-tutor) | 11 | 26 | MVP, P4 |
| [MAP: World map & learning trail](#map-world-map--learning-trail) | 9 | 25 | MVP, P4, P5 |
| [LES: Lessons & exercises](#les-lessons--exercises) | 19 | 52 | MVP, P2, P4, P5 |
| [ADP: Adaptive learning](#adp-adaptive-learning) | 7 | 17 | MVP, P4 |
| [GAM: Games](#gam-games) | 9 | 29 | MVP, P4 |
| [RWD: Rewards: stars, treasures & shop](#rwd-rewards-stars,-treasures--shop) | 10 | 27 | MVP, P4 |
| [BDG: Badges & achievements](#bdg-badges--achievements) | 7 | 15 | MVP, P2, P4 |
| [BST: Badge Studio & Wish list](#bst-badge-studio--wish-list) | 8 | 22 | P2 |
| [BLD: Lesson Builder & custom trails](#bld-lesson-builder--custom-trails) | 16 | 44 | MVP, P2, P4 |
| [SHR: Sharing by code](#shr-sharing-by-code) | 5 | 12 | P2 |
| [PAR: Parent dashboard & controls](#par-parent-dashboard--controls) | 8 | 19 | MVP, P2 |
| [CLS: Classes & roster](#cls-classes--roster) | 8 | 20 | P2, P4 |
| [ASN: Assignments & class insights](#asn-assignments--class-insights) | 6 | 15 | P2, P5 |
| [CRM: Classroom mode](#crm-classroom-mode) | 5 | 13 | P2, P4 |
| [OFF: Offline & sync](#off-offline--sync) | 7 | 19 | MVP |
| [CNT: Content & subjects](#cnt-content--subjects) | 9 | 46 | MVP, P4, P5 |
| [PAY: Plans & payments](#pay-plans--payments) | 7 | 18 | P4 |
| [SAF: Privacy, safety & compliance](#saf-privacy,-safety--compliance) | 10 | 24 | MVP, P2, P4 |
| [ACC: Accessibility](#acc-accessibility) | 7 | 15 | MVP, P4 |
| [OLD: Older learners (teens & adults)](#old-older-learners-teens--adults) | 5 | 18 | P5 |
| [MOB: Mobile app (React Native)](#mob-mobile-app-react-native) | 7 | 33 | P3, P5 |
| [OPS: Platform & DevOps](#ops-platform--devops) | 8 | 20 | MVP, P2, P4 |
| [SCH: School administration](#sch-school-administration) | 4 | 13 | P5 |
| [AI: AI features](#ai-ai-features) | 4 | 24 | P5 |
| [LOC: Languages & localisation](#loc-languages--localisation) | 4 | 14 | MVP, P5 |
| [MOD: Moderation](#mod-moderation) | 3 | 8 | P2 |
| [HLP: Help & support](#hlp-help--support) | 3 | 7 | P2 |

---

## Personas

### Amani (Learner (Seedling, 3–4), age 3)
Can't read yet. Loves animals and tapping things. Plays on the family's budget Android tablet, usually for 10–15 minutes after nursery, with Mum nearby.

- **Needs:** Everything spoken aloud; big targets; no failure states; lots of praise; quick wins.
- **Frustrations:** Small buttons, text instructions, anything that takes too long to load.

### Zawadi (Learner (Sprout, 5–6), age 6)
Amani's older sister. Learning to read and count to 100. Very motivated by collecting stickers and dressing up her buddy. Plays at home and in class.

- **Needs:** Visible progress; rewards to save up for; feeling 'big' compared with her little brother.
- **Frustrations:** Repeating lessons she already knows; her brother playing on her profile.

### Leo (Learner (Explorer, 7–8), age 8)
Confident reader, obsessed with space and football. Likes challenges and getting things right first time.

- **Needs:** Harder questions, real facts, a sense of mastery; less babyish feedback.
- **Frustrations:** Being made to do easy stuff; slow celebrations that stop him moving on.

### Nia (Learner (Voyager, 9–12), age 11)
Uses the app for maths practice and planets. Has her own PIN. Wants it to feel grown-up.

- **Needs:** A cooler look, typed answers, her own goals, privacy from younger siblings.
- **Frustrations:** Cartoonish UI, being treated like a little kid.

### Grace (Parent (account owner), age 34)
Mum of Amani and Zawadi. Works full-time, uses an Android phone. Wants screen time that is actually educational and wants to add the family's own world (their farm, their grandparents) to lessons.

- **Needs:** Fast set-up; clear progress at a glance; making a custom lesson in under 5 minutes; control of screen time.
- **Frustrations:** Ads, upsells aimed at kids, apps that need constant supervision.

### Tom (Second parent / guardian, age 41)
Leo's dad. Travels for work, checks progress from his phone and likes to award badges remotely for things Leo does at home.

- **Needs:** View progress, award a badge, approve a wish from anywhere.
- **Frustrations:** Being locked out because only one parent set up the account.

### Ms Priya (Teacher (early-years / primary), age 29)
Teaches a class of 26 five-and-six-year-olds with 8 shared tablets and a projector. Makes her own weekly spelling and topic lessons.

- **Needs:** Quick class set-up; assigning work to groups; seeing who's stuck; reusing and sharing lessons with colleagues.
- **Frustrations:** Kids forgetting passwords; spending lesson time on logins; tools that don't work offline when the Wi-Fi drops.

### Joseph (Adult learner, age 46)
Grace's uncle. Is improving his reading and wants to learn alongside the grandchildren. Uses the 'Add me too' adult profile.

- **Needs:** Adult look; no childish tone; private progress; start at the right level.
- **Frustrations:** Feeling patronised; public comparisons.

### Sam (School administrator, age 50)
Runs a small primary school with 6 teachers. Buys the school licence and manages teacher seats.

- **Needs:** Simple licence and seat management; data-protection paperwork; school-wide reports.
- **Frustrations:** Per-teacher billing chaos; unclear data handling.

### Steve (Developer / product owner)
Builds the product solo with Claude. Needs fast feedback, safe releases and content that can be added without code changes.

- **Needs:** Automated checks, reliable deploys, a content pipeline.
- **Frustrations:** Manual, error-prone release steps.

---

## Stories by epic

### ONB: Onboarding & accounts

#### ONB-01 · Choose parent or teacher path
`Must` · `S (2 pt)` · `MVP / S2` · Screens: P01 Welcome · [GitHub #29](https://github.com/SGGaita/trailbuddies/issues/29)

**As Grace (parent), I want to say whether I'm a parent or a teacher when I first open the app, so that I'm taken through the set-up that fits me.**

- *Scenario 1:* **Given** I open Trailbuddies for the first time, **when** I see the welcome screen, **then** I can choose "I'm a parent" or "I'm a teacher" and a short animated intro of the buddies plays.
- *Scenario 2:* **Given** I chose "I'm a parent", **when** I continue, **then** I'm taken to sign-up with parent wording throughout.

#### ONB-02 · Sign up with email magic link
`Must` · `M (3 pt)` · `MVP / S2` · Screens: P02 Sign up, P07 Check your email / expired link · [GitHub #30](https://github.com/SGGaita/trailbuddies/issues/30)

**As Grace (parent), I want to create an account with just my email and a one-time link, so that I don't have to invent and remember another password.**

- *Scenario 1:* **Given** I enter a valid email on sign-up, **when** I tap "Send my link", **then** an email with a sign-in link valid for 15 minutes is sent and the screen tells me to check my inbox.
- *Scenario 2:* **Given** I open the link on the same or another device, **when** the link is valid, **then** I'm signed in and continue onboarding where I left off.
- *Scenario 3:* **Given** the link has expired or was already used, **when** I open it, **then** I see a friendly message and can request a new link.

#### ONB-06 · Give verifiable parental consent
`Must` · `M (3 pt)` · `MVP / S2` · Screens: P03 Parental consent · [GitHub #31](https://github.com/SGGaita/trailbuddies/issues/31)

**As Grace (parent), I want to read a plain-language summary of what's collected and give consent, so that I know exactly what happens to my children's data before they play.**

- *Scenario 1:* **Given** I reach the consent step, **when** I view it, **then** I see what is collected, why, how long it's kept and my rights, in plain language with a link to the full policy.
- *Scenario 2:* **Given** I tick consent and complete the verification step required in my region, **when** I continue, **then** a consent record with policy version, timestamp and method is stored.
- *Scenario 3:* **Given** I haven't consented, **when** I try to add a learner, **then** I can't continue until consent is given.

#### ONB-07 · Add one or more learners
`Must` · `M (3 pt)` · `MVP / S2` · Screens: P04 Add learners · [GitHub #32](https://github.com/SGGaita/trailbuddies/issues/32)

**As Grace (parent), I want to add each of my children with a first name or nickname, birth month and year and an avatar, so that each child gets their own trail and progress.**

- *Scenario 1:* **Given** I'm on "Who's learning?", **when** I add Amani (born Mar 2023) and Zawadi (born Jun 2020), **then** two profiles are created with age bands Seedling and Sprout set from their birth dates.
- *Scenario 2:* **Given** I enter a full name, **when** I save, **then** I'm reminded that a nickname is enough and only the first name field is stored.
- *Scenario 3:* **Given** my plan's learner limit is reached, **when** I try to add another, **then** I see the limit and an option to upgrade (behind the parent gate).

#### ONB-11 · Hand over to the child
`Must` · `XS (1 pt)` · `MVP / S2` · Screens: P06 Family settings & hand-over, C03 Meet the buddies · [GitHub #33](https://github.com/SGGaita/trailbuddies/issues/33)

**As Grace (parent), I want a clear hand-over moment at the end of set-up, so that my child can start straight away without me navigating menus.**

- *Scenario 1:* **Given** I finish onboarding, **when** I tap "Hand to Amani", **then** the app switches to the child experience and opens Meet the buddies for Amani.
- *Scenario 2:* **Given** I have several children, **when** I tap "Hand over", **then** the Who's playing? picker opens.

#### ONB-14 · Sign out and session handling
`Must` · `S (2 pt)` · `MVP / S2` · Screens: P18 Settings, limits & privacy · [GitHub #34](https://github.com/SGGaita/trailbuddies/issues/34)

**As Grace (parent), I want sessions to stay signed in on my devices until I sign out, so that I'm not asked to sign in every day but stay in control.**

- *Scenario 1:* **Given** I'm signed in, **when** I return within 60 days, **then** I remain signed in using a refresh token.
- *Scenario 2:* **Given** I choose "Sign out of all devices", **when** I confirm, **then** all refresh tokens are revoked and other devices return to the welcome screen.

#### ONB-03 · Sign in with Google
`Must` · `S (2 pt)` · `MVP / S6` · Screens: P02 Sign up · [GitHub #89](https://github.com/SGGaita/trailbuddies/issues/89)

**As Grace (parent), I want to sign up or sign in with my Google account, so that set-up takes seconds on my Android phone.**

- *Scenario 1:* **Given** I'm on sign-up, **when** I choose "Continue with Google" and approve, **then** an account is created (or I'm signed in) using my Google email and I continue onboarding.
- *Scenario 2:* **Given** an account already exists with the same email via magic link, **when** I sign in with Google, **then** both sign-in methods are linked to the one account.

#### ONB-05 · Country sets local rules and formats
`Must` · `S (2 pt)` · `MVP / S6` · Screens: P02 Sign up, P18 Settings, limits & privacy · [GitHub #90](https://github.com/SGGaita/trailbuddies/issues/90)

**As Grace (parent), I want to choose my country during sign-up, so that dates, my seasons unit, currency and the privacy rules match where I live.**

- *Scenario 1:* **Given** I select my country, **when** I finish sign-up, **then** the family's date format, 'My seasons' climate set and currency are set from the country, and the consent flow for that region is used.
- *Scenario 2:* **Given** I later change country in settings, **when** I save, **then** formats update and I'm asked to re-confirm consent if the rules differ.

#### ONB-09 · Choose interests and starting point
`Should` · `S (2 pt)` · `MVP / S6` · Screens: P05 Interests & starting point · [GitHub #91](https://github.com/SGGaita/trailbuddies/issues/91)

**As Grace (parent), I want to tap my child's favourite things and what they can already do, so that the map shows the most exciting subjects first and they skip what they know.**

- *Scenario 1:* **Given** I'm setting up Zawadi, **when** I tap Animals and Space as interests, **then** those subjects appear first on her world map.
- *Scenario 2:* **Given** I tick "Knows her letters", **when** I continue, **then** Language starts at Letter sounds and earlier units show as completed with bronze stars.
- *Scenario 3:* **Given** I skip this step, **when** I continue, **then** default subject order and the age-band start are used.

#### ONB-10 · Set family settings during onboarding
`Must` · `S (2 pt)` · `MVP / S7` · Screens: P06 Family settings & hand-over · [GitHub #99](https://github.com/SGGaita/trailbuddies/issues/99)

**As Grace (parent), I want to set a daily goal, screen-time limit and bedtime lock during set-up, so that the app respects our routine from day one.**

- *Scenario 1:* **Given** I'm on family settings, **when** I set a 20-minute limit and a 7:30 pm bedtime lock, **then** these apply to every child profile and can be changed later in Settings.

#### ONB-12 · First-steps card for parents
`Could` · `S (2 pt)` · `P2 / S8` · Screens: P08 Parent home · [GitHub #111](https://github.com/SGGaita/trailbuddies/issues/111)

**As Grace (parent), I want a short 'first steps' card after my child's first lesson, so that I discover custom lessons, badges and class linking without reading a manual.**

- *Scenario 1:* **Given** my child has completed their first lesson, **when** I next open the grown-up zone, **then** a dismissible card shows progress so far and links to make a lesson, make a badge and join a class.

#### ONB-13 · Teacher sign-up
`Must` · `M (3 pt)` · `P2 / S9` · Screens: P01 Welcome, T01 Teacher home, T00 Teacher sign-up · [GitHub #120](https://github.com/SGGaita/trailbuddies/issues/120)

**As Ms Priya (teacher), I want to sign up as a teacher with my school email, so that I can create classes without setting up a family.**

- *Scenario 1:* **Given** I chose "I'm a teacher", **when** I sign up and enter my school name, **then** a teacher account is created and I land on Teacher home with a prompt to create my first class.
- *Scenario 2:* **Given** my school has a licence and my email domain matches, **when** I sign up, **then** I'm offered to join the school's licence.

#### ONB-08 · Add me too (adult learner)
`Should` · `S (2 pt)` · `P4 / S21` · Screens: P04 Add learners, A01 Teen / adult home · [GitHub #176](https://github.com/SGGaita/trailbuddies/issues/176)

**As Joseph (adult learner), I want the account owner to be able to add an adult learner profile, so that I can learn alongside the children without looking childish.**

- *Scenario 1:* **Given** I'm on "Who's learning?", **when** I choose "Add me too" or add an adult with birth year 18+ years ago, **then** an adult profile is created with the adult look and the study-partner buddy tone.

#### ONB-04 · Sign in with Apple
`Should` · `S (2 pt)` · `P5` · Screens: P02 Sign up · [GitHub #210](https://github.com/SGGaita/trailbuddies/issues/210)

**As Grace (parent), I want to sign in with Apple on an iPhone or iPad, so that I can use the app on Apple devices without a new password.**

- *Scenario 1:* **Given** I'm on sign-up on iOS or Safari, **when** I choose "Continue with Apple", **then** an account is created, including when I hide my email.

### FAM: Family & learner profiles

#### FAM-01 · Who's playing? profile picker
`Must` · `S (2 pt)` · `MVP / S2` · Screens: C01 Who's playing? · [GitHub #22](https://github.com/SGGaita/trailbuddies/issues/22)

**As Zawadi (Sprout), I want to tap my own avatar to start, so that I play on my own trail, not my brother's.**

- *Scenario 1:* **Given** the family has two or more learners, **when** the child app opens, **then** each learner's avatar and name is shown as a large button and a small 'Grown-ups' button sits in the corner.
- *Scenario 2:* **Given** I tap my avatar, **when** my profile has no picture password, **then** my world map opens.

#### FAM-07 · Switch learner from inside the child app
`Must` · `XS (1 pt)` · `MVP / S2` · Screens: C04 World map, C01 Who's playing? · [GitHub #23](https://github.com/SGGaita/trailbuddies/issues/23)

**As Grace (parent), I want to switch the active learner quickly, so that siblings can take turns on one tablet.**

- *Scenario 1:* **Given** a child is on their map, **when** they tap the avatar in the corner, **then** the Who's playing? picker opens without passing the parent gate.

#### FAM-08 · Family can use several devices
`Must` · `S (2 pt)` · `MVP / S6` · Screens: P18 Settings, limits & privacy · [GitHub #87](https://github.com/SGGaita/trailbuddies/issues/87)

**As Grace (parent), I want to sign in on my phone, the home tablet and a laptop, so that my children can play anywhere and progress follows them.**

- *Scenario 1:* **Given** I sign in on a second device, **when** the device syncs, **then** all learners, custom lessons and progress appear.
- *Scenario 2:* **Given** the plan allows a limited number of active devices, **when** I sign in on one more, **then** I can sign out an old device from Settings.

#### FAM-03 · Edit or remove a learner
`Must` · `S (2 pt)` · `MVP / S7` · Screens: P08 Parent home · [GitHub #95](https://github.com/SGGaita/trailbuddies/issues/95)

**As Grace (parent), I want to change a learner's nickname, avatar or birth date, or remove them, so that profiles stay accurate.**

- *Scenario 1:* **Given** I edit Amani's birth date, **when** I save, **then** his age band and look are recalculated; progress is kept.
- *Scenario 2:* **Given** I remove a learner, **when** I confirm twice, **then** the profile and its progress are deleted after a 7-day undo window.

#### FAM-02 · Optional profile picture password
`Should` · `S (2 pt)` · `P2 / S8` · Screens: C02 Classroom picture password · [GitHub #108](https://github.com/SGGaita/trailbuddies/issues/108)

**As Zawadi (Sprout), I want to protect my profile with three pictures, so that my little brother can't spend my treasures.**

- *Scenario 1:* **Given** a parent enabled a picture password for me, **when** I tap my avatar, **then** I'm asked to tap my 3 pictures in order.
- *Scenario 2:* **Given** I get it wrong 3 times, **when** I keep trying, **then** a hint shows the first picture and the parent can reset it from the grown-up zone.

#### FAM-05 · Invite a second parent
`Should` · `M (3 pt)` · `P2 / S8` · Screens: P19 Family members · [GitHub #109](https://github.com/SGGaita/trailbuddies/issues/109)

**As Tom (second parent), I want to be invited by email with equal access, so that I can follow and reward Leo from my own phone.**

- *Scenario 1:* **Given** Grace invites tom@example.com as a parent, **when** Tom accepts the invite, **then** Tom has full access to the family's learners, lessons and settings, and the invite is logged.
- *Scenario 2:* **Given** an invite isn't accepted in 7 days, **when** Tom opens it, **then** it has expired and Grace can resend.

#### FAM-06 · View-only carer role
`Could` · `S (2 pt)` · `P2 / S8` · Screens: P19 Family members · [GitHub #110](https://github.com/SGGaita/trailbuddies/issues/110)

**As Grace (parent), I want to invite a grandparent or carer who can only see progress, so that family can cheer the kids on without changing settings.**

- *Scenario 1:* **Given** I invite Grandma as 'View progress', **when** she signs in, **then** she sees progress and badges but can't edit learners, lessons, settings or purchases.

#### FAM-04 · Automatic band move on birthday
`Should` · `S (2 pt)` · `P4 / S21` · Screens: C04 World map · [GitHub #175](https://github.com/SGGaita/trailbuddies/issues/175)

**As Zawadi (Sprout), I want to 'grow up' in the app around my birthday, so that it keeps feeling right for my age.**

- *Scenario 1:* **Given** my birth month passes and I now fall in a new age stage, **when** I next open the app, **then** my buddy celebrates my birthday, the look and starting band for new subjects update, and existing progress is kept.

### BUD: Buddy tutor

#### BUD-01 · Choose a buddy
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C03 Meet the buddies · [GitHub #36](https://github.com/SGGaita/trailbuddies/issues/36)

**As Amani (Seedling), I want to meet the buddies and pick the one I like, so that I have a friend who helps me learn.**

- *Scenario 1:* **Given** I'm a new learner, **when** Meet the buddies opens, **then** each buddy waves and introduces itself in its own voice when tapped.
- *Scenario 2:* **Given** I tap "Pick me!" on Zip, **when** I confirm, **then** Zip becomes my buddy and appears on my map.
- *Scenario 3:* **Given** only one buddy is available (MVP), **when** I view the screen, **then** other buddies show as 'coming soon' and can't be selected.

#### BUD-03 · Buddy greets me by name
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C04 World map · [GitHub #37](https://github.com/SGGaita/trailbuddies/issues/37)

**As Amani (Seedling), I want my buddy to say hello using my name, so that it feels like my own friend.**

- *Scenario 1:* **Given** I open my map, **when** it's my first visit today, **then** the buddy greets me by name (parent recording if one exists, otherwise the voice pack or device voice) and mentions what we did last time.

#### BUD-04 · Buddy introduces new concepts
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C07 Lesson: listen & tap · [GitHub #38](https://github.com/SGGaita/trailbuddies/issues/38)

**As Amani (Seedling), I want my buddy to show and say each new thing before asking me, so that I'm never asked something I haven't seen.**

- *Scenario 1:* **Given** a lesson contains an item I haven't seen, **when** the item first appears, **then** the buddy shows the picture, says the word and one fun fact before any question about it.

#### BUD-05 · Hint ladder on wrong answers
`Must` · `M (3 pt)` · `MVP / S3` · Screens: C11 Lesson: hint · [GitHub #39](https://github.com/SGGaita/trailbuddies/issues/39)

**As Amani (Seedling), I want gentle hints when I get something wrong, so that I never feel I've failed.**

- *Scenario 1:* **Given** I tap a wrong answer, **when** it's my first miss on this question, **then** there's no buzzer; the buddy repeats the question kindly.
- *Scenario 2:* **Given** it's my second miss, **when** the question resets, **then** one wrong option disappears and the buddy points towards the right area.
- *Scenario 3:* **Given** it's my third miss, **when** the hint plays, **then** the buddy shows and says the answer, I tap it to continue, and the item is scheduled for review.

#### BUD-06 · Varied celebrations
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C07 Lesson: listen & tap, C12 Lesson complete · [GitHub #40](https://github.com/SGGaita/trailbuddies/issues/40)

**As Leo (Explorer), I want the buddy's praise to change and not slow me down, so that it stays fun and doesn't get annoying.**

- *Scenario 1:* **Given** I answer correctly, **when** the buddy reacts, **then** a reaction is chosen that wasn't used in my last answer, and I can tap to continue before it finishes.
- *Scenario 2:* **Given** I'm Explorer band or older, **when** I answer several in a row, **then** celebrations are shorter.

#### BUD-08 · Buddy script table
`Must` · `S (2 pt)` · `MVP / S3` · [GitHub #41](https://github.com/SGGaita/trailbuddies/issues/41)

**As Steve (developer), I want buddy lines to come from a script table keyed by event, buddy and language, so that writers can add lines without code changes.**

- *Scenario 1:* **Given** a new line is added to the script table for event 'lesson_perfect', **when** content is rebuilt, **then** the line can be chosen at runtime without app code changes.
- *Scenario 2:* **Given** an event has no line for the chosen buddy, **when** it fires, **then** a generic fallback line is used and a warning is logged in development.

#### BUD-07 · Effort-based encouragement
`Should` · `XS (1 pt)` · `MVP / S4` · Screens: C12 Lesson complete · [GitHub #52](https://github.com/SGGaita/trailbuddies/issues/52)

**As Zawadi (Sprout), I want my buddy to notice when I kept trying, so that I feel proud even after a tricky lesson.**

- *Scenario 1:* **Given** I finish a lesson with 3+ hints used, **when** the end screen shows, **then** the buddy praises effort (e.g. 'You kept going!') rather than the score.

#### BUD-09 · Buddy wears shop items
`Must` · `S (2 pt)` · `MVP / S4` · Screens: C18 Buddy shop, C04 World map · [GitHub #53](https://github.com/SGGaita/trailbuddies/issues/53)

**As Zawadi (Sprout), I want my buddy to wear the outfit I bought everywhere, so that my buddy feels like mine.**

- *Scenario 1:* **Given** I equip a hat in the shop, **when** I return to the map or a lesson, **then** the buddy is shown wearing the hat.
- *Scenario 2:* **Given** I play on another device, **when** it syncs, **then** the same outfit is shown.

#### BUD-02 · Change buddy later
`Should` · `S (2 pt)` · `P4 / S21` · Screens: C03 Meet the buddies · [GitHub #172](https://github.com/SGGaita/trailbuddies/issues/172)

**As Zawadi (Sprout), I want to swap to a different buddy, so that I can try another friend.**

- *Scenario 1:* **Given** I'm on my map, **when** I open my buddy's menu and choose 'Change buddy', **then** Meet the buddies opens; my outfits stay with each buddy and my progress is unchanged.

#### BUD-10 · Buddy grows up with the learner
`Should` · `M (3 pt)` · `P4 / S21` · Screens: A01 Teen / adult home · [GitHub #173](https://github.com/SGGaita/trailbuddies/issues/173)

**As Nia (Voyager), I want my buddy to look and talk more grown-up as I get older, so that the app doesn't feel babyish.**

- *Scenario 1:* **Given** my age stage is 8–12, **when** I use the app, **then** the buddy uses its 'coach' art set and tone.
- *Scenario 2:* **Given** I'm a teen or adult, **when** I open settings, **then** I can switch the buddy to 'quiet' so it only appears when I ask.

#### BUD-11 · Three more buddies at launch
`Must` · `L (5 pt)` · `P4 / S21` · Screens: C03 Meet the buddies · [GitHub #174](https://github.com/SGGaita/trailbuddies/issues/174)

**As Zawadi (Sprout), I want a choice of four buddies, so that I can pick the one that matches me.**

- *Scenario 1:* **Given** the launch release is installed, **when** I open Meet the buddies, **then** four buddies, each with its own voice, animations and script, are available.

### MAP: World map & learning trail

#### MAP-01 · World map of subjects
`Must` · `M (3 pt)` · `MVP / S2` · Screens: C04 World map · [GitHub #24](https://github.com/SGGaita/trailbuddies/issues/24)

**As Amani (Seedling), I want a map where every subject is a place I can tap, so that I can choose what to learn by exploring.**

- *Scenario 1:* **Given** I'm on my world map, **when** it loads, **then** each available subject appears as an illustrated place with its name spoken when tapped once.
- *Scenario 2:* **Given** my parent picked interests, **when** the map loads, **then** those subjects are placed nearest the start.

#### MAP-02 · Winding subject trail
`Must` · `L (5 pt)` · `MVP / S2` · Screens: C05 Subject trail · [GitHub #25](https://github.com/SGGaita/trailbuddies/issues/25)

**As Zawadi (Sprout), I want a winding path of stepping stones for each subject, so that I can see where I am and what comes next.**

- *Scenario 1:* **Given** I tap Animals on the map, **when** the trail opens, **then** units appear as stage banners and lessons as numbered stones along one continuous path, scrolled to my next lesson.
- *Scenario 2:* **Given** a lesson is completed, **when** I return to the trail, **then** its stone shows 1–3 stars and the next stone glows.

#### MAP-09 · Friendly first visit
`Should` · `S (2 pt)` · `MVP / S2` · Screens: C29 First visit, offline & locked states · [GitHub #216](https://github.com/SGGaita/trailbuddies/issues/216)

**As Amani (Seedling), I want my first visit to the map to show me exactly where to start, so that I'm not confused by lots of places.**

- *Scenario 1:* **Given** I have no progress yet, **when** my map opens, **then** only the first subject place is highlighted, the buddy points to it and says 'Let's start here!', and other places are visible but quieter.

#### MAP-03 · Locked and unlocked units
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C05 Subject trail, C14 Unit checkpoint, C29 First visit, offline & locked states · [GitHub #48](https://github.com/SGGaita/trailbuddies/issues/48)

**As Zawadi (Sprout), I want later units to unlock when I pass the checkpoint, so that I build up step by step.**

- *Scenario 1:* **Given** I haven't passed the Farm animals checkpoint, **when** I tap a Wild animals stone, **then** the buddy says it unlocks after the trophy and points to it.
- *Scenario 2:* **Given** I pass the checkpoint, **when** I return to the trail, **then** the next unit's stones unlock with an animation.

#### MAP-07 · Review stones inserted automatically
`Must` · `S (2 pt)` · `MVP / S4` · Screens: C05 Subject trail, C10 Review lesson · [GitHub #58](https://github.com/SGGaita/trailbuddies/issues/58)

**As Zawadi (Sprout), I want review lessons to appear on my trail when I need practice, so that I don't forget things.**

- *Scenario 1:* **Given** some items are due for review, **when** I open the trail, **then** a review stone (different shape) appears before my next new lesson.

#### MAP-06 · Family & Class Island
`Must` · `M (3 pt)` · `MVP / S5` · Screens: C22 Family & class island, C04 World map · [GitHub #73](https://github.com/SGGaita/trailbuddies/issues/73)

**As Zawadi (Sprout), I want a special island on my map for lessons my family and teacher made, so that I can find them easily.**

- *Scenario 1:* **Given** my parent assigned me a custom lesson, **when** I open my map, **then** Family Island appears with a glowing marker for the new lesson.
- *Scenario 2:* **Given** my teacher assigned work, **when** I open my map, **then** a 'From your teacher' signpost appears on Class Island with due work first.

#### MAP-05 · Trail performance on budget tablets
`Must` · `M (3 pt)` · `MVP / S7` · Screens: C05 Subject trail · [GitHub #97](https://github.com/SGGaita/trailbuddies/issues/97)

**As Steve (developer), I want the trail to scroll smoothly on a budget Android tablet, so that children don't experience lag.**

- *Scenario 1:* **Given** a subject has 100+ stones, **when** the trail is scrolled on the reference tablet, **then** scrolling holds ~60 fps and only stones near the viewport are mounted.
- *Scenario 2:* **Given** any stone is tapped, **when** it's measured, **then** its touch target is at least 48 px.

#### MAP-04 · Cross-subject signposts
`Should` · `S (2 pt)` · `P4 / S18` · Screens: C05 Subject trail · [GitHub #160](https://github.com/SGGaita/trailbuddies/issues/160)

**As Leo (Explorer), I want a signpost when a unit needs something from another subject, so that I know where to go first.**

- *Scenario 1:* **Given** Time → Reading the clock needs Numbers → Counting by 5s, **when** I tap the locked unit, **then** a signpost says 'Visit Numbers Mountain first!' and tapping it opens that unit.

#### MAP-08 · Regions for higher bands
`Could` · `M (3 pt)` · `P5` · Screens: C04 World map · [GitHub #203](https://github.com/SGGaita/trailbuddies/issues/203)

**As Nia (Voyager), I want each subject place to grow new regions as I level up, so that the trail keeps going.**

- *Scenario 1:* **Given** I reach Voyager units in Numbers, **when** I open the map, **then** Numbers Mountain shows a new 'summit' region with Voyager units.

### LES: Lessons & exercises

#### LES-01 · Lesson runner
`Must` · `M (3 pt)` · `MVP / S1` · Screens: C07 Lesson: listen & tap · [GitHub #14](https://github.com/SGGaita/trailbuddies/issues/14)

**As Amani (Seedling), I want a short lesson of 5–8 quick activities with a progress bar, so that I finish before I get bored.**

- *Scenario 1:* **Given** I tap a lesson stone, **when** the lesson starts, **then** a progress bar shows activities left, and each activity renders the exercise type from the lesson spec.
- *Scenario 2:* **Given** I tap the exit button, **when** I confirm with the buddy, **then** I return to the trail and partial progress is saved for answered items.

#### LES-02 · Exercise: listen & tap
`Must` · `S (2 pt)` · `MVP / S1` · Screens: C07 Lesson: listen & tap · [GitHub #15](https://github.com/SGGaita/trailbuddies/issues/15)

**As Amani (Seedling), I want to hear a word and tap the matching picture, so that I learn without reading.**

- *Scenario 1:* **Given** the exercise starts, **when** the prompt plays, **then** 2–4 pictures show depending on band and the prompt can be replayed with a speaker button.
- *Scenario 2:* **Given** I tap the right picture, **when** it's checked, **then** it's marked correct with sound and the buddy reacts.

#### LES-03 · Exercise: match pairs
`Must` · `S (2 pt)` · `MVP / S1` · Screens: C08 Lesson: match pairs · [GitHub #16](https://github.com/SGGaita/trailbuddies/issues/16)

**As Zawadi (Sprout), I want to match pictures with words or sounds by dragging or tapping, so that I connect what I see and hear.**

- *Scenario 1:* **Given** 3–5 pairs are shown, **when** I drag or tap-tap a picture to its partner, **then** a correct pair locks together; a wrong pair springs back with a hint after 2 misses.

#### LES-04 · Exercise: count
`Must` · `S (2 pt)` · `MVP / S1` · Screens: C07 Lesson: listen & tap · [GitHub #17](https://github.com/SGGaita/trailbuddies/issues/17)

**As Amani (Seedling), I want to count objects and tap the number, so that I practise counting.**

- *Scenario 1:* **Given** objects are shown, **when** I tap each object, **then** it is highlighted and counted aloud; then I tap the matching numeral.

#### LES-05 · Exercise: name it
`Must` · `S (2 pt)` · `MVP / S1` · Screens: C07 Lesson: listen & tap · [GitHub #18](https://github.com/SGGaita/trailbuddies/issues/18)

**As Leo (Explorer), I want to see a picture and choose its name, so that I practise recognising words.**

- *Scenario 1:* **Given** I'm a reader (Explorer), **when** the exercise shows, **then** options are written words; for non-readers the options are spoken on tap.

#### LES-16 · Lesson complete screen
`Must` · `S (2 pt)` · `MVP / S1` · Screens: C12 Lesson complete · [GitHub #19](https://github.com/SGGaita/trailbuddies/issues/19)

**As Zawadi (Sprout), I want a finish screen with my stars and treasures, so that I know how I did and feel rewarded.**

- *Scenario 1:* **Given** I finish the last activity, **when** the end screen shows, **then** 1–3 stars based on first-try accuracy, treasures earned, and buttons for 'Next lesson' and 'Back to trail'.
- *Scenario 2:* **Given** I earned a badge in the lesson, **when** the end screen finishes, **then** the badge celebration plays next.

#### LES-17 · Everything is spoken for non-readers
`Must` · `S (2 pt)` · `MVP / S1` · Screens: C07 Lesson: listen & tap · [GitHub #20](https://github.com/SGGaita/trailbuddies/issues/20)

**As Amani (Seedling), I want every instruction to be spoken, so that I can use the app before I can read.**

- *Scenario 1:* **Given** I'm Seedling or Sprout band, **when** any screen shows an instruction, **then** it's spoken automatically and a speaker button replays it.

#### LES-06 · Exercise: compare
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C07 Lesson: listen & tap · [GitHub #42](https://github.com/SGGaita/trailbuddies/issues/42)

**As Zawadi (Sprout), I want to choose which group has more, fewer or the same, so that I understand comparing.**

- *Scenario 1:* **Given** two groups are shown, **when** I tap the bigger group, **then** it's checked and the buddy explains by counting both.

#### LES-07 · Exercise: sequence
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C08 Lesson: match pairs · [GitHub #43](https://github.com/SGGaita/trailbuddies/issues/43)

**As Zawadi (Sprout), I want to put 3–5 cards in order, so that I learn routines, life cycles and order.**

- *Scenario 1:* **Given** cards are shuffled, **when** I drag them into slots, **then** the order is checked when the last slot is filled and wrong cards wiggle.

#### LES-08 · Exercise: sort into bins
`Must` · `M (3 pt)` · `MVP / S3` · Screens: C09 Lesson: sort into bins · [GitHub #44](https://github.com/SGGaita/trailbuddies/issues/44)

**As Zawadi (Sprout), I want to drag items into 2–4 labelled baskets, so that I learn categories like land, water and air.**

- *Scenario 1:* **Given** items and labelled bins are shown, **when** I drop an item in a bin, **then** a correct drop stays; a wrong drop bounces back with the bin's label spoken.

#### LES-09 · Exercise: odd one out
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C07 Lesson: listen & tap · [GitHub #45](https://github.com/SGGaita/trailbuddies/issues/45)

**As Leo (Explorer), I want to spot the item that doesn't belong, so that I think about categories.**

- *Scenario 1:* **Given** 4 items are shown, **when** I tap the odd one, **then** the buddy explains why it doesn't belong.

#### LES-10 · Exercise: case-match
`Must` · `S (2 pt)` · `MVP / S3` · Screens: C08 Lesson: match pairs · [GitHub #46](https://github.com/SGGaita/trailbuddies/issues/46)

**As Zawadi (Sprout), I want to match capital and small letters, so that I learn both forms.**

- *Scenario 1:* **Given** letter tiles are shown, **when** I match A to a, **then** the pair locks and the letter sound plays.

#### LES-11 · Exercise: build a word
`Must` · `M (3 pt)` · `MVP / S3` · Screens: C07 Lesson: listen & tap, C27 Exercise: build a word · [GitHub #47](https://github.com/SGGaita/trailbuddies/issues/47)

**As Zawadi (Sprout), I want to drag letter tiles to spell a word, so that I practise spelling.**

- *Scenario 1:* **Given** a picture and empty slots are shown, **when** I drag letters into slots, **then** each letter's sound plays and the word is read when complete.

#### LES-18 · Recorded audio overrides device voice
`Must` · `S (2 pt)` · `MVP / S7` · Screens: P11 Lesson Builder: add card · [GitHub #96](https://github.com/SGGaita/trailbuddies/issues/96)

**As Grace (parent), I want my own recordings to replace the device voice where I made them, so that my child hears a familiar voice.**

- *Scenario 1:* **Given** I recorded the word 'Daisy' on a custom card, **when** the card is spoken, **then** my recording plays instead of the voice pack or device voice.

#### LES-19 · Record letter sounds once for every lesson
`Should` · `M (3 pt)` · `P2 / S8` · Screens: P28 Record letter sounds · [GitHub #221](https://github.com/SGGaita/trailbuddies/issues/221)

**As Grace (parent), I want to record each letter and digraph sound once in a dedicated grown-ups screen, so that my child hears clean, correct phonics sounds everywhere instead of the device voice's approximations.**

- *Scenario 1:* **Given** I open 'Letter sounds' in the grown-up zone, **when** the screen loads, **then** every sound (a–z and digraphs such as sh, ch, th, ee) is listed with record, play and 'use device voice' controls and a count of how many are recorded.
- *Scenario 2:* **Given** I record /sh/, **when** I play any lesson that uses /sh/ on any of the family's devices, **then** my recording plays instead of the voice pack or device voice.
- *Scenario 3:* **Given** microphone permission is denied, **when** I tap record, **then** I see how to enable it, and nothing else on the screen breaks.

#### LES-12 · Exercise: trace
`Should` · `L (5 pt)` · `P4 / S18` · Screens: C07 Lesson: listen & tap, C25 Exercise: trace · [GitHub #157](https://github.com/SGGaita/trailbuddies/issues/157)

**As Zawadi (Sprout), I want to trace letters, numbers and shapes with my finger, so that I learn to write them.**

- *Scenario 1:* **Given** a letter outline with start dot and arrow is shown, **when** I trace, **then** strokes within tolerance in the right order complete the letter; off-path strokes show a gentle retry.

#### LES-13 · Exercise: clock setter
`Should` · `M (3 pt)` · `P4 / S18` · Screens: C07 Lesson: listen & tap, C26 Exercise: clock setter · [GitHub #158](https://github.com/SGGaita/trailbuddies/issues/158)

**As Leo (Explorer), I want to drag clock hands to show a time, so that I learn to read clocks.**

- *Scenario 1:* **Given** a target time is said and shown, **when** I drag the hands, **then** the minute hand snaps to 5-minute steps and the answer is checked when I tap Done.

#### LES-14 · Exercise: true or false
`Should` · `S (2 pt)` · `P4 / S18` · Screens: C07 Lesson: listen & tap, C28 Exercise: true or false · [GitHub #159](https://github.com/SGGaita/trailbuddies/issues/159)

**As Leo (Explorer), I want to judge whether the buddy's claim is true, so that I think critically.**

- *Scenario 1:* **Given** the buddy says 'A bat is a bird', **when** I tap thumbs down, **then** it's correct and the buddy gives the reason.

#### LES-15 · Older-band exercise types
`Should` · `XL (8 pt)` · `P5` · Screens: A01 Teen / adult home · [GitHub #202](https://github.com/SGGaita/trailbuddies/issues/202)

**As Nia (Voyager), I want typed answers, labelling diagrams, read-and-answer and multi-step problems, so that lessons challenge me.**

- *Scenario 1:* **Given** I'm in a Voyager unit, **when** an exercise asks for a typed number, **then** a numeric keypad appears and answers are checked with forgiving matching.
- *Scenario 2:* **Given** a diagram exercise appears, **when** I drag labels onto the diagram, **then** each label snaps to its target zone and is checked.

### ADP: Adaptive learning

#### ADP-01 · Difficulty adjusts automatically
`Must` · `M (3 pt)` · `MVP / S1` · [GitHub #9](https://github.com/SGGaita/trailbuddies/issues/9)

**As Leo (Explorer), I want lessons to get harder when I'm doing well and easier when I'm struggling, so that I'm always challenged but not stuck.**

- *Scenario 1:* **Given** I get 3 stars in two consecutive lessons in a subject, **when** the next lesson is generated, **then** difficulty within my band increases (more options, fewer hints).
- *Scenario 2:* **Given** I get 1 star in two consecutive lessons, **when** the next lesson is generated, **then** difficulty decreases.

#### ADP-03 · Item mastery tracking
`Must` · `S (2 pt)` · `MVP / S1` · [GitHub #10](https://github.com/SGGaita/trailbuddies/issues/10)

**As Steve (developer), I want a mastery score per child per item, so that weak items can be reviewed and shown to parents.**

- *Scenario 1:* **Given** an item is answered, **when** the event is processed, **then** seen and first-try-correct counts update and mastery is recalculated in the shared domain package.

#### ADP-04 · Spaced review
`Must` · `M (3 pt)` · `MVP / S1` · Screens: C05 Subject trail, C10 Review lesson · [GitHub #11](https://github.com/SGGaita/trailbuddies/issues/11)

**As Zawadi (Sprout), I want things I found hard to come back later, so that I remember them.**

- *Scenario 1:* **Given** an item's mastery is below threshold, **when** time passes, **then** the item is scheduled for review at 1, 3, 7 and 14 days and included in a review lesson.

#### ADP-02 · Parent can lock the level
`Should` · `S (2 pt)` · `MVP / S6` · Screens: P09 Child progress · [GitHub #81](https://github.com/SGGaita/trailbuddies/issues/81)

**As Grace (parent), I want to lock a child's difficulty in a subject, so that I can stop it moving if I know better.**

- *Scenario 1:* **Given** I set Numbers to 'Locked: easier' for Amani, **when** lessons are generated, **then** difficulty no longer adjusts in Numbers for Amani.

#### ADP-05 · Placement quiz
`Should` · `M (3 pt)` · `MVP / S6` · Screens: C05 Subject trail, C06 Placement quiz · [GitHub #82](https://github.com/SGGaita/trailbuddies/issues/82)

**As Leo (Explorer), I want a quick quiz to skip what I already know, so that I don't waste time on easy lessons.**

- *Scenario 1:* **Given** I open a subject for the first time, **when** I choose 'Show what you know', **then** a 2-minute adaptive quiz runs and units I pass are marked complete with bronze stars.

#### ADP-06 · Different band per subject
`Should` · `S (2 pt)` · `P4 / S20` · [GitHub #165](https://github.com/SGGaita/trailbuddies/issues/165)

**As Leo (Explorer), I want to be at a higher level in subjects I'm strong in, so that each subject fits me.**

- *Scenario 1:* **Given** Leo placed into Voyager in Planets, **when** he opens Time, **then** Time still starts at his age band.

#### ADP-07 · Legendary replay
`Could` · `S (2 pt)` · `P4 / S20` · Screens: C05 Subject trail · [GitHub #166](https://github.com/SGGaita/trailbuddies/issues/166)

**As Leo (Explorer), I want to replay finished units at a harder setting, so that I can earn more and stay challenged.**

- *Scenario 1:* **Given** I've completed a unit, **when** I tap its banner and choose 'Legendary', **then** the unit replays at the next band's settings and awards bonus treasures.

### GAM: Games

#### GAM-01 · Jigsaw puzzle from any picture
`Must` · `M (3 pt)` · `MVP / S4` · Screens: C15 Game: jigsaw · [GitHub #54](https://github.com/SGGaita/trailbuddies/issues/54)

**As Amani (Seedling), I want to do a jigsaw of a picture, so that I have fun and practise problem-solving.**

- *Scenario 1:* **Given** a jigsaw opens, **when** my band is Seedling, **then** the picture splits into 4 pieces with a faint outline to guide placement.
- *Scenario 2:* **Given** I'm Sprout or Explorer, **when** it opens, **then** 9 or 16 pieces are used.
- *Scenario 3:* **Given** I place the last piece, **when** it snaps in, **then** the full picture is shown, named aloud, and treasures are awarded.

#### GAM-03 · Memory flip
`Must` · `M (3 pt)` · `MVP / S4` · Screens: C16 Game: memory · [GitHub #55](https://github.com/SGGaita/trailbuddies/issues/55)

**As Zawadi (Sprout), I want to flip cards and find matching pairs, so that I practise memory with things I've learnt.**

- *Scenario 1:* **Given** a memory game starts with items from a completed unit, **when** I flip two cards, **then** a match stays face up with the word spoken; a non-match flips back after 1 second.
- *Scenario 2:* **Given** I'm Seedling, **when** the game starts, **then** 6 cards are used; Sprout 8; Explorer 12.

#### GAM-04 · Games corner
`Must` · `S (2 pt)` · `MVP / S4` · Screens: C17 Games corner · [GitHub #56](https://github.com/SGGaita/trailbuddies/issues/56)

**As Leo (Explorer), I want a place to choose any unlocked game, so that I can play with what I've learnt.**

- *Scenario 1:* **Given** I open Games corner, **when** it loads, **then** unlocked games show with the topic they'll use; locked games show what unlocks them.
- *Scenario 2:* **Given** I start a game, **when** I choose a topic I've completed, **then** the game uses that topic's items.

#### GAM-05 · Games use any item set
`Must` · `S (2 pt)` · `MVP / S4` · [GitHub #57](https://github.com/SGGaita/trailbuddies/issues/57)

**As Steve (developer), I want every game to accept any item set (built-in or custom), so that new content works in games without code changes.**

- *Scenario 1:* **Given** a custom lesson with 6 cards exists, **when** the memory game is launched with it, **then** the game runs using those cards' images and audio.

#### GAM-02 · Jigsaw from a parent's photo
`Must` · `S (2 pt)` · `MVP / S5` · Screens: C15 Game: jigsaw, P12 Lesson Builder: template & assign · [GitHub #72](https://github.com/SGGaita/trailbuddies/issues/72)

**As Grace (parent), I want to turn one of my photos into a jigsaw, so that my child can puzzle over our own dog or grandparents.**

- *Scenario 1:* **Given** I use the 'Picture puzzle' template with my photo, **when** my child opens it, **then** the jigsaw uses my photo and after completion asks the question I set (e.g. 'Who is this?').

#### GAM-06 · Sorting race
`Should` · `M (3 pt)` · `P4 / S19` · Screens: C17 Games corner · [GitHub #161](https://github.com/SGGaita/trailbuddies/issues/161)

**As Zawadi (Sprout), I want items to fall and me to drag them into the right basket, so that sorting feels exciting.**

- *Scenario 1:* **Given** the game starts, **when** items fall slowly, **then** speed increases gently with correct sorts and never ends the game on mistakes.

#### GAM-07 · Maze to the answer
`Could` · `M (3 pt)` · `P4 / S19` · Screens: C17 Games corner · [GitHub #162](https://github.com/SGGaita/trailbuddies/issues/162)

**As Zawadi (Sprout), I want to guide my buddy through a maze to the right answer, so that practice feels like play.**

- *Scenario 1:* **Given** a maze with three answer exits shows, **when** I trace a path to an exit, **then** the buddy walks it and reacts to the answer chosen.

#### GAM-08 · Subject games pack
`Should` · `XL (8 pt)` · `P4 / S19` · Screens: C17 Games corner · [GitHub #163](https://github.com/SGGaita/trailbuddies/issues/163)

**As Leo (Explorer), I want subject-specific games (planet line-up, what to wear, colour mixer, tangram, timeline ladder, feed the animal), so that each subject has a signature game.**

- *Scenario 1:* **Given** I've completed the relevant unit, **when** I open Games corner, **then** the subject's signature game is available.

#### GAM-09 · Quiz show
`Could` · `M (3 pt)` · `P4 / S19` · Screens: C17 Games corner · [GitHub #164](https://github.com/SGGaita/trailbuddies/issues/164)

**As Leo (Explorer), I want a 10-question quiz show hosted by my buddy across units I've finished, so that I can test myself.**

- *Scenario 1:* **Given** I've completed 3+ units, **when** I start Quiz show, **then** 10 mixed questions are drawn from my completed units and I get a final score with a personal best.

### RWD: Rewards: stars, treasures & shop

#### RWD-01 · Earn stars per lesson
`Must` · `S (2 pt)` · `MVP / S1` · Screens: C12 Lesson complete · [GitHub #21](https://github.com/SGGaita/trailbuddies/issues/21)

**As Zawadi (Sprout), I want to earn 1–3 stars for each lesson, so that I can see how well I did.**

- *Scenario 1:* **Given** I finish a lesson, **when** my first-try accuracy is ≥90%, **then** I get 3 stars.
- *Scenario 2:* **Given** accuracy is 60–89%, **when** I finish, **then** I get 2 stars; below 60% I still get 1 star.
- *Scenario 3:* **Given** I replay and do better, **when** I finish, **then** the stone keeps my best stars.

#### RWD-02 · Stars never decrease
`Must` · `XS (1 pt)` · `MVP / S4` · Screens: C18 Buddy shop · [GitHub #59](https://github.com/SGGaita/trailbuddies/issues/59)

**As Zawadi (Sprout), I want stars to be a record of learning that's never spent, so that my progress never goes backwards.**

- *Scenario 1:* **Given** I buy something in the shop, **when** the purchase completes, **then** my star total is unchanged and only treasures are deducted.

#### RWD-03 · Earn treasures
`Must` · `M (3 pt)` · `MVP / S4` · Screens: C12 Lesson complete · [GitHub #60](https://github.com/SGGaita/trailbuddies/issues/60)

**As Zawadi (Sprout), I want to earn treasures for lessons, daily goals, perfect lessons, badges and games, so that I can save up for things.**

- *Scenario 1:* **Given** I complete a lesson, **when** rewards are calculated, **then** treasures are added according to the economy config and a count-up animation plays.
- *Scenario 2:* **Given** I've hit today's earning cap, **when** I complete another lesson, **then** stars are still awarded but treasures are not, without telling me I'm capped.

#### RWD-04 · Wallet from transactions
`Must` · `M (3 pt)` · `MVP / S4` · [GitHub #61](https://github.com/SGGaita/trailbuddies/issues/61)

**As Steve (developer), I want the treasure balance to be computed from an append-only transaction log, so that balances never desync across devices.**

- *Scenario 1:* **Given** treasures were earned on two devices offline, **when** both sync, **then** the balance equals the sum of all transactions.
- *Scenario 2:* **Given** a spend would take the server balance below zero after merge, **when** sync runs, **then** the spend is reversed, the item returned to the shop and the child sees a gentle message.

#### RWD-05 · Buddy shop
`Must` · `M (3 pt)` · `MVP / S4` · Screens: C18 Buddy shop · [GitHub #62](https://github.com/SGGaita/trailbuddies/issues/62)

**As Zawadi (Sprout), I want to spend treasures on outfits for my buddy, so that I can make my buddy look the way I like.**

- *Scenario 1:* **Given** I open the shop, **when** it loads, **then** items show price, a 'try on' preview and whether I can afford them.
- *Scenario 2:* **Given** I tap Buy on an item I can afford, **when** I confirm, **then** treasures are deducted, the item goes to my wardrobe and the buddy wears it.
- *Scenario 3:* **Given** I can't afford it, **when** I tap it, **then** the buddy says how many more treasures I need and offers to add it to my wishes.

#### RWD-08 · Daily goal and gentle streak
`Must` · `S (2 pt)` · `MVP / S4` · Screens: C04 World map, C12 Lesson complete · [GitHub #63](https://github.com/SGGaita/trailbuddies/issues/63)

**As Zawadi (Sprout), I want a daily goal and a streak that doesn't punish me for missing a day, so that I want to come back without feeling bad.**

- *Scenario 1:* **Given** my daily goal is 2 lessons, **when** I finish my second lesson, **then** today fills in on the week strip and the buddy cheers.
- *Scenario 2:* **Given** I miss a day, **when** I return, **then** up to 2 rest days a week are used automatically and nothing I've earned is lost.

#### RWD-09 · Economy config is tunable
`Must` · `S (2 pt)` · `MVP / S4` · [GitHub #64](https://github.com/SGGaita/trailbuddies/issues/64)

**As Steve (developer), I want earning amounts, caps and prices to live in one config, so that I can balance the economy without code changes.**

- *Scenario 1:* **Given** I change the treasures per perfect lesson in the config, **when** content is released, **then** new lessons award the new amount on all clients.

#### RWD-06 · Treasure room
`Should` · `L (5 pt)` · `P4 / S21` · Screens: C19 Treasure room · [GitHub #177](https://github.com/SGGaita/trailbuddies/issues/177)

**As Zawadi (Sprout), I want to decorate my buddy's room with furniture, wallpaper and pets, so that I have a cosy place that's mine.**

- *Scenario 1:* **Given** I own room items, **when** I open the treasure room, **then** I can drag items to placement spots, and the layout saves and syncs.

#### RWD-07 · Sticker albums with no randomness
`Should` · `M (3 pt)` · `P4 / S21` · Screens: C19 Treasure room · [GitHub #178](https://github.com/SGGaita/trailbuddies/issues/178)

**As Zawadi (Sprout), I want to buy sticker packs that show exactly what's inside, so that I know what I'm getting.**

- *Scenario 1:* **Given** I view a sticker pack, **when** I open its details, **then** every sticker in the pack is shown before I buy; there are no random draws.

#### RWD-10 · Game unlocks and trail decorations
`Could` · `M (3 pt)` · `P4 / S21` · Screens: C18 Buddy shop · [GitHub #179](https://github.com/SGGaita/trailbuddies/issues/179)

**As Leo (Explorer), I want to spend treasures on extra game themes and trail decorations, so that there's more to save up for.**

- *Scenario 1:* **Given** I buy a 'space' theme for memory, **when** I start memory, **then** I can pick the space card backs.

### BDG: Badges & achievements

#### BDG-01 · Badge rule engine
`Must` · `M (3 pt)` · `MVP / S4` · [GitHub #49](https://github.com/SGGaita/trailbuddies/issues/49)

**As Steve (developer), I want badge rules evaluated on the device after every lesson and game, so that badges appear instantly, even offline.**

- *Scenario 1:* **Given** a badge rule 'complete 10 three-star lessons' exists, **when** the 10th 3-star lesson completes offline, **then** the badge is awarded immediately and an award event is queued for sync.
- *Scenario 2:* **Given** the same badge was already awarded on another device, **when** sync merges, **then** the learner has the badge once.

#### BDG-02 · 15 built-in badges for the MVP
`Must` · `M (3 pt)` · `MVP / S4` · Screens: C20 Badge book · [GitHub #50](https://github.com/SGGaita/trailbuddies/issues/50)

**As Zawadi (Sprout), I want badges for learning milestones, mastery, effort, consistency and exploring, so that I have goals to aim for.**

- *Scenario 1:* **Given** the MVP is released, **when** I open the badge book, **then** 15 badges across those categories are listed, earned ones in colour and unearned ones as silhouettes with how to earn them spoken on tap.

#### BDG-03 · Badge celebration
`Must` · `S (2 pt)` · `MVP / S4` · Screens: C13 Badge earned · [GitHub #51](https://github.com/SGGaita/trailbuddies/issues/51)

**As Amani (Seedling), I want a big celebration when I earn a badge, so that I feel proud.**

- *Scenario 1:* **Given** I earn a badge, **when** the lesson or game ends, **then** a full-screen celebration plays with the buddy's voice line, the badge flies into the badge book, and treasures count up.

#### BDG-06 · Weekly badge digest for parents
`Should` · `S (2 pt)` · `P2 / S8` · Screens: P18 Settings, limits & privacy · [GitHub #107](https://github.com/SGGaita/trailbuddies/issues/107)

**As Grace (parent), I want a weekly summary of badges my children earned, so that I can celebrate with them.**

- *Scenario 1:* **Given** it's Sunday evening in my time zone, **when** the digest job runs, **then** I receive an email listing each child's badges and time learnt this week, and can switch it off.

#### BDG-04 · Badge tiers
`Should` · `S (2 pt)` · `P2 / S11` · Screens: C20 Badge book, T05 Teacher Badge Studio · [GitHub #135](https://github.com/SGGaita/trailbuddies/issues/135)

**As Leo (Explorer), I want badges with bronze, silver and gold levels, so that I can keep improving.**

- *Scenario 1:* **Given** I have bronze 'Perfect Ten', **when** I reach 25 perfect lessons, **then** the badge upgrades to silver with a smaller celebration.

#### BDG-07 · Badges can't be taken away
`Must` · `XS (1 pt)` · `P2 / S11` · Screens: C20 Badge book · [GitHub #136](https://github.com/SGGaita/trailbuddies/issues/136)

**As Zawadi (Sprout), I want badges I've earned to stay mine, so that I trust the rewards.**

- *Scenario 1:* **Given** a grown-up deletes a custom badge rule, **when** I view my badge book, **then** badges I already earned remain; a grown-up can hide a badge but not revoke it.

#### BDG-05 · Hidden surprise badges
`Could` · `S (2 pt)` · `P4 / S21` · Screens: C20 Badge book · [GitHub #169](https://github.com/SGGaita/trailbuddies/issues/169)

**As Leo (Explorer), I want secret badges I discover by accident, so that exploring is surprising.**

- *Scenario 1:* **Given** a hidden badge exists, **when** I view the badge book, **then** it shows as '???' until earned, then plays a special buddy dance.

### BST: Badge Studio & Wish list

#### BST-01 · Design a custom badge
`Must` · `M (3 pt)` · `P2 / S11` · Screens: P14 Badge Studio: design · [GitHub #137](https://github.com/SGGaita/trailbuddies/issues/137)

**As Grace (parent), I want to design a badge with a shape, colour, icon or my own image, and a name, so that rewards match what matters in our family.**

- *Scenario 1:* **Given** I open Badge Studio, **when** I pick a shape, colour and icon and name it 'Garden Helper', **then** a live preview shows the badge.
- *Scenario 2:* **Given** I upload an image, **when** it passes safety checks, **then** it's cropped into the badge shape with EXIF stripped.
- *Scenario 3:* **Given** I record a message, **when** the badge is earned, **then** my recorded message plays during the celebration.

#### BST-02 · Set how a custom badge is earned
`Must` · `L (5 pt)` · `P2 / S11` · Screens: P15 Badge Studio: rule & reward, T05 Teacher Badge Studio · [GitHub #138](https://github.com/SGGaita/trailbuddies/issues/138)

**As Ms Priya (teacher), I want to choose a rule: complete content, reach a count, streak, mastery, assignment, manual award or a combination, so that badges reward exactly the behaviour I want.**

- *Scenario 1:* **Given** I choose 'Complete content' and pick my 'Week 3 spelling' lesson, **when** I save, **then** the badge is awarded automatically when a learner completes it.
- *Scenario 2:* **Given** I choose 'Combination', **when** I add up to 3 conditions with AND/OR, **then** the rule summary reads back in plain English before saving.
- *Scenario 3:* **Given** I choose 'Manual award', **when** I save, **then** the badge appears in my 'Award' list for chosen learners.

#### BST-03 · Attach treasures to a custom badge
`Must` · `S (2 pt)` · `P2 / S11` · Screens: P15 Badge Studio: rule & reward · [GitHub #139](https://github.com/SGGaita/trailbuddies/issues/139)

**As Grace (parent), I want to give treasures when a custom badge is earned, so that my child can spend the reward in the shop.**

- *Scenario 1:* **Given** I set 50 treasures, **when** the value is within the cap, **then** it's saved.
- *Scenario 2:* **Given** I enter more than the per-badge cap, **when** I try to save, **then** I'm told the maximum and why (to keep the economy fair).

#### BST-04 · Real-world reward on a badge
`Must` · `M (3 pt)` · `P2 / S11` · Screens: P15 Badge Studio: rule & reward, P16 Wishes & awards, C21 My wishes · [GitHub #140](https://github.com/SGGaita/trailbuddies/issues/140)

**As Tom (second parent), I want to attach a real-world reward like 'Pick Friday's movie', so that the app connects to rewards at home.**

- *Scenario 1:* **Given** I add a real-world reward to a badge, **when** Leo earns it, **then** the reward appears on Leo's wishes as 'earned' and on my 'To deliver' list.
- *Scenario 2:* **Given** I mark it delivered, **when** Leo next opens his wishes, **then** it shows as delivered with a thank-you animation.

#### BST-05 · Manually award a badge remotely
`Must` · `S (2 pt)` · `P2 / S11` · Screens: P16 Wishes & awards · [GitHub #141](https://github.com/SGGaita/trailbuddies/issues/141)

**As Tom (second parent), I want to award a badge from my phone for something done at home, so that I can reward real-world effort while I'm away.**

- *Scenario 1:* **Given** Leo tidied his room, **when** I tap Award on 'Tidy Champion' and choose Leo, **then** Leo sees the celebration the next time he opens the app.

#### BST-06 · Choose who can earn a badge
`Must` · `S (2 pt)` · `P2 / S11` · Screens: P15 Badge Studio: rule & reward, T05 Teacher Badge Studio · [GitHub #142](https://github.com/SGGaita/trailbuddies/issues/142)

**As Ms Priya (teacher), I want to make a badge available to one child, several children or a whole class, so that rewards fit the group.**

- *Scenario 1:* **Given** I select 'Class 1B', **when** I save the badge, **then** every enrolled learner can earn it and new joiners get it automatically.

#### BST-07 · Wish list (save up for real rewards)
`Should` · `M (3 pt)` · `P2 / S11` · Screens: C21 My wishes, P16 Wishes & awards · [GitHub #143](https://github.com/SGGaita/trailbuddies/issues/143)

**As Zawadi (Sprout), I want to save treasures towards a reward my parent set up, like 'a story of my choice', so that I have a big goal.**

- *Scenario 1:* **Given** my parent created the wish '50 treasures = bedtime story of your choice', **when** I open my wishes, **then** it shows progress towards 50 treasures.
- *Scenario 2:* **Given** I have enough, **when** I tap 'Ask for it', **then** treasures are held and my parent gets an approval request.
- *Scenario 3:* **Given** my parent approves, **when** it's delivered, **then** the treasures are spent; if declined they are returned.

#### BST-08 · Badge Studio safety checks
`Must` · `S (2 pt)` · `P2 / S11` · [GitHub #144](https://github.com/SGGaita/trailbuddies/issues/144)

**As Steve (developer), I want uploaded badge images checked like lesson uploads, so that nothing inappropriate appears to children.**

- *Scenario 1:* **Given** a badge image is uploaded, **when** it's processed, **then** EXIF is stripped, size limits apply and the automated content scan runs; flagged images are rejected with a reason.

### BLD: Lesson Builder & custom trails

#### BLD-01 · Create a card with photo, word and voice
`Must` · `M (3 pt)` · `MVP / S5` · Screens: P11 Lesson Builder: add card · [GitHub #65](https://github.com/SGGaita/trailbuddies/issues/65)

**As Grace (parent), I want to add a card with a photo (camera or upload), a label and my voice, so that I can teach my child about our world.**

- *Scenario 1:* **Given** I open 'Add card', **when** I take a photo, **then** it's square-cropped, resized and EXIF-stripped on my device and shown immediately.
- *Scenario 2:* **Given** I hold the record button and say 'Daisy the cow', **when** I release, **then** a clip of up to 10 seconds is saved, trimmed and playable.
- *Scenario 3:* **Given** I don't record, **when** the card is used, **then** the label is spoken by the voice pack or device voice.

#### BLD-02 · Pick from the illustration library
`Must` · `S (2 pt)` · `MVP / S5` · Screens: P11 Lesson Builder: add card · [GitHub #66](https://github.com/SGGaita/trailbuddies/issues/66)

**As Ms Priya (teacher), I want to pick a picture from the built-in illustration library, so that I can make lessons without taking photos.**

- *Scenario 1:* **Given** I tap 'Library' on a card, **when** I search 'giraffe', **then** matching illustrations show and the chosen one is attached.

#### BLD-04 · Choose a lesson template
`Must` · `M (3 pt)` · `MVP / S5` · Screens: P12 Lesson Builder: template & assign · [GitHub #67](https://github.com/SGGaita/trailbuddies/issues/67)

**As Grace (parent), I want to choose a template like 'Learn the names', 'Sort them' or 'Picture puzzle', so that the app builds the activities for me.**

- *Scenario 1:* **Given** I have 6 cards, **when** I choose 'Learn the names', **then** a lesson of explore → listen & tap → match → name it is generated.
- *Scenario 2:* **Given** a template needs something missing (e.g. Sort needs 2+ categories), **when** I select it, **then** I'm told what to add.

#### BLD-07 · Preview as child
`Must` · `S (2 pt)` · `MVP / S5` · Screens: P12 Lesson Builder: template & assign · [GitHub #68](https://github.com/SGGaita/trailbuddies/issues/68)

**As Grace (parent), I want to play my lesson as my child would before assigning it, so that I can check it works.**

- *Scenario 1:* **Given** I tap 'Preview as child', **when** the preview runs, **then** the lesson plays in the child UI with a 'Preview' banner and no progress or rewards are recorded.

#### BLD-08 · Assign a custom lesson to my children
`Must` · `S (2 pt)` · `MVP / S5` · Screens: P12 Lesson Builder: template & assign, C22 Family & class island · [GitHub #69](https://github.com/SGGaita/trailbuddies/issues/69)

**As Grace (parent), I want to choose which of my children get a lesson, so that each child gets what fits them.**

- *Scenario 1:* **Given** I assign 'Our Pets' to Amani and Zawadi, **when** they open their maps, **then** the lesson appears on Family Island for both.

#### BLD-09 · Edit and version custom lessons
`Must` · `S (2 pt)` · `MVP / S5` · Screens: P10 Lesson Builder: cards · [GitHub #70](https://github.com/SGGaita/trailbuddies/issues/70)

**As Ms Priya (teacher), I want to edit a lesson after it's been played, so that I can fix mistakes without breaking progress.**

- *Scenario 1:* **Given** learners have progress on my lesson, **when** I add two cards, **then** existing progress is kept (stable item IDs) and the new cards appear in the next session.

#### BLD-15 · Offline-first media upload
`Must` · `M (3 pt)` · `MVP / S5` · Screens: P11 Lesson Builder: add card, P26 Errors, offline & storage states · [GitHub #71](https://github.com/SGGaita/trailbuddies/issues/71)

**As Grace (parent), I want my photos and recordings to work immediately and upload in the background, so that I never lose a card because the Wi-Fi dropped.**

- *Scenario 1:* **Given** I'm offline, **when** I save a card with a photo, **then** the card works on this device straight away and an upload is queued.
- *Scenario 2:* **Given** I reconnect, **when** the app is in the foreground or regains connectivity, **then** queued uploads retry and the card switches to the cloud copy.

#### BLD-16 · See and retry failed uploads
`Should` · `S (2 pt)` · `MVP / S5` · Screens: P26 Errors, offline & storage states · [GitHub #217](https://github.com/SGGaita/trailbuddies/issues/217)

**As Grace (parent), I want to see which photos or recordings haven't uploaded yet and retry them, so that I know my cards are safe.**

- *Scenario 1:* **Given** an upload has failed 3 times, **when** I open the Lesson Builder, **then** a banner shows '2 items waiting to upload' with a Retry button, and the cards still work on this device.
- *Scenario 2:* **Given** storage on the device is full, **when** I try to add a photo, **then** I'm told the device is full and offered to clear downloaded subjects I'm not using.

#### BLD-03 · Card extras: fact, category, number
`Should` · `S (2 pt)` · `MVP / S6` · Screens: P11 Lesson Builder: add card · [GitHub #83](https://github.com/SGGaita/trailbuddies/issues/83)

**As Ms Priya (teacher), I want to add a fun fact, a category tag and a number to a card, so that the buddy can say facts and the card works in sorting and counting games.**

- *Scenario 1:* **Given** I tag cards 'land' and 'water', **when** I choose the 'Sort them' template, **then** the sort exercise uses those tags as bins.

#### BLD-06 · Lesson settings
`Should` · `S (2 pt)` · `MVP / S6` · Screens: P12 Lesson Builder: template & assign · [GitHub #84](https://github.com/SGGaita/trailbuddies/issues/84)

**As Grace (parent), I want to set the age band, number of activities, hint level and unlocked games, so that the lesson suits my child.**

- *Scenario 1:* **Given** I set band Seedling and 5 activities, **when** the lesson is generated, **then** it uses 2–3 options per question and 5 activities.

#### BLD-05 · More templates
`Should` · `L (5 pt)` · `P2 / S10` · Screens: P12 Lesson Builder: template & assign · [GitHub #126](https://github.com/SGGaita/trailbuddies/issues/126)

**As Ms Priya (teacher), I want templates for 'Put in order', 'Count', 'Spelling list' and 'Quiz', so that I can make any kind of practice.**

- *Scenario 1:* **Given** I choose 'Spelling list' and type 10 words, **when** I save, **then** build-a-word and blend exercises are generated, using voice-pack audio for each word.
- *Scenario 2:* **Given** I choose 'Quiz', **when** I write a question with 3 picture answers, **then** the quiz lesson uses my questions in order.

#### BLD-13 · Organise my library
`Should` · `M (3 pt)` · `P2 / S10` · Screens: P10 Lesson Builder: cards · [GitHub #127](https://github.com/SGGaita/trailbuddies/issues/127)

**As Ms Priya (teacher), I want to group my lessons into categories and reorder them, so that I can find things quickly.**

- *Scenario 1:* **Given** I create a category 'Term 1', **when** I drag lessons into it, **then** the order and grouping save and sync.

#### BLD-14 · Desktop Lesson Builder
`Should` · `M (3 pt)` · `P2 / S10` · Screens: T03 Assign work · [GitHub #128](https://github.com/SGGaita/trailbuddies/issues/128)

**As Ms Priya (teacher), I want the Lesson Builder to work well on a laptop with drag-and-drop file upload, so that I can build lessons quickly while planning.**

- *Scenario 1:* **Given** I'm on a laptop, **when** I drag 10 image files onto the builder, **then** 10 cards are created with labels from the file names, ready to edit.

#### BLD-11 · Custom trails
`Should` · `L (5 pt)` · `P4 / S21` · Screens: C22 Family & class island, P13 Custom trail builder · [GitHub #170](https://github.com/SGGaita/trailbuddies/issues/170)

**As Grace (parent), I want to chain my lessons into a mini-trail with a checkpoint, so that I can make a learning journey like 'Our trip to the coast'.**

- *Scenario 1:* **Given** I create a trail with 3 lessons and a jigsaw checkpoint, **when** my child opens Family Island, **then** the trail appears as a winding path that unlocks in order.

#### BLD-12 · Remix a built-in unit
`Could` · `M (3 pt)` · `P4 / S21` · Screens: P10 Lesson Builder: cards, P22 Remix a built-in unit · [GitHub #171](https://github.com/SGGaita/trailbuddies/issues/171)

**As Ms Priya (teacher), I want to copy a built-in unit and add or remove items, so that I can add local animals to Farm animals.**

- *Scenario 1:* **Given** I tap 'Remix' on Farm animals, **when** I add 'camel' and remove 'pig', **then** a custom copy is saved in my library; the original is unchanged.

#### BLD-10 · Card and storage limits by plan
`Should` · `S (2 pt)` · `P4 / S22` · Screens: P10 Lesson Builder: cards · [GitHub #180](https://github.com/SGGaita/trailbuddies/issues/180)

**As Grace (parent), I want to see how many cards I've used, so that I'm not surprised by limits.**

- *Scenario 1:* **Given** I'm on Free with 48 of 50 cards used, **when** I open the builder, **then** a usage meter shows 48/50 and adding the 51st prompts an upgrade (behind the parent gate).

### SHR: Sharing by code

#### SHR-01 · Share a lesson by code
`Must` · `M (3 pt)` · `P2 / S11` · Screens: P17 Share codes · [GitHub #146](https://github.com/SGGaita/trailbuddies/issues/146)

**As Ms Priya (teacher), I want to create a 6-character code or QR for a lesson, trail or badge set, so that colleagues and parents can import it.**

- *Scenario 1:* **Given** I tap Share on a lesson, **when** I confirm the safety checklist, **then** a code and QR are created and I can copy or show them.
- *Scenario 2:* **Given** I revoke a code, **when** someone enters it, **then** they're told it's no longer available; existing copies are unaffected.

#### SHR-02 · Import by code
`Must` · `S (2 pt)` · `P2 / S11` · Screens: P17 Share codes, P23 Import by code · [GitHub #147](https://github.com/SGGaita/trailbuddies/issues/147)

**As Grace (parent), I want to enter a code and get my own copy, so that I can use lessons my child's teacher shared.**

- *Scenario 1:* **Given** I enter a valid code, **when** I tap Import, **then** a preview shows the lesson's cards and I can add a copy to my library.
- *Scenario 2:* **Given** the creator edits the original later, **when** I look at my copy, **then** my copy is unchanged unless I re-import.

#### SHR-03 · Safety checklist before sharing
`Must` · `M (3 pt)` · `P2 / S11` · Screens: P17 Share codes · [GitHub #148](https://github.com/SGGaita/trailbuddies/issues/148)

**As Steve (developer), I want a checklist and automated face detection before a code is created, so that children's faces and personal details aren't shared.**

- *Scenario 1:* **Given** a lesson contains an image with a detected face, **when** the creator tries to share, **then** they must confirm the image isn't of a child or remove it.
- *Scenario 2:* **Given** the creator ticks 'No names or addresses', **when** the code is created, **then** the confirmation is logged with the share.

#### SHR-04 · No child data travels in shares
`Must` · `S (2 pt)` · `P2 / S11` · [GitHub #149](https://github.com/SGGaita/trailbuddies/issues/149)

**As Steve (developer), I want shared content to contain only cards, media, templates and badges, so that no learner data ever leaves the family or class.**

- *Scenario 1:* **Given** a lesson with learner progress is shared, **when** the share package is built, **then** it contains no learner IDs, progress, names or recordings of children made via the app's progress features.

#### SHR-05 · Report shared content
`Should` · `S (2 pt)` · `P2 / S11` · Screens: P17 Share codes, M01 Moderation queue · [GitHub #150](https://github.com/SGGaita/trailbuddies/issues/150)

**As Grace (parent), I want to report an imported lesson that seems inappropriate, so that unsafe content is removed.**

- *Scenario 1:* **Given** I tap 'Report' on an imported lesson, **when** I choose a reason, **then** the report goes to moderation and the code is suspended if it passes a threshold.

### PAR: Parent dashboard & controls

#### PAR-06 · Parent gate
`Must` · `S (2 pt)` · `MVP / S2` · Screens: C24 Grown-ups gate · [GitHub #35](https://github.com/SGGaita/trailbuddies/issues/35)

**As Grace (parent), I want the grown-up zone behind a gate a young child can't pass, so that my child can't change settings or buy things.**

- *Scenario 1:* **Given** a child taps 'Grown-ups', **when** the gate shows, **then** a sum such as 'What is 7 × 3?' with number buttons, or 'Hold for 3 seconds' as the accessible option, must be completed.
- *Scenario 2:* **Given** any learner on the account is 8 or older, **when** I open settings, **then** I'm prompted to set a 4-digit PIN that replaces the sum.

#### PAR-01 · Parent home dashboard
`Must` · `M (3 pt)` · `MVP / S5` · Screens: P08 Parent home · [GitHub #74](https://github.com/SGGaita/trailbuddies/issues/74)

**As Grace (parent), I want a home screen with each child's activity this week, so that I can see at a glance how they're doing.**

- *Scenario 1:* **Given** I open the grown-up zone, **when** it loads, **then** each child shows minutes this week, lessons done, stars and their latest badge, with today's goal status.

#### PAR-02 · Child progress detail
`Must` · `M (3 pt)` · `MVP / S5` · Screens: P09 Child progress · [GitHub #75](https://github.com/SGGaita/trailbuddies/issues/75)

**As Grace (parent), I want to see progress per subject, weak items and recent lessons for one child, so that I know where to help.**

- *Scenario 1:* **Given** I open Zawadi's progress, **when** it loads, **then** I see per-subject progress bars, a weekly activity chart, items she finds hard and her last 10 lessons.
- *Scenario 2:* **Given** I tap a weak item, **when** it expands, **then** I see how often it was answered correctly and a suggestion like 'Practise together'.

#### PAR-03 · Screen-time limit and bedtime lock
`Must` · `M (3 pt)` · `MVP / S5` · Screens: C23 Time for a break, P18 Settings, limits & privacy · [GitHub #76](https://github.com/SGGaita/trailbuddies/issues/76)

**As Grace (parent), I want the app to stop at the daily limit and bedtime, so that screen time stays healthy.**

- *Scenario 1:* **Given** Amani has used 20 of 20 minutes, **when** the limit is reached mid-lesson, **then** the current activity finishes, then the buddy says goodbye and the break screen shows.
- *Scenario 2:* **Given** it's after bedtime, **when** Amani opens the app, **then** the buddy is asleep and only the grown-ups button works.

#### PAR-05 · Family settings
`Must` · `S (2 pt)` · `MVP / S5` · Screens: P18 Settings, limits & privacy · [GitHub #77](https://github.com/SGGaita/trailbuddies/issues/77)

**As Grace (parent), I want to change daily goal, voice speed, sound and limits at any time, so that the app fits our routine.**

- *Scenario 1:* **Given** I change voice speed to slow, **when** my child plays, **then** all speech uses the slower rate.

#### PAR-04 · Break reminders
`Should` · `S (2 pt)` · `MVP / S6` · Screens: C23 Time for a break · [GitHub #92](https://github.com/SGGaita/trailbuddies/issues/92)

**As Grace (parent), I want the buddy to suggest a stretch break every N minutes, so that my child takes breaks.**

- *Scenario 1:* **Given** break reminders are every 15 minutes, **when** 15 minutes pass, **then** after the current lesson the buddy leads a 30-second stretch.

#### PAR-07 · Notifications for parents
`Could` · `S (2 pt)` · `P2 / S8` · Screens: P16 Wishes & awards · [GitHub #113](https://github.com/SGGaita/trailbuddies/issues/113)

**As Grace (parent), I want optional notifications for badges, wishes to approve and weekly summaries, so that I don't miss moments.**

- *Scenario 1:* **Given** Zawadi asks for a wish, **when** I have notifications on, **then** I get a push/email notification and can approve from it.

#### PAR-08 · Linked teacher visibility
`Must` · `S (2 pt)` · `P2 / S9` · Screens: P19 Family members, P20 Join a class · [GitHub #121](https://github.com/SGGaita/trailbuddies/issues/121)

**As Grace (parent), I want to see which teacher is linked and what they can see, so that I stay in control of my child's data.**

- *Scenario 1:* **Given** Zawadi is linked to Ms Priya's class, **when** I open Family members, **then** I see the class, the teacher and the scope, and can unlink at any time.

### CLS: Classes & roster

#### CLS-01 · Create a class
`Must` · `S (2 pt)` · `P2 / S9` · Screens: T01 Teacher home · [GitHub #114](https://github.com/SGGaita/trailbuddies/issues/114)

**As Ms Priya (teacher), I want to create a class with a name, year group and age band, so that I can organise my learners.**

- *Scenario 1:* **Given** I'm on Teacher home, **when** I create 'Class 1B, ages 5–6', **then** the class is created with a join code and QR and appears on my home.

#### CLS-02 · Add students to the roster
`Must` · `M (3 pt)` · `P2 / S9` · Screens: T02 Class roster & join code · [GitHub #115](https://github.com/SGGaita/trailbuddies/issues/115)

**As Ms Priya (teacher), I want to add students by first name or paste a list, so that set-up takes minutes.**

- *Scenario 1:* **Given** I paste 26 first names, **when** I confirm, **then** 26 roster entries are created with auto-assigned avatars and picture passwords.
- *Scenario 2:* **Given** two students share a name, **when** they're added, **then** I'm prompted to add an initial to tell them apart.

#### CLS-03 · Printable join cards
`Should` · `S (2 pt)` · `P2 / S9` · Screens: T02 Class roster & join code · [GitHub #116](https://github.com/SGGaita/trailbuddies/issues/116)

**As Ms Priya (teacher), I want to print a card per student with the class code and QR for parents, so that parents can link their child at home.**

- *Scenario 1:* **Given** I click 'Print parent letters', **when** the PDF is generated, **then** each page shows the child's name, the class code, a QR, and a plain-language note about what the teacher can see.

#### CLS-04 · Parent links a child to a class
`Must` · `M (3 pt)` · `P2 / S9` · Screens: P20 Join a class · [GitHub #117](https://github.com/SGGaita/trailbuddies/issues/117)

**As Grace (parent), I want to enter the class code and choose which child it is, so that home and school share one learning record.**

- *Scenario 1:* **Given** I enter Zawadi's class code, **when** I select Zawadi and confirm the roster entry 'Zawadi M.', **then** the profiles merge into one learner with combined history and the teacher sees the linked icon.
- *Scenario 2:* **Given** the code is wrong or expired, **when** I submit, **then** I see a friendly error and can retry.

#### CLS-05 · Scopes for teacher visibility
`Must` · `M (3 pt)` · `P2 / S9` · Screens: P20 Join a class, T04 Class progress · [GitHub #118](https://github.com/SGGaita/trailbuddies/issues/118)

**As Grace (parent), I want the teacher to see only class-assigned work and summary stats unless I allow more, so that my child's home learning stays private.**

- *Scenario 1:* **Given** Zawadi is linked, **when** Ms Priya opens her progress, **then** she sees assigned work and totals but not Family Island lessons.
- *Scenario 2:* **Given** I switch on 'Share all progress with teacher', **when** she reopens it, **then** she sees all subject progress.

#### CLS-06 · Class without parent accounts
`Must` · `M (3 pt)` · `P2 / S9` · Screens: T02 Class roster & join code · [GitHub #119](https://github.com/SGGaita/trailbuddies/issues/119)

**As Ms Priya (teacher), I want to use the app with children whose parents haven't signed up, so that every child in my class can take part.**

- *Scenario 1:* **Given** my school has accepted the school-consent terms, **when** I add a student with no parent account, **then** the student can play in class; data is limited to what the school agreement allows.

#### CLS-07 · Groups within a class
`Should` · `S (2 pt)` · `P2 / S10` · Screens: T02 Class roster & join code · [GitHub #129](https://github.com/SGGaita/trailbuddies/issues/129)

**As Ms Priya (teacher), I want to create groups like 'Readers' and 'Starters', so that I can assign different work to each group.**

- *Scenario 1:* **Given** I create a group and drag 8 students into it, **when** I assign work to the group, **then** only those students receive it.

#### CLS-08 · Move students between classes and archive
`Could` · `S (2 pt)` · `P4 / S23` · Screens: T01 Teacher home · [GitHub #191](https://github.com/SGGaita/trailbuddies/issues/191)

**As Ms Priya (teacher), I want to move a student or archive a class at year end, so that my classes stay tidy.**

- *Scenario 1:* **Given** the school year ends, **when** I archive Class 1B, **then** students can still play at home with their families; class data is kept per retention policy then deleted.

### ASN: Assignments & class insights

#### ASN-01 · Assign work
`Must` · `M (3 pt)` · `P2 / S10` · Screens: T03 Assign work, C22 Family & class island · [GitHub #122](https://github.com/SGGaita/trailbuddies/issues/122)

**As Ms Priya (teacher), I want to assign built-in units or my own lessons to a class, a group or individuals with an optional due date, so that everyone practises what we're learning in class.**

- *Scenario 1:* **Given** I select Animals → Water animals and 'Group: Readers', due Friday, **when** I click Assign, **then** the unit appears on those students' Class Island with a due badge.
- *Scenario 2:* **Given** a student completes it, **when** I view the assignment, **then** their status changes to done with stars.

#### ASN-02 · Class progress heatmap
`Must` · `M (3 pt)` · `P2 / S10` · Screens: T04 Class progress · [GitHub #123](https://github.com/SGGaita/trailbuddies/issues/123)

**As Ms Priya (teacher), I want a grid of students × lessons coloured by stars, so that I can see who's stuck at a glance.**

- *Scenario 1:* **Given** I open Class progress, **when** it loads, **then** rows are students, columns are assigned lessons, cells show 0–3 stars and red marks for items struggled with.
- *Scenario 2:* **Given** I click a cell, **when** a panel opens, **then** I see that student's answers and weak items for that lesson.

#### ASN-03 · Struggling-items report
`Should` · `S (2 pt)` · `P2 / S10` · Screens: T04 Class progress · [GitHub #124](https://github.com/SGGaita/trailbuddies/issues/124)

**As Ms Priya (teacher), I want a list of the items the class finds hardest, so that I can reteach them.**

- *Scenario 1:* **Given** an assignment has 10+ completions, **when** I open its insights, **then** the 5 items with the lowest first-try accuracy are listed with the students struggling.

#### ASN-04 · Export class progress
`Should` · `S (2 pt)` · `P2 / S10` · Screens: T04 Class progress · [GitHub #125](https://github.com/SGGaita/trailbuddies/issues/125)

**As Ms Priya (teacher), I want to export progress as CSV or PDF, so that I can include it in reports to parents and the school.**

- *Scenario 1:* **Given** I click Export → CSV, **when** the file downloads, **then** it contains student first names, assignments, stars and completion dates only.

#### ASN-05 · Badge wall
`Could` · `S (2 pt)` · `P2 / S11` · Screens: T06 Classroom mode & badge wall · [GitHub #134](https://github.com/SGGaita/trailbuddies/issues/134)

**As Ms Priya (teacher), I want a projectable wall of badges the class earned this week, so that we can celebrate together.**

- *Scenario 1:* **Given** I open Badge wall in full screen, **when** it loads, **then** each student's new badges this week are shown with first names only.

#### ASN-06 · Curriculum tags
`Could` · `M (3 pt)` · `P5` · Screens: T03 Assign work · [GitHub #199](https://github.com/SGGaita/trailbuddies/issues/199)

**As Ms Priya (teacher), I want units tagged with curriculum objectives, so that I can find units that match what I'm teaching.**

- *Scenario 1:* **Given** I filter by 'Counting to 20', **when** I browse units, **then** units tagged with that objective are shown.

### CRM: Classroom mode

#### CRM-01 · Set a tablet to classroom mode
`Must` · `M (3 pt)` · `P2 / S10` · Screens: T06 Classroom mode & badge wall, C02 Classroom picture password · [GitHub #130](https://github.com/SGGaita/trailbuddies/issues/130)

**As Ms Priya (teacher), I want to set a shared tablet to my class, so that children can sign in themselves without email.**

- *Scenario 1:* **Given** I sign in on a tablet and choose 'Use as classroom device for Class 1B', **when** I confirm, **then** the tablet opens to the class picker; the grown-up zone needs my PIN.

#### CRM-02 · Picture-password sign-in
`Must` · `M (3 pt)` · `P2 / S10` · Screens: C02 Classroom picture password · [GitHub #131](https://github.com/SGGaita/trailbuddies/issues/131)

**As Zawadi (Sprout), I want to tap my class, my face picture and my 3 pictures to sign in, so that I can start quickly without reading or typing.**

- *Scenario 1:* **Given** the tablet is in classroom mode, **when** I tap my avatar and my 3 pictures in order, **then** my map opens.
- *Scenario 2:* **Given** I forget my pictures, **when** I tap 'Ask my teacher', **then** the teacher can show my pictures from their dashboard.

#### CRM-03 · Auto sign-out on shared devices
`Must` · `S (2 pt)` · `P2 / S10` · Screens: C02 Classroom picture password · [GitHub #132](https://github.com/SGGaita/trailbuddies/issues/132)

**As Ms Priya (teacher), I want children to be signed out after a lesson or inactivity, so that the next child doesn't play on someone else's profile.**

- *Scenario 1:* **Given** a child finishes a lesson or is inactive for 3 minutes, **when** the timer fires, **then** the tablet returns to the class picker.

#### CRM-05 · Offline classroom
`Must` · `S (2 pt)` · `P2 / S10` · Screens: C02 Classroom picture password · [GitHub #133](https://github.com/SGGaita/trailbuddies/issues/133)

**As Ms Priya (teacher), I want class tablets to work when the school Wi-Fi drops, so that the lesson isn't wasted.**

- *Scenario 1:* **Given** assigned content was downloaded, **when** the Wi-Fi drops mid-lesson, **then** children continue; results sync when the connection returns.

#### CRM-04 · Projector mode
`Could` · `M (3 pt)` · `P4 / S23` · Screens: T06 Classroom mode & badge wall · [GitHub #192](https://github.com/SGGaita/trailbuddies/issues/192)

**As Ms Priya (teacher), I want to run a lesson on the projector for the whole class, so that I can teach a new topic together.**

- *Scenario 1:* **Given** I start a unit in projector mode, **when** it runs, **then** large visuals, buddy voice and a 'class answers' tap mode run without recording individual progress.

### OFF: Offline & sync

#### OFF-01 · Installable PWA
`Must` · `S (2 pt)` · `MVP / S0` · Screens: C01 Who's playing? · [GitHub #2](https://github.com/SGGaita/trailbuddies/issues/2)

**As Grace (parent), I want to install the app to my tablet's home screen, so that it opens like a normal app.**

- *Scenario 1:* **Given** I visit the site on Android Chrome, **when** I choose Install, **then** it installs with the app icon and opens full-screen.

#### OFF-03 · Offline play with outbox
`Must` · `L (5 pt)` · `MVP / S2` · Screens: C29 First visit, offline & locked states · [GitHub #26](https://github.com/SGGaita/trailbuddies/issues/26)

**As Zawadi (Sprout), I want to play and earn rewards with no internet, so that nothing is lost.**

- *Scenario 1:* **Given** the device is offline, **when** I complete lessons and buy an outfit, **then** events are written to the local outbox and my map updates immediately.
- *Scenario 2:* **Given** the device reconnects, **when** sync runs, **then** outbox events are sent in batches and acknowledged; none are duplicated.

#### OFF-04 · Sync across devices
`Must` · `M (3 pt)` · `MVP / S2` · Screens: P08 Parent home · [GitHub #27](https://github.com/SGGaita/trailbuddies/issues/27)

**As Grace (parent), I want progress on any device to appear on all others, so that my children can switch devices.**

- *Scenario 1:* **Given** Zawadi plays on the tablet, **when** I open my phone, **then** her new stars and badges show after sync (within a minute when online).

#### OFF-05 · Conflict handling for edits
`Must` · `S (2 pt)` · `MVP / S2` · [GitHub #28](https://github.com/SGGaita/trailbuddies/issues/28)

**As Steve (developer), I want grown-up edits to merge with last-write-wins using server timestamps, so that edits from two devices don't corrupt data.**

- *Scenario 1:* **Given** a lesson is edited offline on two devices, **when** both sync, **then** the later edit wins and the earlier is kept in history for 30 days.

#### OFF-02 · Download subjects for offline
`Must` · `M (3 pt)` · `MVP / S6` · Screens: P18 Settings, limits & privacy, P26 Errors, offline & storage states · [GitHub #88](https://github.com/SGGaita/trailbuddies/issues/88)

**As Grace (parent), I want subjects to be downloaded so they work without internet, so that we can learn on a trip or with no data.**

- *Scenario 1:* **Given** I'm on Wi-Fi, **when** the app is opened, **then** the content packs for my children's active subjects download in the background.
- *Scenario 2:* **Given** storage is low, **when** a download would exceed the quota, **then** I'm told which subjects couldn't be downloaded and can free space.

#### OFF-06 · App update without interrupting
`Must` · `S (2 pt)` · `MVP / S7` · [GitHub #98](https://github.com/SGGaita/trailbuddies/issues/98)

**As Zawadi (Sprout), I want updates not to interrupt my lesson, so that I can finish what I'm doing.**

- *Scenario 1:* **Given** a new version is available, **when** I'm in a lesson, **then** the update is applied the next time the app starts; grown-ups see a 'What's new' note.

#### OFF-07 · Child-friendly offline and error states
`Must` · `S (2 pt)` · `MVP / S7` · Screens: C29 First visit, offline & locked states · [GitHub #218](https://github.com/SGGaita/trailbuddies/issues/218)

**As Zawadi (Sprout), I want a calm message from my buddy when something isn't available offline or goes wrong, so that I'm never shown a scary error.**

- *Scenario 1:* **Given** a subject isn't downloaded and I'm offline, **when** I tap it, **then** the buddy says 'This one needs the internet. Let's play something else!' and offers downloaded subjects.
- *Scenario 2:* **Given** an unexpected error happens in a lesson, **when** the app recovers, **then** the buddy says 'Oops, let's try that again', my progress so far is kept, and the error is reported without child data.

### CNT: Content & subjects

#### CNT-01 · Content schema and validation
`Must` · `M (3 pt)` · `MVP / S0` · [GitHub #1](https://github.com/SGGaita/trailbuddies/issues/1)

**As Steve (developer), I want a JSON schema for items, units, lessons, trails, buddy scripts and badges, validated in CI, so that content can be added safely without code changes.**

- *Scenario 1:* **Given** a unit JSON is missing a required field, **when** CI runs, **then** validation fails with the file and field named.
- *Scenario 2:* **Given** an asset referenced in a unit is missing, **when** CI runs, **then** validation fails.

#### CNT-02 · Content packs and versioning
`Must` · `M (3 pt)` · `MVP / S1` · [GitHub #12](https://github.com/SGGaita/trailbuddies/issues/12)

**As Steve (developer), I want content built into versioned packs per subject and uploaded to storage, so that new lessons can ship without an app release.**

- *Scenario 1:* **Given** I run the content build for release 2027.03.1, **when** it finishes, **then** per-subject packs and a manifest are uploaded and clients fetch updated packs on next launch.

#### CNT-09 · Content tooling for writers
`Must` · `M (3 pt)` · `MVP / S1` · [GitHub #13](https://github.com/SGGaita/trailbuddies/issues/13)

**As Steve (developer), I want a content CLI to validate units, build packs, generate asset prompt sheets and normalise audio, so that making content is fast and consistent.**

- *Scenario 1:* **Given** I run 'content-cli assets:prompts animals/farm', **when** it finishes, **then** a prompt sheet listing every item's illustration brief in the style guide is produced.
- *Scenario 2:* **Given** I run 'content-cli audio:normalise', **when** it finishes, **then** all clips are trimmed and loudness-normalised.

#### CNT-03 · Asset review status
`Must` · `S (2 pt)` · `MVP / S6` · [GitHub #85](https://github.com/SGGaita/trailbuddies/issues/85)

**As Steve (developer), I want every asset to have a review status of draft, reviewed or approved, so that unapproved assets never reach production.**

- *Scenario 1:* **Given** a production build includes an asset with status 'draft', **when** CI runs, **then** the build fails listing the asset.

#### CNT-04 · MVP subjects: Numbers, Language, Animals, Colours, Shapes
`Must` · `XL (8 pt)` · `MVP / S6` · Screens: C04 World map, C05 Subject trail · [GitHub #86](https://github.com/SGGaita/trailbuddies/issues/86)

**As Zawadi (Sprout), I want the first units of five subjects, so that I have lots to learn in the beta.**

- *Scenario 1:* **Given** the MVP is released, **when** I open my map, **then** about 25 units across the five subjects at Seedling and Sprout are playable, each reviewed and approved.

#### CNT-05 · Launch subjects wave
`Must` · `XL (8 pt)` · `P4 / S20` · Screens: C04 World map · [GitHub #167](https://github.com/SGGaita/trailbuddies/issues/167)

**As Leo (Explorer), I want Time, Weather & seasons, Plants, Opposites, Planets, Transport, Sports, Body, Positions, Directions & compass and Feelings, so that I can explore everything I'm curious about.**

- *Scenario 1:* **Given** the launch release is out, **when** I open my map, **then** 16 subjects with Seedling–Explorer units are available.

#### CNT-06 · My seasons localisation
`Should` · `M (3 pt)` · `P4 / S20` · Screens: C05 Subject trail · [GitHub #168](https://github.com/SGGaita/trailbuddies/issues/168)

**As Grace (parent), I want the 'My seasons' unit to match our climate, so that my children learn the seasons they actually live through.**

- *Scenario 1:* **Given** my country is Kenya, **when** my child reaches 'My seasons', **then** it teaches the long rains, short rains and dry seasons.
- *Scenario 2:* **Given** my country is the UK, **when** they reach it, **then** it teaches spring, summer, autumn and winter.

#### CNT-07 · Higher-band units roll-out
`Should` · `XL (8 pt)` · `P5` · Screens: A01 Teen / adult home · [GitHub #200](https://github.com/SGGaita/trailbuddies/issues/200)

**As Nia (Voyager), I want Voyager units in Maths, Reading and Space first, so that the app grows with me.**

- *Scenario 1:* **Given** Voyager content is released for a subject, **when** I'm 9–12 or placed at Voyager, **then** the units appear on my trail.

#### CNT-08 · Post-launch subjects
`Should` · `XL (8 pt)` · `P5` · Screens: C04 World map · [GitHub #201](https://github.com/SGGaita/trailbuddies/issues/201)

**As Leo (Explorer), I want Food, Family & community, Kindness & citizenship, Money & saving, Music, Countries & cultures, Coding & logic, so that there's always something new.**

- *Scenario 1:* **Given** a post-launch subject wave is released, **when** I open my map, **then** the new places appear with a 'New!' flag.

### PAY: Plans & payments

#### PAY-01 · View plans
`Must` · `S (2 pt)` · `P4 / S22` · Screens: P21 Plans · [GitHub #181](https://github.com/SGGaita/trailbuddies/issues/181)

**As Grace (parent), I want to compare Free, Family and Classroom plans, so that I can decide whether to upgrade.**

- *Scenario 1:* **Given** I open Plans behind the parent gate, **when** it loads, **then** each plan's price, learner limit, content and creator limits are shown, with my current plan marked.

#### PAY-02 · Subscribe on the web
`Must` · `M (3 pt)` · `P4 / S22` · Screens: P21 Plans, P24 Checkout · [GitHub #182](https://github.com/SGGaita/trailbuddies/issues/182)

**As Grace (parent), I want to pay for the Family plan by card on the web, so that my children get everything.**

- *Scenario 1:* **Given** I choose Family yearly, **when** I complete Stripe Checkout, **then** the plan activates immediately on all devices and a receipt is emailed.

#### PAY-03 · Subscribe in the Android app
`Must` · `M (3 pt)` · `P4 / S22` · Screens: P21 Plans, P24 Checkout · [GitHub #183](https://github.com/SGGaita/trailbuddies/issues/183)

**As Grace (parent), I want to subscribe through Google Play in the Android app, so that payment is simple on my phone.**

- *Scenario 1:* **Given** I'm in the Android app, **when** I choose Family monthly, **then** Google Play Billing is used, and the entitlement is verified server-side.

#### PAY-04 · Free tier limits
`Must` · `M (3 pt)` · `P4 / S22` · Screens: C05 Subject trail, P21 Plans · [GitHub #184](https://github.com/SGGaita/trailbuddies/issues/184)

**As Grace (parent), I want the Free plan to give real value with clear limits, so that I can try before paying.**

- *Scenario 1:* **Given** I'm on Free, **when** my child opens a locked unit, **then** the buddy says it's part of the full trail and nothing is shown to the child about prices; the parent sees upgrade info behind the gate.

#### PAY-05 · Classroom licence
`Must` · `M (3 pt)` · `P4 / S22` · Screens: T01 Teacher home, P24 Checkout · [GitHub #185](https://github.com/SGGaita/trailbuddies/issues/185)

**As Ms Priya (teacher), I want to buy a Classroom licence for one teacher, so that my class gets full access.**

- *Scenario 1:* **Given** I buy a Classroom licence, **when** it activates, **then** all my students get full access at school and at home while enrolled.

#### PAY-06 · Manage and cancel subscription
`Must` · `S (2 pt)` · `P4 / S22` · Screens: P21 Plans, P25 Cancel subscription · [GitHub #186](https://github.com/SGGaita/trailbuddies/issues/186)

**As Grace (parent), I want to change or cancel my plan easily, so that I'm in control.**

- *Scenario 1:* **Given** I tap Cancel, **when** I confirm, **then** the plan stays active until the period ends, then reverts to Free without deleting content (excess custom cards become read-only).

#### PAY-07 · No purchases from the child side
`Must` · `S (2 pt)` · `P4 / S22` · [GitHub #187](https://github.com/SGGaita/trailbuddies/issues/187)

**As Steve (developer), I want every purchase or price behind the parent gate, so that children can never be targeted with upsells.**

- *Scenario 1:* **Given** any screen in the child app, **when** it's audited, **then** no price, upgrade button or purchase link is reachable without passing the parent gate.

### SAF: Privacy, safety & compliance

#### SAF-01 · Minimal child data
`Must` · `S (2 pt)` · `MVP / S0` · Screens: P04 Add learners · [GitHub #7](https://github.com/SGGaita/trailbuddies/issues/7)

**As Grace (parent), I want only a nickname, birth month and year and avatar stored about my child, so that their privacy is protected.**

- *Scenario 1:* **Given** a learner profile is created, **when** it's stored, **then** no surname, email, photo of the child, location or free text is collected.

#### SAF-06 · No third-party trackers
`Must` · `S (2 pt)` · `MVP / S0` · [GitHub #8](https://github.com/SGGaita/trailbuddies/issues/8)

**As Steve (developer), I want a CI check that blocks third-party analytics and ad SDKs, so that children are never tracked.**

- *Scenario 1:* **Given** a PR adds a dependency on a known analytics/ad SDK, **when** CI runs, **then** the build fails with an explanation.

#### SAF-02 · Strip photo metadata
`Must` · `S (2 pt)` · `MVP / S5` · Screens: P11 Lesson Builder: add card · [GitHub #78](https://github.com/SGGaita/trailbuddies/issues/78)

**As Grace (parent), I want location and camera data removed from my photos, so that my home location is never exposed.**

- *Scenario 1:* **Given** I upload a photo with GPS EXIF, **when** it's processed on the device, **then** all EXIF is removed before upload, and the server re-checks and rejects any file still carrying GPS data.

#### SAF-03 · Export my family's data
`Must` · `M (3 pt)` · `MVP / S7` · Screens: P18 Settings, limits & privacy · [GitHub #102](https://github.com/SGGaita/trailbuddies/issues/102)

**As Grace (parent), I want to download all data held about my family, so that I can see what's stored.**

- *Scenario 1:* **Given** I request an export, **when** it's ready (within 24 hours), **then** I get a download link to a ZIP with JSON and media, valid for 7 days.

#### SAF-04 · Delete my family's data
`Must` · `M (3 pt)` · `MVP / S7` · Screens: P18 Settings, limits & privacy, P26 Errors, offline & storage states · [GitHub #103](https://github.com/SGGaita/trailbuddies/issues/103)

**As Grace (parent), I want to delete my account and all my family's data, so that nothing is kept when we leave.**

- *Scenario 1:* **Given** I request deletion and confirm with a sign-in link, **when** the 7-day undo window passes, **then** all personal data and media are deleted from live systems, with backups expiring within 35 days.

#### SAF-05 · Data retention jobs
`Must` · `S (2 pt)` · `MVP / S7` · [GitHub #104](https://github.com/SGGaita/trailbuddies/issues/104)

**As Steve (developer), I want automated retention rules (deleted lesson media after 30 days; inactive accounts after warnings), so that we meet our written retention policy.**

- *Scenario 1:* **Given** a custom lesson was deleted 30 days ago, **when** the nightly job runs, **then** its media objects are deleted from storage.

#### SAF-07 · Crash reports without child data
`Must` · `S (2 pt)` · `MVP / S7` · [GitHub #105](https://github.com/SGGaita/trailbuddies/issues/105)

**As Steve (developer), I want Sentry configured to scrub child data, so that debugging never exposes children.**

- *Scenario 1:* **Given** an error occurs on a lesson screen, **when** Sentry captures it, **then** learner names, media URLs and audio URLs are scrubbed before sending.

#### SAF-10 · Privacy policy and terms
`Must` · `S (2 pt)` · `MVP / S7` · Screens: P18 Settings, limits & privacy · [GitHub #106](https://github.com/SGGaita/trailbuddies/issues/106)

**As Grace (parent), I want a clear privacy policy and terms, so that I know my rights.**

- *Scenario 1:* **Given** I open Privacy in settings, **when** it loads, **then** I see a plain-language summary and the full policy, with version and date.

#### SAF-08 · Automated scan of shared uploads
`Must` · `M (3 pt)` · `P2 / S11` · Screens: M01 Moderation queue · [GitHub #145](https://github.com/SGGaita/trailbuddies/issues/145)

**As Steve (developer), I want uploaded images scanned for inappropriate content, so that nothing unsafe reaches children.**

- *Scenario 1:* **Given** an uploaded image is flagged, **when** the scan completes, **then** the image is hidden, the uploader is told why, and a review entry is created.

#### SAF-09 · Age-appropriate privacy by learner age
`Must` · `M (3 pt)` · `P4 / S23` · Screens: A01 Teen / adult home · [GitHub #194](https://github.com/SGGaita/trailbuddies/issues/194)

**As Nia (Voyager), I want privacy rules to fit my age (under-13, 13–17, adult), so that my data is treated correctly.**

- *Scenario 1:* **Given** a learner turns 13, **when** the age rules are applied, **then** the teen settings become available according to the family's country.
- *Scenario 2:* **Given** a learner is under 13, **when** they use the app, **then** no free-text input exists outside grown-up screens.

### ACC: Accessibility

#### ACC-02 · Reduced motion
`Must` · `S (2 pt)` · `MVP / S6` · Screens: P18 Settings, limits & privacy · [GitHub #79](https://github.com/SGGaita/trailbuddies/issues/79)

**As Grace (parent), I want a calm mode with fewer animations, so that my child doesn't get over-stimulated.**

- *Scenario 1:* **Given** reduced motion is on (device or app setting), **when** a celebration plays, **then** it uses a short fade instead of confetti and bouncing.

#### ACC-03 · Captions for buddy speech
`Must` · `S (2 pt)` · `MVP / S6` · Screens: C07 Lesson: listen & tap · [GitHub #80](https://github.com/SGGaita/trailbuddies/issues/80)

**As Grace (parent), I want captions for everything the buddy says, so that children with hearing loss can follow.**

- *Scenario 1:* **Given** captions are on, **when** the buddy speaks, **then** a speech bubble shows the text in sync.

#### ACC-01 · Large touch targets
`Must` · `S (2 pt)` · `MVP / S7` · [GitHub #93](https://github.com/SGGaita/trailbuddies/issues/93)

**As Amani (Seedling), I want big buttons that are easy to tap, so that I don't tap the wrong thing.**

- *Scenario 1:* **Given** any interactive element in the child app, **when** it's measured, **then** it is at least 48 × 48 px with 8 px spacing.

#### ACC-07 · Contrast and colour independence
`Must` · `S (2 pt)` · `MVP / S7` · [GitHub #94](https://github.com/SGGaita/trailbuddies/issues/94)

**As Steve (developer), I want text contrast of at least 4.5:1 and no information by colour alone, so that everyone can see what matters.**

- *Scenario 1:* **Given** axe checks run in CI, **when** a screen fails contrast, **then** the PR is flagged; before launch it blocks.

#### ACC-04 · Screen reader support in the grown-up zone
`Should` · `M (3 pt)` · `P4 / S23` · Screens: P08 Parent home · [GitHub #188](https://github.com/SGGaita/trailbuddies/issues/188)

**As Grace (parent), I want the grown-up zone to work with TalkBack and screen readers, so that blind or low-vision parents can manage the app.**

- *Scenario 1:* **Given** TalkBack is on, **when** I navigate the parent home, **then** every control has a label and the focus order is logical.

#### ACC-05 · Dyslexia-friendly font option
`Could` · `S (2 pt)` · `P4 / S23` · Screens: P18 Settings, limits & privacy · [GitHub #189](https://github.com/SGGaita/trailbuddies/issues/189)

**As Leo (Explorer), I want a dyslexia-friendly font for reading units, so that reading is easier for me.**

- *Scenario 1:* **Given** the option is on, **when** a reading exercise shows, **then** text uses the dyslexia-friendly font with increased spacing.

#### ACC-06 · Left-handed layouts
`Could` · `S (2 pt)` · `P4 / S23` · Screens: C09 Lesson: sort into bins · [GitHub #190](https://github.com/SGGaita/trailbuddies/issues/190)

**As Zawadi (Sprout), I want drag games to suit left-handed children, so that my hand doesn't cover the targets.**

- *Scenario 1:* **Given** left-handed mode is on, **when** a sort exercise shows, **then** bins appear on the left and items on the right.

### OLD: Older learners (teens & adults)

#### OLD-01 · Mature look for older learners
`Should` · `L (5 pt)` · `P5` · Screens: A01 Teen / adult home · [GitHub #205](https://github.com/SGGaita/trailbuddies/issues/205)

**As Nia (Voyager), I want a cleaner 'explorer' theme, so that the app feels like it's for me.**

- *Scenario 1:* **Given** my age stage is 8–12, **when** I open the app, **then** the map and lessons use the explorer theme with optional dark mode.

#### OLD-02 · Teen sign-in
`Should` · `M (3 pt)` · `P5` · Screens: A01 Teen / adult home, A02 Teen sign-in · [GitHub #206](https://github.com/SGGaita/trailbuddies/issues/206)

**As Nia (Voyager), I want my own sign-in linked to my parent's account when I'm a teen, so that I can learn on my own device.**

- *Scenario 1:* **Given** my parent enables teen sign-in for me (13+), **when** I sign in with my own email or a family code, **then** I get my profile only, and my parent keeps oversight.

#### OLD-03 · Self-made flashcard trails
`Should` · `L (5 pt)` · `P5` · Screens: A01 Teen / adult home · [GitHub #207](https://github.com/SGGaita/trailbuddies/issues/207)

**As Joseph (adult learner), I want to make my own flashcard trail with self-rating, so that I can study anything.**

- *Scenario 1:* **Given** I create a trail of 20 cards, **when** I study, **then** cards are rated 'knew it / almost / not yet' and scheduled with spaced repetition.

#### OLD-04 · Personal records instead of confetti
`Should` · `S (2 pt)` · `P5` · Screens: A01 Teen / adult home · [GitHub #208](https://github.com/SGGaita/trailbuddies/issues/208)

**As Nia (Voyager), I want to turn off celebrations and see personal records, so that I'm not distracted.**

- *Scenario 1:* **Given** celebrations are off, **when** I finish a lesson, **then** a compact summary shows stars, accuracy and personal bests.

#### OLD-05 · Family challenges
`Could` · `M (3 pt)` · `P5` · Screens: A01 Teen / adult home, P08 Parent home · [GitHub #209](https://github.com/SGGaita/trailbuddies/issues/209)

**As Joseph (adult learner), I want a cooperative family goal, so that we learn together.**

- *Scenario 1:* **Given** Grace sets 'The family completes 30 lessons this week', **when** any family learner completes a lesson, **then** the shared progress bar fills; the reward goes to everyone when it's reached; there is no ranking between children.

### MOB: Mobile app (React Native)

#### MOB-01 · React Native CLI app scaffold in the monorepo
`Must` · `L (5 pt)` · `P3 / S12` · [GitHub #151](https://github.com/SGGaita/trailbuddies/issues/151)

**As Steve (developer), I want the bare React Native app in apps/mobile using shared packages, so that logic isn't duplicated.**

- *Scenario 1:* **Given** the app is built, **when** it imports packages/domain, sync and content-schema, **then** Metro resolves them and React isn't duplicated.
- *Scenario 2:* **Given** CI runs, **when** a release tag is pushed, **then** a signed AAB is built with Gradle.

#### MOB-02 · Native storage adapter
`Must` · `M (3 pt)` · `P3 / S12` · [GitHub #152](https://github.com/SGGaita/trailbuddies/issues/152)

**As Steve (developer), I want an op-sqlite storage adapter implementing the shared sync interface, so that the mobile app works offline like the web app.**

- *Scenario 1:* **Given** the adapter passes the shared storage-adapter test suite, **when** the app runs offline, **then** events queue and sync like on the web.

#### MOB-03 · Child experience parity on Android
`Must` · `XL (8 pt)` · `P3 / S14` · Screens: C04 World map, C05 Subject trail, C07 Lesson: listen & tap · [GitHub #153](https://github.com/SGGaita/trailbuddies/issues/153)

**As Zawadi (Sprout), I want the Android app to have the same map, trail, lessons, games and rewards as the web app, so that I can use whichever device I have.**

- *Scenario 1:* **Given** the Android app is installed, **when** I sign in, **then** my profile, trail, wallet and badges match the web app after sync.

#### MOB-04 · Native camera and microphone in the Lesson Builder
`Must` · `M (3 pt)` · `P3 / S16` · Screens: P11 Lesson Builder: add card · [GitHub #154](https://github.com/SGGaita/trailbuddies/issues/154)

**As Grace (parent), I want the Android app to use the camera and microphone natively, so that making cards is fast on my phone.**

- *Scenario 1:* **Given** I open Add card for the first time, **when** I tap Camera, **then** the camera permission is requested at that moment (not at app launch) within the gated grown-up zone.

#### MOB-05 · Play Store Families compliance
`Must` · `M (3 pt)` · `P3 / S17` · [GitHub #155](https://github.com/SGGaita/trailbuddies/issues/155)

**As Steve (developer), I want the Android app to meet Google Play's Families policy, so that it's approved and listed.**

- *Scenario 1:* **Given** the app is submitted, **when** Play reviews it, **then** data-safety, target-audience and Families declarations are accurate and no non-certified SDKs are included.

#### MOB-06 · Maestro E2E on Android
`Must` · `M (3 pt)` · `P3 / S17` · [GitHub #156](https://github.com/SGGaita/trailbuddies/issues/156)

**As Steve (developer), I want the critical flows automated on an emulator, so that releases don't regress.**

- *Scenario 1:* **Given** a release candidate is built, **when** Maestro runs, **then** sign-up → lesson, offline → sync and builder flows pass.

#### MOB-07 · iOS app
`Should` · `XL (8 pt)` · `P5` · [GitHub #204](https://github.com/SGGaita/trailbuddies/issues/204)

**As Grace (parent), I want an iPhone/iPad app, so that family members with Apple devices can use it.**

- *Scenario 1:* **Given** the iOS build is released, **when** I install it from the App Store, **then** it has the same features as Android, using Apple In-App Purchase for subscriptions.

### OPS: Platform & DevOps

#### OPS-01 · Monorepo and CI
`Must` · `M (3 pt)` · `MVP / S0` · [GitHub #3](https://github.com/SGGaita/trailbuddies/issues/3)

**As Steve (developer), I want a pnpm + Turborepo monorepo with lint, tests and content validation on every PR, so that broken code never reaches main.**

- *Scenario 1:* **Given** I open a PR, **when** CI runs, **then** lint, unit, component, API and content checks run and block merge on failure.

#### OPS-02 · Preview deploys
`Must` · `S (2 pt)` · `MVP / S0` · [GitHub #4](https://github.com/SGGaita/trailbuddies/issues/4)

**As Steve (developer), I want a preview URL for every PR, so that I can check changes on the tablet before merging.**

- *Scenario 1:* **Given** I open a PR touching apps/web, **when** the preview deploys, **then** the PR shows a link and Playwright smoke tests run against it.

#### OPS-03 · API deploy to the VPS
`Must` · `M (3 pt)` · `MVP / S0` · [GitHub #5](https://github.com/SGGaita/trailbuddies/issues/5)

**As Steve (developer), I want API images built and deployed to the VPS with Docker Compose, so that deploys are one step.**

- *Scenario 1:* **Given** I merge to main, **when** CI runs, **then** the image is pushed to GHCR and the staging stack pulls and restarts with a health check.
- *Scenario 2:* **Given** a tag is pushed, **when** the release job runs, **then** the database is backed up, migrations run, and production updates.

#### OPS-04 · Backups and restore drills
`Must` · `S (2 pt)` · `MVP / S0` · [GitHub #6](https://github.com/SGGaita/trailbuddies/issues/6)

**As Steve (developer), I want automated database backups to R2 and a monthly restore test, so that I can recover from failure.**

- *Scenario 1:* **Given** it's 02:00, **when** the backup job runs, **then** a compressed dump is uploaded to R2 with 30-day retention.
- *Scenario 2:* **Given** the monthly drill runs, **when** a backup is restored to a scratch database, **then** row counts match and the result is logged.

#### OPS-05 · Monitoring and alerts
`Must` · `S (2 pt)` · `MVP / S7` · [GitHub #100](https://github.com/SGGaita/trailbuddies/issues/100)

**As Steve (developer), I want uptime checks and error alerts, so that I hear about problems before parents do.**

- *Scenario 1:* **Given** the API health check fails twice in a row, **when** the monitor runs, **then** I get an alert by email and phone.

#### OPS-06 · Feature flags
`Should` · `S (2 pt)` · `MVP / S7` · [GitHub #101](https://github.com/SGGaita/trailbuddies/issues/101)

**As Steve (developer), I want server-controlled feature flags, so that I can ship code dark and turn features on for beta families.**

- *Scenario 1:* **Given** a flag is on for the beta cohort only, **when** a beta family opens the app, **then** the feature shows only for them.

#### OPS-07 · First-party product analytics
`Should` · `M (3 pt)` · `P2 / S8` · [GitHub #112](https://github.com/SGGaita/trailbuddies/issues/112)

**As Steve (developer), I want aggregated product metrics from our own event table, so that I can measure activation and retention without third-party trackers.**

- *Scenario 1:* **Given** the weekly metrics job runs, **when** it finishes, **then** a dashboard shows activation, weekly active learners, lessons per learner and retention, with no personal identifiers.

#### OPS-08 · Load and security review before launch
`Must` · `M (3 pt)` · `P4 / S23` · [GitHub #193](https://github.com/SGGaita/trailbuddies/issues/193)

**As Steve (developer), I want a load test and security review before public launch, so that launch day is calm.**

- *Scenario 1:* **Given** the launch candidate is ready, **when** a load test of 1,000 concurrent syncs runs, **then** p95 sync latency stays under 500 ms and no errors occur.
- *Scenario 2:* **Given** the security checklist runs, **when** it completes, **then** auth, scopes, uploads and secrets handling are verified and findings fixed.

### SCH: School administration

#### SCH-01 · School licence and seats
`Should` · `L (5 pt)` · `P5` · Screens: S01 School admin: licence & teachers · [GitHub #211](https://github.com/SGGaita/trailbuddies/issues/211)

**As Sam (school admin), I want to buy a school licence and assign teacher seats, so that billing is one invoice.**

- *Scenario 1:* **Given** I buy a 6-teacher licence, **when** I invite teachers by email, **then** each accepted teacher gets Classroom features under the school.

#### SCH-02 · School-wide reports
`Could` · `M (3 pt)` · `P5` · Screens: S02 School reports & library · [GitHub #212](https://github.com/SGGaita/trailbuddies/issues/212)

**As Sam (school admin), I want usage and progress reports across all classes, so that I can see impact.**

- *Scenario 1:* **Given** I open School reports, **when** it loads, **then** I see active learners, lessons and progress per class, without individual child details unless the teacher shares them.

#### SCH-03 · Data processing agreement
`Should` · `S (2 pt)` · `P5` · Screens: S01 School admin: licence & teachers · [GitHub #213](https://github.com/SGGaita/trailbuddies/issues/213)

**As Sam (school admin), I want to accept a data processing agreement online, so that the school meets its data-protection duties.**

- *Scenario 1:* **Given** I open Legal in the school admin, **when** I accept the DPA, **then** acceptance is recorded with name, role, date and version and a PDF copy is emailed.

#### SCH-04 · Shared school library
`Could` · `M (3 pt)` · `P5` · Screens: S02 School reports & library · [GitHub #214](https://github.com/SGGaita/trailbuddies/issues/214)

**As Sam (school admin), I want lessons shared across all teachers in the school, so that teachers don't duplicate work.**

- *Scenario 1:* **Given** a teacher publishes a lesson to the school library, **when** another teacher opens the library, **then** they can assign it directly.

### AI: AI features

#### AI-01 · Say-it exercises with speech recognition
`Could` · `XL (8 pt)` · `P5` · Screens: C07 Lesson: listen & tap · [GitHub #195](https://github.com/SGGaita/trailbuddies/issues/195)

**As Zawadi (Sprout), I want to say the answer out loud, so that I practise speaking and reading aloud.**

- *Scenario 1:* **Given** a parent has enabled speech features, **when** a say-it exercise shows, **then** my speech is recognised (on the device where possible), checked, and no audio is stored.

#### AI-02 · Guard-railed conversational hints
`Could` · `XL (8 pt)` · `P5` · Screens: C11 Lesson: hint · [GitHub #196](https://github.com/SGGaita/trailbuddies/issues/196)

**As Leo (Explorer), I want the buddy to explain things in different ways when I'm stuck, so that I understand, not just get the answer.**

- *Scenario 1:* **Given** AI hints are enabled, **when** I'm stuck on a question, **then** the buddy gives an age-appropriate explanation limited to the current exercise; there is no free chat.

#### AI-03 · AI-assisted lesson builder
`Could` · `L (5 pt)` · `P5` · Screens: P12 Lesson Builder: template & assign · [GitHub #197](https://github.com/SGGaita/trailbuddies/issues/197)

**As Ms Priya (teacher), I want to describe a lesson and get a draft to edit, so that I can build lessons in seconds.**

- *Scenario 1:* **Given** I type 'A 6-card lesson about African birds for 5-year-olds', **when** I generate, **then** a draft lesson with cards from the licensed library and facts is created for me to review before anyone can play it.

#### AI-04 · Auto-tag uploaded photos
`Could` · `M (3 pt)` · `P5` · Screens: P11 Lesson Builder: add card · [GitHub #198](https://github.com/SGGaita/trailbuddies/issues/198)

**As Grace (parent), I want photos to be auto-tagged with suggested labels and categories, so that making sort games is quicker.**

- *Scenario 1:* **Given** I upload a photo of a goat, **when** processing finishes, **then** 'goat' and 'farm animal' are suggested and I can accept or change them.

### LOC: Languages & localisation

#### LOC-01 · Every string ready for translation
`Must` · `M (3 pt)` · `MVP / S0` · [GitHub #215](https://github.com/SGGaita/trailbuddies/issues/215)

**As Steve (developer), I want all UI text, buddy lines and content words stored by key in language files, so that adding a language later needs translation work only, not code changes.**

- *Scenario 1:* **Given** a component contains a hard-coded user-facing string, **when** CI runs the i18n lint, **then** the PR fails naming the file and line.
- *Scenario 2:* **Given** a key is missing in a non-English language, **when** the app renders it, **then** the English text is shown and a warning is logged in development.

#### LOC-02 · Choose the app language per learner
`Should` · `M (3 pt)` · `P5` · Screens: P29 Language settings · [GitHub #226](https://github.com/SGGaita/trailbuddies/issues/226)

**As Grace (parent), I want to choose the language for each learner and for the grown-up zone, so that my children can learn in Kiswahili while I use English.**

- *Scenario 1:* **Given** Kiswahili is available, **when** I set Amani's language to Kiswahili, **then** his map, buddy voice, instructions and content words switch to Kiswahili; Zawadi stays in English.
- *Scenario 2:* **Given** a unit isn't translated yet, **when** Amani opens it, **then** it's shown with a 'Coming soon in Kiswahili' tag and can be played in English if I allow it.

#### LOC-03 · Translated content and voice packs
`Should` · `L (5 pt)` · `P5` · [GitHub #227](https://github.com/SGGaita/trailbuddies/issues/227)

**As Steve (developer), I want content packs and voice packs built per language from the same unit files, so that each language ships without duplicating lesson logic.**

- *Scenario 1:* **Given** a unit has Kiswahili translations and audio, **when** the content build runs, **then** a Kiswahili pack is produced and validated, and missing items are listed in the build report.

#### LOC-04 · Bilingual mode
`Could` · `M (3 pt)` · `P5` · Screens: P29 Language settings · [GitHub #228](https://github.com/SGGaita/trailbuddies/issues/228)

**As Grace (parent), I want an option for the buddy to say each new word in two languages, so that my child learns English and Kiswahili side by side.**

- *Scenario 1:* **Given** bilingual mode is on with English + Kiswahili, **when** a new item is introduced, **then** the buddy says it in the learner's language first, then the second language, and the card shows both words.

### MOD: Moderation

#### MOD-01 · Moderation queue
`Must` · `M (3 pt)` · `P2 / S11` · Screens: M01 Moderation queue · [GitHub #223](https://github.com/SGGaita/trailbuddies/issues/223)

**As Steve (developer), I want one queue of reported shared content and automatically flagged uploads, so that unsafe content is reviewed quickly.**

- *Scenario 1:* **Given** a parent reports an imported lesson or the scanner flags an image, **when** I open the moderation queue, **then** the item shows with its reason, report count, share code, upload date and a preview, oldest first.
- *Scenario 2:* **Given** an item has been waiting more than 24 hours, **when** the queue loads, **then** it's highlighted and I get a daily email reminder.

#### MOD-02 · Moderation actions and audit log
`Must` · `M (3 pt)` · `P2 / S11` · Screens: M01 Moderation queue · [GitHub #224](https://github.com/SGGaita/trailbuddies/issues/224)

**As Steve (developer), I want to hide, restore, or suspend a share code, and to warn or suspend a creator account, so that I can act on reports consistently and show what was done.**

- *Scenario 1:* **Given** I choose 'Hide image' on a flagged item, **when** I confirm with a reason, **then** the image is replaced by a placeholder for everyone who has a copy, and the action is logged with who, when and why.
- *Scenario 2:* **Given** I suspend a share code, **when** someone tries to import it, **then** they're told it's unavailable; existing copies stay but the flagged media is hidden.

#### MOD-03 · Tell people the outcome
`Should` · `S (2 pt)` · `P2 / S11` · Screens: M01 Moderation queue · [GitHub #225](https://github.com/SGGaita/trailbuddies/issues/225)

**As Grace (parent), I want to hear back after I report something, and to be told if my own upload was hidden, so that I trust that reports are acted on and understand why something changed.**

- *Scenario 1:* **Given** my report has been reviewed, **when** a decision is made, **then** I get an email saying it was reviewed and the general outcome, without details about other users.
- *Scenario 2:* **Given** my image was hidden, **when** the action is taken, **then** I get an email with the reason and how to appeal.

### HLP: Help & support

#### HLP-01 · Help centre in the grown-up zone
`Should` · `M (3 pt)` · `P2 / S8` · Screens: P30 Help & support · [GitHub #219](https://github.com/SGGaita/trailbuddies/issues/219)

**As Grace (parent), I want short help articles inside the app, so that I can solve common problems without emailing anyone.**

- *Scenario 1:* **Given** I open Help, **when** it loads, **then** I see search plus topics (getting started, lessons, rewards, privacy, billing, offline) and the articles are available offline.
- *Scenario 2:* **Given** I'm on a screen with a help topic, **when** I tap the '?' icon, **then** the matching article opens.

#### HLP-02 · Contact support
`Should` · `S (2 pt)` · `P2 / S8` · Screens: P30 Help & support · [GitHub #220](https://github.com/SGGaita/trailbuddies/issues/220)

**As Grace (parent), I want to send a message to support from the app, so that I can get help with problems the articles don't solve.**

- *Scenario 1:* **Given** I fill in the contact form, **when** I tick 'include device diagnostics', **then** app version, device model and recent error codes are attached, with no child names, media or progress data.
- *Scenario 2:* **Given** I submit, **when** the message is sent, **then** I get an email confirmation with a reference number.

#### HLP-03 · Teacher getting-started guide
`Could` · `S (2 pt)` · `P2 / S9` · Screens: T01 Teacher home, P30 Help & support · [GitHub #222](https://github.com/SGGaita/trailbuddies/issues/222)

**As Ms Priya (teacher), I want a short guide for setting up a class and the first week, so that I can get my class going without training.**

- *Scenario 1:* **Given** I've just created my first class, **when** Teacher home loads, **then** a 5-step checklist shows (add students, print parent letters, set up tablets, assign work, check progress) and ticks off as I do each.

---

## Screen → story traceability

| Screen | Device | Stories |
|---|---|---|
| P01 Welcome | Phone | ONB-01, ONB-13 |
| P02 Sign up | Phone | ONB-02, ONB-03, ONB-04, ONB-05 |
| P03 Parental consent | Phone | ONB-06 |
| P04 Add learners | Phone | ONB-07, ONB-08, SAF-01 |
| P05 Interests & starting point | Phone | ONB-09 |
| P06 Family settings & hand-over | Phone | ONB-10, ONB-11 |
| P08 Parent home | Phone | ONB-12, FAM-03, PAR-01, OFF-04, ACC-04, OLD-05 |
| P09 Child progress | Phone | ADP-02, PAR-02 |
| P10 Lesson Builder: cards | Phone | BLD-09, BLD-10, BLD-12, BLD-13 |
| P11 Lesson Builder: add card | Phone | LES-18, BLD-01, BLD-02, BLD-03, BLD-15, SAF-02, MOB-04, AI-04 |
| P12 Lesson Builder: template & assign | Phone | GAM-02, BLD-04, BLD-05, BLD-06, BLD-07, BLD-08, AI-03 |
| P14 Badge Studio: design | Phone | BST-01 |
| P15 Badge Studio: rule & reward | Phone | BST-02, BST-03, BST-04, BST-06 |
| P16 Wishes & awards | Phone | BST-04, BST-05, BST-07, PAR-07 |
| P17 Share codes | Phone | SHR-01, SHR-02, SHR-03, SHR-05 |
| P18 Settings, limits & privacy | Phone | ONB-05, ONB-14, FAM-08, BDG-06, PAR-03, PAR-05, OFF-02, SAF-03, SAF-04, SAF-10, ACC-02, ACC-05 |
| P19 Family members | Phone | FAM-05, FAM-06, PAR-08 |
| P20 Join a class | Phone | PAR-08, CLS-04, CLS-05 |
| P21 Plans | Phone | PAY-01, PAY-02, PAY-03, PAY-04, PAY-06 |
| C01 Who's playing? | Tablet | FAM-01, FAM-07, OFF-01 |
| C02 Classroom picture password | Tablet | FAM-02, CRM-01, CRM-02, CRM-03, CRM-05 |
| C03 Meet the buddies | Tablet | ONB-11, BUD-01, BUD-02, BUD-11 |
| C04 World map | Tablet | FAM-04, FAM-07, BUD-03, BUD-09, MAP-01, MAP-06, MAP-08, RWD-08, CNT-04, CNT-05, CNT-08, MOB-03 |
| C05 Subject trail | Tablet | MAP-02, MAP-03, MAP-04, MAP-05, MAP-07, ADP-04, ADP-05, ADP-07, CNT-04, CNT-06, PAY-04, MOB-03 |
| C07 Lesson: listen & tap | Tablet | BUD-04, BUD-06, LES-01, LES-02, LES-04, LES-05, LES-06, LES-09, LES-11, LES-12, LES-13, LES-14, LES-17, ACC-03, MOB-03, AI-01 |
| C08 Lesson: match pairs | Tablet | LES-03, LES-07, LES-10 |
| C09 Lesson: sort into bins | Tablet | LES-08, ACC-06 |
| C11 Lesson: hint | Tablet | BUD-05, AI-02 |
| C12 Lesson complete | Tablet | BUD-06, BUD-07, LES-16, RWD-01, RWD-03, RWD-08 |
| C13 Badge earned | Tablet | BDG-03 |
| C14 Unit checkpoint | Tablet | MAP-03 |
| C15 Game: jigsaw | Tablet | GAM-01, GAM-02 |
| C16 Game: memory | Tablet | GAM-03 |
| C17 Games corner | Tablet | GAM-04, GAM-06, GAM-07, GAM-08, GAM-09 |
| C18 Buddy shop | Tablet | BUD-09, RWD-02, RWD-05, RWD-10 |
| C19 Treasure room | Tablet | RWD-06, RWD-07 |
| C20 Badge book | Tablet | BDG-02, BDG-04, BDG-05, BDG-07 |
| C21 My wishes | Tablet | BST-04, BST-07 |
| C22 Family & class island | Tablet | MAP-06, BLD-08, BLD-11, ASN-01 |
| C23 Time for a break | Tablet | PAR-03, PAR-04 |
| C24 Grown-ups gate | Tablet | PAR-06 |
| T01 Teacher home | Desktop | ONB-13, CLS-01, CLS-08, PAY-05, HLP-03 |
| T02 Class roster & join code | Desktop | CLS-02, CLS-03, CLS-06, CLS-07 |
| T03 Assign work | Desktop | BLD-14, ASN-01, ASN-06 |
| T04 Class progress | Desktop | CLS-05, ASN-02, ASN-03, ASN-04 |
| T06 Classroom mode & badge wall | Desktop | ASN-05, CRM-01, CRM-04 |
| A01 Teen / adult home | Tablet | ONB-08, BUD-10, LES-15, CNT-07, SAF-09, OLD-01, OLD-02, OLD-03, OLD-04, OLD-05 |
| P07 Check your email / expired link | Phone | ONB-02 |
| P13 Custom trail builder | Phone | BLD-11 |
| P22 Remix a built-in unit | Phone | BLD-12 |
| P23 Import by code | Phone | SHR-02 |
| P24 Checkout | Phone | PAY-02, PAY-03, PAY-05 |
| P25 Cancel subscription | Phone | PAY-06 |
| P26 Errors, offline & storage states | Phone | BLD-15, OFF-02, SAF-04, BLD-16 |
| P28 Record letter sounds | Phone | LES-19 |
| P29 Language settings | Phone | LOC-02, LOC-04 |
| P30 Help & support | Phone | HLP-01, HLP-02, HLP-03 |
| C06 Placement quiz | Tablet | ADP-05 |
| C10 Review lesson | Tablet | MAP-07, ADP-04 |
| C25 Exercise: trace | Tablet | LES-12 |
| C26 Exercise: clock setter | Tablet | LES-13 |
| C27 Exercise: build a word | Tablet | LES-11 |
| C28 Exercise: true or false | Tablet | LES-14 |
| C29 First visit, offline & locked states | Tablet | MAP-03, OFF-03, MAP-09, OFF-07 |
| A02 Teen sign-in | Tablet | OLD-02 |
| T00 Teacher sign-up | Desktop | ONB-13 |
| T05 Teacher Badge Studio | Desktop | BDG-04, BST-02, BST-06 |
| S01 School admin: licence & teachers | Desktop | SCH-01, SCH-03 |
| S02 School reports & library | Desktop | SCH-02, SCH-04 |
| M01 Moderation queue | Desktop | SHR-05, SAF-08, MOD-01, MOD-02, MOD-03 |

## Sprint plan (MVP)

| Sprint | Stories | Points |
|---|---|---|
| S0 | OFF-01, CNT-01, SAF-01, SAF-06, OPS-01, OPS-02, OPS-03, OPS-04, LOC-01 | 22 |
| S1 | LES-01, LES-02, LES-03, LES-04, LES-05, LES-16, LES-17, ADP-01, ADP-03, ADP-04, RWD-01, CNT-02, CNT-09 | 31 |
| S2 | ONB-01, ONB-02, ONB-06, ONB-07, ONB-11, ONB-14, FAM-01, FAM-07, MAP-01, MAP-02, PAR-06, OFF-03, OFF-04, OFF-05, MAP-09 | 39 |
| S3 | BUD-01, BUD-03, BUD-04, BUD-05, BUD-06, BUD-08, MAP-03, LES-06, LES-07, LES-08, LES-09, LES-10, LES-11 | 29 |
| S4 | BUD-07, BUD-09, MAP-07, GAM-01, GAM-03, GAM-04, GAM-05, RWD-02, RWD-03, RWD-04, RWD-05, RWD-08, RWD-09, BDG-01, BDG-02, BDG-03 | 37 |
| S5 | MAP-06, GAM-02, BLD-01, BLD-02, BLD-04, BLD-07, BLD-08, BLD-09, BLD-15, PAR-01, PAR-02, PAR-03, PAR-05, SAF-02, BLD-16 | 37 |
| S6 | ONB-03, ONB-05, ONB-09, FAM-08, ADP-02, ADP-05, BLD-03, BLD-06, PAR-04, OFF-02, CNT-03, CNT-04, ACC-02, ACC-03 | 36 |
| S7 | ONB-10, FAM-03, MAP-05, LES-18, OFF-06, SAF-03, SAF-04, SAF-05, SAF-07, SAF-10, ACC-01, ACC-07, OPS-05, OPS-06, OFF-07 | 33 |
