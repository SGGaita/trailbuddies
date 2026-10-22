# Trailbuddies: Concept Report
### An interactive, journey-based learning app for learners aged 3 and up, with no upper age limit

*Working name. Prepared 21 October 2026 for Steve Gaita. Revision 2: no upper age limit; parent-led onboarding without a school.*

*Builds on two existing prototypes: **Chipuka** (React Native, `C:\projects\chipuka-app`) and **Martha's Learning Corner** (Next.js PWA, `C:\projects\martha-learning`).*

---

## 1. Executive summary

Trailbuddies is a learning app that starts at **age 3 and has no upper age limit**. It begins with first words and numbers and keeps growing with the learner through primary school, the teenage years and beyond. A friendly **buddy character**, chosen by the child, guides them along an illustrated **learning trail**. Each lesson builds on the one before, in the same spirit as Duolingo. The child picks from more than a dozen **subjects** (Numbers, Alphabet, Animals, Time, Planets and more). Each subject is a path of **units → lessons → short exercises**, finishing with **games** (puzzles, memory, sorting) and a **reward system**: stars and treasures to spend, plus badges to collect.

Three things set it apart from Khan Academy Kids, Lingokids and Duolingo ABC:

1. **Parents and teachers are creators, not just observers.** Either can build custom lessons from their own photos and voice recordings, turn a photo into a jigsaw, group lessons into a mini-trail, and create custom badges and achievements (including real-world rewards such as "a trip to the park").
2. **The classroom is a first-class mode.** Teachers create classes, assign trails and see class progress. Parents link to the same child, so home and school share one learning record.
3. **One web codebase covers every device.** The app is an installable, offline-first PWA, also packaged for Google Play and the App Store. The same app runs on a parent's phone, a school Chromebook or a shared classroom tablet.

**Families don't need a school.** A parent signs up, creates profiles for one or more children (or for themselves) and starts straight away. Linking to a teacher's class is optional and can happen any time later.

**Age focus:** the app is open-ended by design, through five age bands and grown-up-made content that can serve any age. The deepest built-in content at launch targets ages 3–8, the earliest and most underserved stage. Older bands are added subject by subject after launch (§6.2, §7, §14).

**Launch target:** global, English only, built ready for other languages from day one. **Business model:** freemium for families, plus a paid classroom/school licence. **AI:** scripted tutor and adaptive difficulty first; AI features (speech recognition, conversational hints, AI-assisted lesson building) in a later phase.

---

## 2. What we inherit from the two existing apps

Neither prototype is thrown away. Each contributes proven pieces.

| From **Chipuka** (React Native) | From **Martha's Learning Corner** (Next.js PWA) |
|---|---|
| Mascot-as-tutor concept (Chipu) and intro flow | Working **offline-first PWA**: service worker precaches every page, fonts bundled |
| **Continuous winding path** layout across stages and lessons | **Phonics engine**: letter sounds, digraphs, blending, first-sound game |
| 10 exercise types: listen-tap, pop, feed, match, name, count, compare, solve, sequence, case-match | **Planets** drawn as SVG at true relative scale + "Line-up" game |
| **Adaptive difficulty** (level auto-adjusts after repeated 3-star or poor lessons) | **Parent sound recorder**: recordings in IndexedDB replace the device voice everywhere |
| Grown-up zone: overview KPIs, weak cards, library, **Organize** (categories + drag reorder) | Weather "what-to-wear" game, seasons, colours, shapes, body, days |
| **Custom topics/cards** with photo + voice, cloud media pipeline with offline retry queue | MUI theme, crayon colour tokens, light/dark, Baloo 2 + Nunito fonts |
| Arithmetic **parent gate**; Play Families compliance thinking | Lesson-as-data schema (`LESSONS` array → generated pages) |
| Data model with **stable lesson IDs** (fixes index-keyed progress) | Stars per round, celebration animation |

**Recommendation:** treat Martha's codebase as the starting shell, since it's the PWA, Next.js + MUI stack. Port Chipuka's domain logic into a shared package: difficulty, path layout, organize/normalize, lesson generation and exercise specs. The Chipuka React Native work is still mostly scaffolding, so pausing it costs little. Section 11 explains the platform decision.

---

## 3. Vision and design principles

> *Every child walks their own trail, with a buddy who never gets tired of cheering them on, and the grown-ups in their life can add their own world to it.*

1. **Little steps, always forward.** A lesson takes 2–4 minutes and 5–8 exercises. Each one reuses most of what the child knows and adds one new thing.
2. **Show, say, then ask.** Every new concept is shown (picture), said (voice) and then practised. No reading is needed until the reading units.
3. **Never punish, always nudge.** A wrong answer gets a hint, not a buzzer. Streaks are gentle: missing a day loses nothing earned.
4. **The child's real world belongs in the app.** Grandma's cow, the class pet and the family car all become lesson material.
5. **Calm, not compulsive.** No ads, no loot boxes, no countdown timers, no "your buddy is sad" guilt. Grown-ups set the screen-time limits.
6. **Works anywhere.** Offline by default, low data use, runs well on budget Android tablets and shared school devices.
7. **Grows up with the learner.** The same trail, buddy and rewards carry from age 3 into the teens and adulthood. The look, the buddy's tone and the exercise style mature with each age band, so a 12-year-old never feels they're using a "baby app".
8. **Ready for every language.** Global English at launch, but every string, voice line and content item is keyed for translation (Kiswahili, French and others later).

---

## 4. Users, roles and accounts

### 4.1 Roles

| Role | Who | What they can do |
|---|---|---|
| **Learner (child)** | Age 3 and up, no upper limit | Play the trail, games and custom lessons; earn and spend rewards; choose and dress their buddy. Under-13s: no email, no password, no free text, no chat. Teens (13–17) get a few more freedoms (§4.4). |
| **Adult learner** | 18+ | A grown-up can add a learner profile for themselves (a parent learning alongside their child, a grandparent, an adult learning to read or brushing up on maths). Same trail and rewards, adult look and buddy tone. |
| **Parent / guardian** | Account holder for a family | Create child profiles; see progress; **create custom lessons, trails, badges and achievements**; set limits; link children to a teacher's class; manage subscription and data. |
| **Teacher** | Classroom educator | Create classes and join codes; add students; **create custom lessons, trails, badges and achievements**; assign work; see class dashboards; run classroom mode. |
| **School admin** *(phase 4)* | School/licence owner | Manage teacher seats, the school licence and the shared content library. |

### 4.2 Account model

- **Grown-ups have accounts** (email magic link or Google/Apple sign-in). **Children under 13 never do.** A child is a *profile* owned by a parent account, or a *roster entry* owned by a class. Teens can be given their own sign-in linked to the parent account; adult learners use their own account (§4.4).
- **One child, many grown-ups.** A child profile can be linked to two parents and one or more teachers. Each link has a scope: parents see everything; teachers see progress on classroom-assigned work plus summary stats, unless the parent grants more.
- **Linking flow:** the teacher creates a roster entry → the class gets a printable join code / QR → the parent enters it in the grown-up zone → both records merge into one child with one learning history. A child with no parent account can still be used in class (school-managed consent; see §12).
- **Child entry:** on a family device, tap your avatar. In classroom mode on shared tablets, tap your class, then your avatar, then a **picture password** (e.g. 🐶🌙🍎).
- **Grown-up zone** sits behind a **parent gate** (Chipuka's arithmetic gate, with a "hold for 3 seconds" variant for accessibility). A **PIN is offered automatically once any learner on the account is 8 or older**, because older children can solve an arithmetic gate.

### 4.3 Parent-led onboarding (no school required)

The default path into the app is a **parent on their own**. Schools are an optional add-on, never a prerequisite.

| Step | What happens | Time |
|---|---|---|
| **1. Welcome** | Short animated intro of the buddies and the trail; "I'm a parent / I'm a teacher" choice | 20 s |
| **2. Grown-up account** | Email magic link, Google or Apple sign-in. Name and country (country sets the date format, the "my seasons" climate and the privacy rules that apply) | 30 s |
| **3. Parental consent** | Plain-language summary of what's collected and why; consent checkbox; verifiable-consent step where the law requires it (§12) | 30 s |
| **4. Add learners** | "Who's learning?" Add **one or more** profiles: first name or nickname, **birth month and year** (sets the age band and moves the child up bands automatically on birthdays), avatar. **"Add me too"** creates an adult learner profile for the parent | 30 s per learner |
| **5. Interests and starting point** (optional per learner) | Tap favourite things (animals, space, vehicles, sport…) to order subjects on the world map; optional placement quiz per subject; "my child can already…" shortcuts (knows letters, counts to 20, reads) | 1–2 min |
| **6. Family settings** | Daily goal, screen-time limit, bedtime lock, voice speed, sound; can be changed later | 30 s |
| **7. Hand over to the child** | The child meets the buddies and **picks theirs**, then goes straight into their first lesson. Ages 3–5: the buddy speaks every step | — |
| **8. After the first lesson** | Parent sees a "first steps" card: progress so far, how to make a custom lesson, how to set up a custom badge, optional "Join a class" code field | — |

**Multiple children and devices:**
- One family account holds **any number of learner profiles** (plan limits in §13). Siblings each have their own trail, buddy, wallet and badges.
- The same family can sign in on several devices (a parent's phone, a home tablet, a laptop), and progress syncs between them (§11.5).
- A **second parent or guardian** is invited by email and gets equal access. Grandparents or carers can be invited with a "view progress only" role.
- On a **shared family device**, the profile picker opens first. Each child taps their own avatar; an optional picture password stops siblings playing on each other's profiles.

**Linking to school later (optional):** if a teacher sends a join code, the parent enters it in the grown-up zone and picks which child it belongs to. The child's existing history, rewards and custom content stay with the family. The teacher sees only what §4.2's scopes allow, and the parent can unlink at any time.

### 4.4 How the experience changes with age

| | Ages 3–7 | Ages 8–12 | Teens 13–17 | Adults 18+ |
|---|---|---|---|---|
| Profile owner | Parent | Parent | Parent (teen can be given their own sign-in, linked to the parent account) | Self |
| Entering the app | Tap avatar | Tap avatar + optional picture password or PIN | Own login or PIN | Own login |
| Look and feel | Bright, playful, everything spoken | Playful, more text | Cleaner "explorer" theme, optional dark mode | Clean, minimal |
| Buddy tone | Cheerleader | Coach | Mentor (fewer interruptions) | Study partner (can be switched off) |
| Can create own lessons/flashcards | No | With parent approval | Yes, private to themselves | Yes |
| Free text | None | Answers only (typed spelling, numbers) | Answers + private notes | Full |

---

## 5. The buddies (choose-a-buddy tutor)

At first launch the child meets **four buddies** and picks one. They can switch any time. Every buddy has the same teaching script but its own personality, voice and animation set, so producing a new buddy is mostly an art-and-voice job, not new code.

| Buddy | Personality | Signature move |
|---|---|---|
| **Tumi the Owl** | Curious, a little professor-ish | Pushes glasses up, "Hmm, let's look closer!" |
| **Juma the Elephant** | Gentle, patient, big-hearted | Trumpets a celebration, never forgets a word |
| **Zip the Robot** | Energetic, silly, loves numbers | Beeps and spins, counts everything |
| **Kiki the Turtle** | Calm, slow and steady | Pops out of shell to cheer, "Slow is fine!" |

*(Names and species are placeholders. Concept art should test with children for appeal and must avoid looking like any existing licensed character.)*

### 5.1 What the buddy does (scripted in v1)

| Moment | Buddy behaviour |
|---|---|
| **Greeting** | Says the child's name (TTS or the parent's recording), mentions yesterday's progress |
| **Introducing a concept** | Shows the item, says it, gives one fun fact ("Elephants drink with their trunks!") |
| **Hint ladder** | 1st miss: re-says the question. 2nd miss: removes a wrong choice and points. 3rd miss: shows the answer, says it, and the item comes back later in review |
| **Celebrating** | Varied reactions (never the same line twice in a row), bigger reaction for a perfect lesson or new badge |
| **Encouraging** | After a hard lesson: "That was a tricky one, you kept going!" Praise effort, not just results |
| **Breaks and limits** | "Time for a stretch!" at the grown-up-set limit; a calm goodbye animation, not a guilt trip |
| **Shop and room** | Wears the outfits and lives in the room the child decorates with treasures (§9) |

**The buddy grows up too.** Each buddy has an art and voice set per stage: little and bouncy for ages 3–7, sportier for 8–12, a cooler "mentor" look for teens, and a minimal study-partner mode for adults (or switched off entirely). It's the same character, so a child who chose Zip at 4 still has Zip at 12. Older learners also unlock extra buddies through the shop.

The buddy's lines live in a **script table** (`event → [line variants] × language × buddy`). Writers add lines without code changes, and phase 4 AI hints plug into the same events.

### 5.2 Voice

- **Buddy voice lines** are professionally recorded per buddy (~400 lines each for v1). They cover every greeting, hint, praise and transition.
- **Content words** ("giraffe", "Tuesday", "half past three") use a **recorded content voice pack**. The device TTS is the fallback, and the parent's own recordings override both (the approach Martha's Learning Corner already uses for phonics).

---

## 6. The learning journey

### 6.1 Structure

```
World (home screen map)
 └─ Subject           e.g. Animals
     └─ Unit          e.g. Animals on the farm   (a "stage" on the trail, 4–8 lessons)
         └─ Lesson    e.g. Farm animal sounds    (2–4 min, 5–8 exercises)
             └─ Exercise  e.g. "Tap the animal that says moo"
         └─ Unit checkpoint (trophy node): mixed review + a game, unlocks the next unit
```

- The **home screen is a world map**. Each subject is a place: Numbers Mountain, Animal Safari, Space Station, Weather Valley, Clock Tower and so on. Tapping a place opens that subject's **winding trail** (Chipuka's continuous path). Units appear as stage banners and lessons as numbered stepping stones.
- **Linear inside a subject, free across subjects.** A child can hop between Animals and Shapes freely. Within Animals, "Wild animals" unlocks after "Farm animals".
- **Prerequisites across subjects** where it matters: Time → "Reading the clock" needs Numbers → "Counting to 12". The trail shows a friendly signpost ("Visit Numbers Mountain first!").

### 6.2 Age bands and placement

| Band | Age | Profile of exercises |
|---|---|---|
| **Seedling** | 3–4 | Listen-and-tap, 2–3 choices, big targets, no reading, everything spoken |
| **Sprout** | 5–6 | 3–4 choices, matching, sequencing, simple counting and sums, tracing, first sight words |
| **Explorer** | 7–8 | 4+ choices, reading the question, multi-step, clocks to 5 minutes, calendar, centuries, sorting into many categories |
| **Voyager** | 9–12 | Typed answers, multi-step problems, short reading passages, diagrams and labelling, timed challenge rounds (optional, never required) |
| **Trailblazer** | 13+ (teens and adults, no upper limit) | Deeper concept units, explanations before practice, data and diagrams, self-made flashcard trails, mastery tests per unit; adult learners can start at any band (e.g. an adult learning to read starts at Explorer content with the adult look) |

**Bands are about content level, not age.** Age sets the *starting* band and the *look and tone*, but a learner can sit at different bands in different subjects: a 10-year-old can be Trailblazer in Planets and Explorer in Time. An adult learner gets the adult look at whatever content level fits them.

When a profile is created, the age sets the starting band. An optional 2-minute **placement quiz** per subject lets a 6-year-old who already knows the alphabet skip ahead, and skipped lessons show as completed with a bronze star. Chipuka's **adaptive difficulty** carries over. Two consecutive 3-star lessons raise the difficulty inside a band (more choices, fewer hints). Two struggling lessons lower it. Grown-ups can lock the level.

### 6.3 Mastery, stars and review

- Each lesson gives **1–3 stars** based on first-try accuracy. Any completion earns at least 1 star.
- Every item (a word, number or picture) has a **mastery score** per child, as in Chipuka's `card_stats`. Items below threshold appear in **review lessons** that the trail inserts automatically (spaced repetition: 1, 3, 7 and 14 days).
- **Legendary replay:** completed units can be replayed for treasures at the harder band's settings, so older siblings aren't bored.
- **Daily goal:** a grown-up-set target (default: 2 lessons). Hitting it fills the day on the streak calendar. Streaks have **"rest days"**: 2 per week freeze automatically, so a weekend away doesn't break anything.

---

## 7. Subject catalogue and progressions

Every subject is a **full trail running through all five bands**: 🌱 Seedling (3–4) · 🌿 Sprout (5–6) · 🌳 Explorer (7–8) · 🚀 Voyager (9–12) · 🏔️ Trailblazer (13+, no upper limit). Units are listed **in trail order**. Each unit is a stage of 4–8 lessons ending in a checkpoint.

Every subject follows the same pattern of depth:
1. **Recognise** (name it, hear it, point to it)
2. **Group** (sort into categories and sub-categories)
3. **Relate** (compare, order, cause and effect, how things connect)
4. **Explain** (why and how it works)
5. **Apply** (use it in real life, solve problems, form opinions)

Each subject also notes its **signature games**, **cross-links** (where it unlocks or reuses another subject), and the **custom-content hook** (where a family's or class's own photos and voices fit naturally).

**Content volume:** the catalogue below has **484 units across 23 subjects (≈2,900 lessons at ~6 per unit)**. The 🌱–🌳 bands (ages 3–8) are 291 units (≈1,750 lessons). The launch ships the 🌱–🌳 units of 16 subjects, and the MVP ships 5 (§7.25, §14). 🚀 and 🏔️ units roll out after launch (§14).

---

### 7.1 Numbers and maths
*Signature games:* Count-and-tap, Number line hop, Market stall (money), Pizza fractions, Graph builder. *Cross-links:* Time (clock needs counting to 12 and by 5s), Shapes (geometry), Sports (scores, measuring). *Custom hook:* count the family's real objects ("How many goats does Grandpa have?").

| Unit | Band | Content |
|---|---|---|
| Counting 1–5 | 🌱 | Say, see and tap 1–5; one-to-one counting of objects; "how many?" |
| Counting 6–10 | 🌱 | Counting to 10, counting fingers, numbers in songs |
| Number shapes 0–10 | 🌱 | Recognise numerals, match numeral ↔ quantity, zero means none |
| More, less, same | 🌱 | Compare groups by looking, then by counting |
| Numbers 11–20 | 🌿 | Teen numbers, counting on from 10, ten-frames |
| Number order and the number line | 🌿 | Before/after/between, missing numbers, ordinal words (1st–10th) |
| Adding within 10 | 🌿 | Combining groups, counting on, number bonds to 5 and 10 |
| Taking away within 10 | 🌿 | Take away, how many left, difference by comparing |
| Patterns and sorting | 🌿 | Repeating patterns (AB, ABC), sort by size/colour/type |
| Counting by 2s, 5s and 10s to 100 | 🌳 | Skip counting, hundred square, odd and even |
| Place value: tens and ones | 🌳 | Bundling into tens, two-digit numbers, expanded form |
| Adding and subtracting to 100 | 🌳 | Mental strategies, word problems, inverse operations |
| Measuring | 🌳 | Longer/shorter, heavier/lighter, holds more; non-standard then cm, kg, litres |
| Money basics | 🌳 | Coin and note values (localised currency), making amounts, giving change |
| Halves and quarters | 🌳 | Equal parts of shapes and groups |
| Times tables | 🚀 | 2, 5, 10 → 3, 4, 6–12; multiplication as groups and arrays |
| Division | 🚀 | Sharing and grouping, remainders, link to times tables |
| Fractions, decimals, percentages | 🚀 | Equivalent fractions, comparing, ½ = 0.5 = 50% |
| Large numbers and rounding | 🚀 | Thousands to millions, place value, estimating |
| Area, perimeter, volume | 🚀 | Squares on a grid, formulas, real rooms and boxes |
| Data and graphs | 🚀 | Tally charts, bar charts, pictograms, line graphs, reading averages |
| Negative numbers and integers | 🏔️ | Temperature, debt, number line both ways |
| Ratio and proportion | 🏔️ | Recipes, maps and scale, sharing in a ratio |
| Algebra basics | 🏔️ | Unknowns, expressions, simple equations, sequences and nth term |
| Probability | 🏔️ | Chance language, dice and spinners, simple probability fractions |
| Statistics | 🏔️ | Mean/median/mode, misleading graphs, surveys |
| Everyday and financial maths | 🏔️ | Budgets, unit prices, discounts, interest, saving goals, bills |

### 7.2 Language: alphabet, phonics, reading and writing *(builds on Martha's phonics engine)*
*Signature games:* Letter trace, First-sound hunt, Blend train, Word builder, Rhyme pop, Story sequencing. *Cross-links:* every subject's vocabulary feeds the word lists; Opposites. *Custom hook:* parent records letter sounds; teachers upload weekly spelling lists; family-name word lists.

| Unit | Band | Content |
|---|---|---|
| Listening and sounds around us | 🌱 | Environmental sounds, loud/quiet, same/different sounds (pre-phonics listening) |
| Letter names A–Z | 🌱 | Alphabet song, recognising capital letters, letters in my name |
| Letter sounds, group 1 | 🌱 | s, a, t, p, i, n: hear, say, find the picture that starts with it |
| Letter sounds, groups 2–4 | 🌿 | Remaining single sounds in teaching order (m, d, g, o, c, k…) |
| Lowercase and uppercase | 🌿 | Match pairs, which one is the capital, case sorting |
| Tracing and letter formation | 🌿 | Correct stroke order, letter families (c-a-d-g), numbers too |
| Blending CVC words | 🌿 | c-a-t → cat; sound buttons; read the picture's word |
| Segmenting and spelling CVC | 🌿 | Hear a word, build it from letter tiles |
| Two-letter sounds (digraphs) | 🌿 | sh, ch, th, ng, ck, ee, oo, ai, oa, ar, or |
| Rhyme and syllables | 🌿 | Rhyme pairs, clap the syllables, odd rhyme out |
| Sight words (tricky words) | 🌳 | the, said, was, you, they… recognised by sight, in short sentences |
| Longer sounds and blends | 🌳 | Vowel teams (igh, ear, air), consonant blends (st, tr, fl), split digraphs (a_e) |
| Reading sentences and picture stories | 🌳 | Decodable stories with questions: who, what, where |
| Capital letters, full stops, question marks | 🌳 | Fix the sentence, sentence builder |
| Nouns, verbs and adjectives | 🌳 | Naming, doing and describing words, sort the words |
| Reading comprehension | 🚀 | Fiction and non-fiction passages; retrieval, inference, prediction, summarising |
| Grammar and punctuation | 🚀 | Tenses, plurals, commas, apostrophes, speech marks, conjunctions |
| Spelling patterns and rules | 🚀 | Prefixes, suffixes, homophones, silent letters, plural rules |
| Vocabulary building | 🚀 | Synonyms, word families, context clues, dictionary skills |
| Writing structure | 🚀 | Sentence → paragraph; story mountain; instructions, letters, reports |
| Figurative language | 🏔️ | Simile, metaphor, personification, idioms |
| Critical reading | 🏔️ | Fact vs. opinion, author's purpose, bias, comparing sources, spotting misinformation |
| Persuasive and argument writing | 🏔️ | Claims, evidence, counter-argument, structure |
| Poetry and literature | 🏔️ | Rhythm, form, theme; reading classic and modern texts |
| Adult literacy track | 🏔️ | Phonics-to-reading pathway with adult look, everyday texts (forms, signs, labels, messages) |

### 7.3 Animals
*Signature games:* Animal sounds quiz, Sorting race (land/water/air), Feed the animal, Who's my baby?, Habitat builder, Food-web connector. *Cross-links:* Plants (food chains), Weather (migration, hibernation), Body parts (comparing bodies). *Custom hook:* family pets and farm animals, class pet, zoo trip photos.

| Unit | Band | Content |
|---|---|---|
| Animal sounds | 🌱 | Moo, baa, roar, quack: listen and tap |
| **Domestic animals** (pets) | 🌱 | Dog, cat, rabbit, fish, parrot, guinea pig; caring for a pet |
| **Farm animals** | 🌱 | Cow, goat, sheep, hen, pig, donkey, camel, duck; what they give us (milk, eggs, wool) |
| Animal colours and patterns | 🌱 | Stripes, spots, patches: zebra, leopard, cow, ladybird |
| **Wild animals** | 🌿 | Lion, elephant, giraffe, zebra, monkey, bear, hippo, rhino |
| **Land, water, air** | 🌿 | Sort animals into where they live and move |
| **Water animals** | 🌿 | Fish, whale, octopus, crab, dolphin, turtle, starfish, shark |
| **Air animals** (birds and insects) | 🌿 | Eagle, owl, bee, butterfly, bat (*a mammal that flies!*) |
| Animal babies | 🌿 | Calf, kid, chick, cub, puppy, kitten, joey, tadpole |
| Animal homes | 🌿 | Nest, hive, den, burrow, stable, kennel, web, shell |
| Animal body parts | 🌳 | Fur, feathers, scales, fins, wings, beaks, claws, tails: what they're for |
| Habitats | 🌳 | Savannah, rainforest, desert, ocean, polar, mountain, farm, garden |
| What animals eat | 🌳 | Herbivore, carnivore, omnivore |
| Animal groups | 🌳 | Mammals, birds, reptiles, fish, amphibians, insects |
| Life cycles | 🌳 | Egg → tadpole → frog; caterpillar → butterfly; egg → chick → hen |
| Day and night animals | 🌳 | Nocturnal vs. diurnal, how owls and bats find their way |
| Classification in depth | 🚀 | Vertebrates vs. invertebrates, arachnids, molluscs, crustaceans; using a branching key |
| Food chains and food webs | 🚀 | Producers, consumers, predators, prey, decomposers |
| Adaptation | 🚀 | Camouflage, migration, hibernation, how camels and polar bears survive |
| Endangered animals and conservation | 🚀 | Why animals become endangered, protected areas, what people can do |
| Animal behaviour | 🚀 | Herds, packs, colonies, communication, tool use |
| Ecosystems and balance | 🏔️ | Keystone species, invasive species, ecosystem services |
| Evolution and natural selection | 🏔️ | Variation, inheritance, fossils, Darwin |
| Animal biology | 🏔️ | Body systems compared across groups, cells, reproduction |
| Humans and animals | 🏔️ | Domestication history, farming and welfare, wildlife and tourism, animal ethics debates |

### 7.4 Plants
*Signature games:* Grow-a-seed (sequence), Fruit or vegetable?, Plant-part labeller, Garden planner, Pollinator flight. *Cross-links:* Animals (food chains, pollinators), Weather (seasons, rain), Body (healthy food), Colours (leaves changing). *Custom hook:* photos of the family garden or shamba, a class bean-growing diary.

| Unit | Band | Content |
|---|---|---|
| Plants all around | 🌱 | Tree, flower, grass, bush: spot plants in pictures |
| Fruits | 🌱 | Banana, mango, apple, orange, avocado, pineapple: name, colour, taste words |
| Vegetables | 🌱 | Carrot, tomato, cabbage, spinach, potato, onion |
| Parts of a plant | 🌱 | Root, stem, leaf, flower |
| What plants need | 🌿 | Sun, water, soil, air, space; what happens without them |
| Seed to plant | 🌿 | Seed → sprout → seedling → plant → flower → fruit (sequence) |
| Trees | 🌿 | Trunk, branches, bark, leaves; fruit trees; trees as homes |
| Flowers | 🌿 | Petals and colours; why flowers smell |
| Parts we eat | 🌿 | Roots (carrot), stems (celery), leaves (spinach), seeds (beans), fruits, flowers (broccoli) |
| Plants in different places | 🌳 | Cactus (desert), water lily (pond), moss (shade), mangroves (coast), rainforest plants |
| Seeds travel | 🌳 | Wind, water, animals, popping: dandelion, coconut, burrs |
| Plants through the seasons | 🌳 | Deciduous vs. evergreen, wet and dry season growth, harvest time |
| How plants help us | 🌳 | Food, air, shade, wood, medicine, clothing (cotton) |
| Photosynthesis | 🚀 | Leaves as food factories: sunlight, water and CO₂ in, sugar and oxygen out |
| Pollination | 🚀 | Pollinators (bees, birds, bats), flower parts (stamen, pistil), fertilisation |
| Plant life cycles | 🚀 | Annuals, perennials, germination conditions (a planned experiment) |
| Plant classification | 🚀 | Flowering vs. non-flowering, ferns, mosses, conifers |
| Growing food | 🚀 | Kitchen gardens, crop rotation, composting |
| Plant cells and transport | 🏔️ | Cell structure, xylem and phloem, transpiration |
| Agriculture and food security | 🏔️ | Staple crops, soil health, drought, irrigation, feeding the world |
| Forests and climate | 🏔️ | Deforestation, reforestation, carbon storage |
| Plants and medicine | 🏔️ | Traditional and modern medicines from plants, plant safety (poisonous plants) |

### 7.5 Shapes and geometry
*Signature games:* Shape hunt (camera-free picture scenes), Tangram builder, Pattern finisher, Symmetry painter, Net folder. *Cross-links:* Numbers (sides, measuring), Colours (art), Time (clock face as a circle). *Custom hook:* photograph shapes at home ("our window is a rectangle").

| Unit | Band | Content |
|---|---|---|
| Circle, square, triangle | 🌱 | Name, find, match |
| More shapes | 🌱 | Rectangle, oval, star, heart, diamond |
| Big and small shapes | 🌱 | Same shape, different sizes; size ordering |
| Shapes around us | 🌿 | Wheel = circle, door = rectangle, roof = triangle |
| Sides and corners | 🌿 | Count sides and corners; curved vs. straight |
| Shape patterns | 🌿 | Continue the pattern, make your own |
| Making pictures from shapes | 🌿 | Build a house, a rocket, a cat from shapes |
| 2D shapes in depth | 🌳 | Pentagon, hexagon, octagon; regular vs. irregular |
| 3D shapes | 🌳 | Cube, cuboid, sphere, cone, cylinder, pyramid; faces, edges, vertices |
| Symmetry | 🌳 | Lines of symmetry, mirror painting |
| Turns and shapes | 🌳 | Quarter, half and full turns of shapes (full Positions and Directions trails in §7.14–7.15) |
| Tangrams and tessellation | 🌳 | Shapes that fit together, honeycomb, tiles |
| Angles | 🚀 | Right, acute, obtuse; measuring with a protractor |
| Triangles and quadrilaterals | 🚀 | Types and properties: isosceles, parallelogram, trapezium |
| Nets of 3D shapes | 🚀 | Which net folds into a cube |
| Coordinates | 🚀 | Grids, plotting points, treasure maps |
| Circles | 🚀 | Radius, diameter, circumference |
| Transformations | 🏔️ | Reflection, rotation, translation, enlargement |
| Pythagoras and trigonometry intro | 🏔️ | Right-angled triangles in the real world |
| Constructions and loci | 🏔️ | Compass and ruler, bisectors |
| Geometry in the world | 🏔️ | Architecture, nature (spirals, hexagons), art and design |

### 7.6 Colours
*Signature games:* Colour mixer, Rainbow builder, Colour-by-number, Find the colour (scene hunt), Mood palette. *Cross-links:* Weather (rainbows), Plants (leaves change colour), Planets (planet colours), Body (skin, eye and hair colours, gently and inclusively). *Custom hook:* "our family's favourite colours", photos of colourful things at home.

| Unit | Band | Content |
|---|---|---|
| Red, yellow, blue | 🌱 | Name, find, tap the colour |
| More colours | 🌱 | Green, orange, purple, pink, brown, black, white, grey |
| Colours of things | 🌱 | Banana yellow, grass green, sky blue: colour objects |
| Same and different colour | 🌱 | Match and sort by colour |
| Colours in nature | 🌿 | Flowers, animals, sky at different times, the sea |
| Mixing colours | 🌿 | Red + yellow = orange, blue + yellow = green, red + blue = purple |
| Light and dark | 🌿 | Shades: light blue, dark blue; adding white or black |
| The rainbow | 🌿 | Rainbow order, when rainbows appear |
| Colour patterns | 🌳 | Pattern continuation with colour and shape combined |
| Warm and cool colours | 🌳 | Fire colours vs. ice colours, colours and feelings |
| Colours in signals | 🌳 | Traffic lights, warning colours, flags |
| Colours in animals | 🌳 | Camouflage, warning colours (poison frogs), showing off (peacock) |
| Light and the spectrum | 🚀 | White light splits (prisms), why the sky is blue, sunsets |
| How we see colour | 🚀 | The eye, colour blindness (inclusive framing) |
| Primary colours of light vs. paint | 🚀 | RGB screens vs. paint mixing |
| Colour in art | 🚀 | Famous artworks (public domain), complementary colours |
| Colour theory and design | 🏔️ | Colour wheel, harmony, contrast, accessibility (contrast for readability) |
| Colour in culture | 🏔️ | Meanings of colours around the world, flags and symbols |
| Pigments and dyes | 🏔️ | Natural vs. synthetic dyes, history of colours (Tyrian purple, indigo) |

### 7.7 Weather and seasons *(global content with a localisable "my climate" unit)*
*Signature games:* What to wear (Martha's game), Weather reporter, Season sorter, Build a water cycle, Read the forecast. *Cross-links:* Time (months ↔ seasons), Plants and Animals (seasonal changes), Colours (rainbows). *Custom hook:* a family or class weather diary with photos of today's sky.

| Unit | Band | Content |
|---|---|---|
| Sunny, rainy, cloudy, windy | 🌱 | Name and recognise weather |
| What to wear | 🌱 | Dress for the weather (game) |
| Hot and cold | 🌱 | Feeling temperature, hot and cold things |
| Day sky and night sky | 🌱 | Sun, clouds, moon, stars |
| More weather | 🌿 | Stormy, snowy, foggy, thunder and lightning, rainbows, hail |
| Weather and activities | 🌿 | What can we do in each weather; staying safe in a storm |
| **Four seasons** | 🌿 | Spring, summer, autumn, winter: what changes |
| **Wet and dry seasons** | 🌿 | Tropical climates: rainy season, dry season |
| **My seasons** | 🌳 | The family's region's seasons (set at sign-up), e.g. Kenya's long rains and short rains, monsoon, Mediterranean |
| Measuring weather | 🌳 | Thermometer, rain gauge, windsock; keeping a weather chart |
| Clouds | 🌳 | Fluffy, flat, storm clouds; what clouds are made of |
| The water cycle | 🌳 | Evaporation, condensation, rain, rivers, back to the sea |
| Weather safety | 🌳 | Lightning, floods, heat, sun protection |
| Climate zones | 🚀 | Tropical, dry, temperate, polar, mountain; world map |
| Why we have seasons | 🚀 | Earth's tilt and orbit (link to Planets) |
| Wind and air pressure | 🚀 | Why wind blows, sea breezes, Beaufort scale |
| Extreme weather | 🚀 | Hurricanes/cyclones, tornadoes, droughts, monsoons |
| Reading forecasts and weather maps | 🚀 | Symbols, isobars, temperature maps |
| Climate vs. weather | 🏔️ | Averages over time, climate graphs |
| Climate change | 🏔️ | Greenhouse effect, evidence, impacts, solutions (taught factually, without alarm) |
| Weather and society | 🏔️ | Farming, early warning systems, adapting cities |

### 7.8 Time *(the longest progression, spanning all five bands)*
*Signature games:* Clock setter, Routine sequencing, Calendar hunt, Timeline ladder, Time-zone travel. *Cross-links:* Numbers (counting to 60, by 5s), Weather (months and seasons), Planets (day/night, year). *Custom hook:* the child's own daily routine with family photos; family birthdays on the calendar.

| Unit | Band | Content |
|---|---|---|
| Day and night | 🌱 | Sun/moon, what we do in the day vs. night |
| Parts of the day | 🌱 | Morning, afternoon, evening, night: daily routine sequencing |
| Before and after, first/next/last | 🌱 | Sequencing stories |
| Fast and slow, long and short time | 🌱 | Which takes longer: blinking or sleeping? |
| **Days of the week** | 🌿 | Names, order, yesterday/today/tomorrow, the weekend |
| **Months of the year** | 🌿 | Names, order, birthdays, months ↔ seasons |
| **Reading a clock: o'clock** | 🌿 | Hour hand, analogue clock-setter game |
| Half past | 🌿 | Minute hand at 6 |
| Quarter past / quarter to | 🌳 | Clock face in quarters |
| 5-minute intervals | 🌳 | Counting by 5s around the clock |
| Digital ↔ analogue | 🌳 | Match 3:30 to the clock face |
| How long is…? | 🌳 | Seconds, minutes, hours, days: compare durations |
| The calendar | 🌳 | Read a month page, find a date, count days |
| **Bigger time** | 🌳 | Week → month → year → **decade (10 years)** → **century (100 years)** → **millennium (1,000 years)**, with a timeline ladder (your age, a grandparent's age, the pyramids) |
| 24-hour clock | 🚀 | 14:00 = 2 pm, timetables |
| Elapsed time | 🚀 | Start/end/duration problems, planning a day |
| Leap years and calendars | 🚀 | Why February changes, days in each month |
| Time zones | 🚀 | Why it's night in another country, travel and calls |
| History timelines | 🚀 | Ordering eras, BCE/CE, centuries named (the 21st century is the 2000s) |
| Calendar systems | 🏔️ | Gregorian, lunar and other calendars, how they began |
| Measuring time through history | 🏔️ | Sundials, water clocks, atomic clocks |
| Geological and cosmic time | 🏔️ | Dinosaurs, Earth's age, scale of millions and billions of years |
| Time management | 🏔️ | Planning, prioritising, routines, study schedules |

### 7.9 Opposites and word meanings
*Signature games:* Opposite pairs memory, Flip it! (tap to see the opposite), Synonym snap, Word-family tree. *Cross-links:* Language, every subject's vocabulary (hot/cold → Weather, heavy/light → Measuring). *Custom hook:* act it out: parents record the child showing "big" and "small".

| Unit | Band | Content |
|---|---|---|
| Big and small | 🌱 | Size opposites with pictures |
| Hot and cold, wet and dry | 🌱 | Feeling words |
| Up and down, in and out | 🌱 | Position opposites with a buddy demo |
| Happy and sad | 🌱 | Feeling faces (links to the Feelings subject) |
| Open/closed, on/off, full/empty | 🌿 | Everyday object states |
| Fast/slow, loud/quiet, heavy/light | 🌿 | Comparing with sound and motion |
| Push/pull, give/take, come/go | 🌿 | Action opposites |
| Day/night, before/after, first/last | 🌿 | Time opposites |
| Opposites in sentences | 🌳 | "The cup is full / empty" (reading) |
| Same meaning (synonyms) | 🌳 | Big = large, happy = glad |
| Comparing words | 🌳 | Big → bigger → biggest; good → better → best |
| Prefix opposites | 🚀 | un-, dis-, in-, im-, non- (happy/unhappy, possible/impossible) |
| Antonyms and synonyms in depth | 🚀 | Shades of meaning (warm, hot, scorching) |
| Homophones and homonyms | 🚀 | There/their/they're, bat (animal) / bat (sport) |
| Word roots | 🏔️ | Latin and Greek roots (tele-, bio-, -graph) |
| Nuance and tone | 🏔️ | Connotation (slim vs. skinny), formal vs. informal |
| Two sides of an argument | 🏔️ | Contrasting viewpoints, balanced discussion |

### 7.10 Planets and space *(builds on Martha's true-scale planets)*
*Signature games:* Planet line-up (true scale), Rocket launch countdown, Moon-phase matcher, Build the solar system, Light-year race. *Cross-links:* Time (day, year, calendars), Weather (seasons), Shapes (spheres, orbits). *Custom hook:* the child's own drawings of planets turned into jigsaws; night-sky photos.

| Unit | Band | Content |
|---|---|---|
| Sun, Moon and stars | 🌱 | What's in the sky, day vs. night sky |
| The Moon | 🌱 | Moon shapes we see, the Moon at night |
| Rockets and astronauts | 🌱 | What astronauts wear and do |
| The eight planets | 🌿 | Names and colours |
| Planet order | 🌿 | Line-up game, the planets' order from the Sun |
| Big and small planets | 🌿 | True-scale comparison |
| Earth, our home | 🌿 | Land, water, air; why Earth is special |
| Rocky and gas planets | 🌳 | Inner vs. outer planets |
| Moon phases | 🌳 | New, crescent, half, full; the monthly cycle |
| Day, night and the year | 🌳 | Earth spins (day), Earth orbits (year) |
| Stars and constellations | 🌳 | Star patterns, the Sun is a star |
| Living in space | 🌳 | The space station, food, sleep and exercise in space |
| The Solar System in depth | 🚀 | Dwarf planets, asteroids, comets, moons of other planets |
| Gravity | 🚀 | Why things fall, orbits, weight on other planets |
| Eclipses and seasons | 🚀 | Solar and lunar eclipses, why seasons happen |
| History of space exploration | 🚀 | First satellite, Moon landing, space probes |
| Telescopes and observing | 🚀 | How telescopes work, observing the night sky |
| Stars and their life cycles | 🏔️ | Nebula, main sequence, red giant, supernova, black holes |
| Galaxies and the universe | 🏔️ | The Milky Way, light-years, the Big Bang |
| Space today | 🏔️ | Mars missions, satellites in daily life, space careers |
| Is there life out there? | 🏔️ | Exoplanets, habitable zone, how scientists search |

### 7.11 Transport and vehicles
*Signature games:* Vehicle sounds, Land/water/air sorter, Road-safety crossing, Build-a-vehicle, Route planner. *Cross-links:* Time (timetables), Shapes (wheels), Numbers (distance, speed). *Custom hook:* the family car, the school bus, the matatu or tuk-tuk in your town.

| Unit | Band | Content |
|---|---|---|
| Things that go | 🌱 | Car, bus, train, plane, boat, bicycle |
| Vehicle sounds | 🌱 | Beep, choo-choo, vroom |
| Vehicle colours and sizes | 🌱 | Big lorry, small scooter, red fire engine |
| Land, water, air | 🌿 | Sort vehicles by where they travel |
| Emergency vehicles | 🌿 | Ambulance, fire engine, police car; when to call for help |
| Work vehicles | 🌿 | Tractor, digger, crane, dump truck, rubbish truck |
| Public transport | 🌿 | Bus, train, ferry, taxi, local transport (matatu, tuk-tuk, tram) |
| Parts of vehicles | 🌳 | Wheels, engine, wings, sails, propeller |
| Road safety | 🌳 | Traffic lights, zebra crossing, seatbelts, helmets |
| Then and now | 🌳 | Walking, horse cart, steam train → car → electric car |
| Maps and directions | 🌳 | Simple maps, left/right, following a route |
| How vehicles move | 🚀 | Forces: push, pull, friction, air resistance |
| How engines work | 🚀 | Petrol, diesel, electric motors, simple explanations |
| How planes fly and ships float | 🚀 | Lift, buoyancy |
| Journeys and distance | 🚀 | Speed = distance ÷ time, map scale |
| Transport and energy | 🏔️ | Fuel, emissions, electric and hydrogen vehicles |
| Cities and transport planning | 🏔️ | Traffic, public transit, cycling cities |
| Future transport | 🏔️ | Self-driving cars, high-speed rail, drones |
| Driving theory basics | 🏔️ | Road signs and rules (adult learners) |

### 7.12 Sports and movement
*Signature games:* Move-along (copy the buddy's moves), Equipment matcher, Score keeper, Rules quiz. *Cross-links:* Body (healthy body), Numbers (scores, timing), Countries (international sports). *Custom hook:* the child's own sport or club, team photos, sports day.

| Unit | Band | Content |
|---|---|---|
| Moving words | 🌱 | Run, jump, hop, skip, kick, throw, catch, swim |
| Balls and games | 🌱 | Big ball, small ball, rolling, bouncing |
| Copy the move | 🌱 | Active break: follow the buddy (gets kids moving) |
| Popular sports | 🌿 | Football, basketball, tennis, athletics, swimming, cricket, netball |
| Sports equipment | 🌿 | Match the bat, ball, racket, goal |
| Team and solo sports | 🌿 | Playing together vs. on your own |
| Playing fair | 🌿 | Taking turns, winning and losing well |
| Water, winter and track sports | 🌳 | Swimming, sailing, skiing, running, jumping |
| Where sports happen | 🌳 | Pitch, court, pool, track, ring |
| Keeping score | 🌳 | Points, goals, times |
| Staying safe in sport | 🌳 | Warm-up, water, helmets, sun protection |
| Rules of major sports | 🚀 | Football, basketball, cricket, athletics events |
| Fitness and the body | 🚀 | Heart rate, muscles, stamina, stretching |
| Sports around the world | 🚀 | Sports by country, the Olympics and Paralympics |
| Famous moments in sport | 🚀 | Records and great athletes from many countries |
| Sports science | 🏔️ | Training, nutrition, recovery, measuring performance |
| Sport and society | 🏔️ | History of the Olympics, inclusion, fair play and doping |
| Coaching and teamwork | 🏔️ | Leadership, tactics, mindset |

### 7.13 Body parts and health *(extends Martha's "My body")*
*Signature games:* Head-shoulders-knees (move along), Body puzzle, Five-senses lab, Healthy plate builder, Organ placer. *Cross-links:* Sports, Plants (food), Animals (comparing bodies), Feelings. *Custom hook:* the family's healthy-habits chart, photos of the child's routines.

| Unit | Band | Content |
|---|---|---|
| Head, shoulders, knees and toes | 🌱 | Point to and name body parts |
| My face | 🌱 | Eyes, nose, mouth, ears, hair, cheeks |
| Hands and feet | 🌱 | Fingers and toes, counting them |
| What my body can do | 🌱 | See, hear, run, clap, sing |
| Five senses | 🌿 | Sight, hearing, smell, taste, touch: which part does each |
| Keeping clean | 🌿 | Washing hands, brushing teeth, bathing |
| Healthy food | 🌿 | Growing food, treat food, water |
| Sleep and rest | 🌿 | Why we sleep, bedtime routine |
| Growing up | 🌳 | Baby → child → adult → older adult, how bodies change |
| Inside the body | 🌳 | Heart, lungs, bones, stomach, brain, simply explained |
| The healthy plate | 🌳 | Food groups, balanced meals |
| Feeling unwell and staying safe | 🌳 | Germs, telling a grown-up, visiting the doctor |
| My body belongs to me | 🌳 | Body safety: private parts, safe and unsafe touch, telling a trusted adult (age-appropriate, aligned with child-protection guidance) |
| Body systems | 🚀 | Skeletal, muscular, circulatory, respiratory, digestive, nervous |
| Nutrition | 🚀 | Nutrients, labels, energy |
| Puberty basics | 🚀 | Body changes, hygiene (opt-in, parent-controlled visibility) |
| First aid | 🚀 | Cuts, burns, choking: when to call for help |
| Cells, genes and inheritance | 🏔️ | Cells, DNA, why we look like family |
| Health and disease | 🏔️ | Immune system, vaccines, infection vs. lifestyle disease |
| Mental health and wellbeing | 🏔️ | Stress, sleep, exercise, talking about feelings, where to get help |
| Human biology in depth | 🏔️ | Homeostasis, hormones, the brain |

### 7.14 Positions *(spatial language)*
*Signature games:* Where's the buddy? (the buddy hides; tap where), Put it there! (drag the ball *under* the table), Simon says positions (move-along), Room arranger, Describe-and-draw. *Cross-links:* Directions (left/right, maps), Shapes (position and direction, coordinates), Language (prepositions), Coding (move forward, turn). *Custom hook:* photos of the child's own room ("Where is your teddy? On the bed!"), with the parent recording the questions in their own voice.

| Unit | Band | Content |
|---|---|---|
| In and out | 🌱 | The cat is *in* the box / *out* of the box |
| On and under | 🌱 | Ball on the table, ball under the table |
| Up and down | 🌱 | Bird up in the tree, dog down on the ground |
| Top and bottom | 🌱 | Top of the stairs, bottom of the slide; top shelf / bottom shelf |
| Front and back | 🌱 | The front of the bus, the back of the bus; my front, my back |
| In front of and behind | 🌱 | The buddy stands *in front of* the tree, then *behind* it; who's hiding? |
| Next to, beside and between | 🌿 | The cup is *next to* the plate; the cat is *between* two dogs |
| Over and under (moving) | 🌿 | Jump *over* the log, crawl *under* the rope |
| Near and far | 🌿 | Which house is near the tree? Which is far away? |
| Inside and outside | 🌿 | Inside the house, outside in the garden; inside the circle |
| Above and below | 🌿 | Clouds *above* the house, fish *below* the boat |
| First, middle, last (in a line) | 🌿 | Who is first in the queue? Who is in the middle? |
| Left and right (on my body) | 🌳 | Left hand, right foot; the "L" trick; mirror confusion explained |
| Left and right (in pictures) | 🌳 | The car on the left of the road; turning a picture changes left/right |
| Around, through, across, along | 🌳 | Walk *around* the pond, *through* the tunnel, *across* the bridge, *along* the path |
| Opposite, corner, centre, edge | 🌳 | Opposite side of the table, the corner of the room, centre of the circle |
| Following position instructions | 🌳 | "Put the red block on top of the blue block, behind the box" (multi-step) |
| Describing a scene | 🚀 | Write or choose sentences describing where everything is |
| Position on grids | 🚀 | Rows and columns, "3 across, 2 up" (links to coordinates) |
| Perspective and viewpoint | 🚀 | What does the scene look like from above, from the side, from behind? Plan views |
| Spatial reasoning puzzles | 🚀 | Rotate the shape, which view matches, block-building from plans |
| Spatial reasoning in depth | 🏔️ | Mental rotation, 3D visualisation, elevations (architecture and engineering drawings) |
| Positional language in other contexts | 🏔️ | Stage directions (upstage/downstage), sport positions, positions in a team or organisation |

### 7.15 Directions, maps and the compass
*Signature games:* Treasure map (follow directions to the X), Compass spinner, Robot route (program the buddy's moves), Map maker, Orienteering challenge. *Cross-links:* Positions, Shapes (angles, turns, coordinates), Time (time zones), Planets (the Sun rises in the east), Transport (routes), Countries (world map), Coding. *Custom hook:* families draw or photograph a map of their home, compound or street; teachers make a school-grounds treasure hunt.

| Unit | Band | Content |
|---|---|---|
| Come here, go there | 🌱 | Towards and away from; follow the buddy |
| Forwards and backwards | 🌱 | Step forwards, step backwards (move-along) |
| Which way? | 🌱 | Follow an arrow, find the path to the house |
| Turning | 🌿 | Turn around, turn to face the door |
| Left and right turns | 🌿 | Turn left, turn right; guide the buddy along a path |
| Simple routes | 🌿 | From home to school: what do we pass? Sequencing a journey |
| Picture maps | 🌿 | Read a simple picture map: house, tree, river, shop |
| Following directions | 🌳 | "Go forward 3 steps, turn right, go forward 2" on a grid |
| Giving directions | 🌳 | Build the instructions to reach the treasure |
| Quarter, half and full turns | 🌳 | Clockwise and anticlockwise (links to the clock) |
| **The four compass points** | 🌳 | North, East, South, West; memory rhyme ("Never Eat Soggy Weetabix", or a localised one) |
| Where the Sun rises and sets | 🌳 | Sun rises in the east, sets in the west; using the Sun to find direction |
| Map symbols and keys | 🌳 | Symbols for a road, river, school, hospital; reading a key |
| **Eight compass points** | 🚀 | NE, SE, SW, NW; directions between places on a map |
| Using a real compass | 🚀 | How a magnetic compass works, the needle points north, orienting a map |
| Grid references | 🚀 | 4-figure grid references on a map |
| Scale and distance | 🚀 | Map scale, measuring distances, how far is it really? |
| Planning a route | 🚀 | Shortest vs. easiest route, landmarks, estimating travel time |
| Reading real maps | 🚀 | Town maps, transit maps, contour lines intro (hills and valleys) |
| **16-point compass and bearings** | 🏔️ | NNE etc.; three-figure bearings (045°), angles from north |
| Latitude and longitude | 🏔️ | The equator, the prime meridian, finding any place on Earth |
| Magnetic vs. true north | 🏔️ | Earth's magnetic field, declination, why compasses can mislead |
| Navigation through history | 🏔️ | Stars, the Polynesian and Swahili-coast sailors, the compass, chronometers, GPS |
| GPS and digital maps | 🏔️ | How satellites find you, map apps, location privacy |
| Orienteering and outdoor navigation | 🏔️ | Navigating with map and compass, staying safe outdoors |

### 7.16 Feelings and emotions
*Signature games:* Feelings faces match, How would you feel? (scenarios), Calm-down breathing with the buddy, Feelings thermometer, Kindness choices. *Cross-links:* Body (body clues to feelings), Kindness and citizenship, Opposites (happy/sad), Music (music and mood). *Custom hook:* family photos of real moments ("You were so proud here!"), parents record encouragement.
*Care note:* content is reviewed by an early-years/child-psychology adviser. It teaches recognising and naming feelings and healthy coping, never diagnosis. For older learners it points to trusted adults and help resources.

| Unit | Band | Content |
|---|---|---|
| Happy and sad | 🌱 | Feeling faces, what makes us happy or sad |
| Angry and scared | 🌱 | It's OK to feel angry or scared; what helps |
| How does the buddy feel? | 🌱 | Read the buddy's face and body |
| Calm-down tools | 🌱 | Balloon breathing, counting to 5, a hug, asking for help |
| More feelings | 🌿 | Excited, surprised, tired, proud, shy, bored, lonely |
| Feelings in the body | 🌿 | Butterflies in the tummy, hot face, tight fists |
| Why do I feel this way? | 🌿 | Matching situations to feelings |
| Feelings of others | 🌿 | Spotting when a friend is sad; how to help |
| Big feelings | 🌳 | Frustration, disappointment, jealousy, worry; naming them |
| Strategies that help | 🌳 | Take a break, talk it out, draw it, move your body |
| Friendship and feelings | 🌳 | Making up after an argument, saying sorry, forgiving |
| Feelings are different sizes | 🌳 | Feelings thermometer: small, medium, big feelings |
| Empathy | 🚀 | Seeing from someone else's side; perspective stories |
| Resilience and growth mindset | 🚀 | Mistakes help us learn, "not yet", trying again |
| Stress and worry | 🚀 | Healthy ways to cope, sleep and exercise, talking to someone |
| Online feelings | 🚀 | How screens and games can affect mood; kindness online |
| Emotional intelligence | 🏔️ | Self-awareness, self-regulation, motivation, social skills |
| Relationships and boundaries | 🏔️ | Healthy vs. unhealthy relationships, saying no, respect |
| Mental health basics | 🏔️ | Anxiety and low mood explained simply, reducing stigma, where to get help |
| Wellbeing habits | 🏔️ | Mindfulness, gratitude, balance, rest |

### 7.17 Food and healthy eating
*Signature games:* Healthy plate builder, Farm-to-table sequence, Market shopping (links to money), Recipe steps, Taste-word match. *Cross-links:* Plants (fruits, vegetables, crops), Animals (food from animals), Body (nutrition), Numbers (measuring, recipes), Countries (food around the world). *Custom hook:* photos of family meals and favourite dishes; a parent records the family recipe.
*Care note:* no calorie counting, weight talk or "good/bad food" labels for children. The focus is variety, enjoyment and where food comes from.

| Unit | Band | Content |
|---|---|---|
| Foods I know | 🌱 | Bread, rice, milk, eggs, fruits, vegetables |
| Mealtimes | 🌱 | Breakfast, lunch, dinner, snack |
| Tastes | 🌱 | Sweet, salty, sour, bitter (with the buddy's funny faces) |
| Drinks | 🌱 | Water, milk, juice; water keeps us healthy |
| Where food comes from | 🌿 | Farm, sea, garden, tree; animals and plants |
| Food groups | 🌿 | Fruit and vegetables, grains, protein, dairy, everyday vs. sometimes foods |
| Kitchen safety and hygiene | 🌿 | Wash hands, hot things, sharp things |
| Cooking words | 🌿 | Wash, cut, mix, boil, bake (sequence a simple recipe) |
| Farm to table | 🌳 | Wheat → flour → bread; cow → milk → cheese; seed → maize → ugali |
| Food around the world | 🌳 | Dishes from different countries |
| Following a recipe | 🌳 | Ingredients, steps, measuring (links to Numbers) |
| Healthy habits | 🌳 | Breakfast, water, chewing, eating together |
| Nutrients | 🚀 | Carbohydrates, protein, fats, vitamins, minerals, fibre: what each does |
| Reading food labels | 🚀 | Ingredients lists, allergens |
| Allergies and intolerances | 🚀 | What allergies are, keeping friends safe |
| Food preservation | 🚀 | Drying, cooling, salting, canning; why food goes off |
| Food science | 🏔️ | Cooking chemistry, fermentation, yeast |
| Food systems and sustainability | 🏔️ | Food miles, waste, seasonal eating, food security |
| Food and culture | 🏔️ | Festivals, traditions, food history (spice routes) |
| Planning balanced meals | 🏔️ | Budget meal planning (links to Money) |

### 7.18 My family and community
*Signature games:* Family tree builder, Who helps us? (match helper to job), Town builder, Places in my town, Job tools match. *Cross-links:* Feelings, Kindness and citizenship, Transport (emergency vehicles), Directions (maps of my town), Countries. *Custom hook:* the child's real family tree with photos and recorded names; photos of real local helpers and places (with consent).
*Care note:* family content is inclusive of all family shapes (single-parent, grandparent-led, blended, adoptive and foster families).

| Unit | Band | Content |
|---|---|---|
| My family | 🌱 | Mum, dad, brother, sister, grandma, grandpa; families come in many shapes |
| My home | 🌱 | Rooms in a house: kitchen, bedroom, bathroom |
| People who help us | 🌱 | Doctor, nurse, teacher, police officer, firefighter, farmer |
| My school | 🌱 | Classroom, teacher, friends, playground |
| Family roles and chores | 🌿 | How everyone helps at home |
| Places in my community | 🌿 | Shop, market, hospital, school, library, place of worship, park |
| Jobs and their tools | 🌿 | Chef–pan, builder–hammer, doctor–stethoscope |
| Celebrations | 🌿 | Birthdays, weddings, festivals, holidays |
| My family tree | 🌳 | Generations, cousins, aunts, uncles |
| Neighbours and community | 🌳 | Helping neighbours, community events |
| Emergency help | 🌳 | When and how to call emergency numbers (localised), knowing your address |
| Different homes | 🌳 | Houses, flats, huts, boats; homes in different climates |
| Local government and services | 🚀 | Who runs a town, water, waste, roads |
| Family history | 🚀 | Interviewing grandparents, a family timeline (links to Time) |
| Careers | 🚀 | Many kinds of work, skills for jobs |
| Communities around the world | 🚀 | Village, town, city; rural vs. urban life |
| Society and institutions | 🏔️ | Schools, health systems, courts, media |
| Work and careers in depth | 🏔️ | Pathways, CVs, interviews, entrepreneurship |
| Volunteering and community action | 🏔️ | Planning a community project |

### 7.19 Music and rhythm
*Signature games:* Clap the rhythm, Instrument sounds, Loud/quiet conductor, Make-a-beat (sequencer), Melody memory. *Cross-links:* Numbers (counting beats, patterns), Language (syllables, rhyme), Feelings (music and mood), Countries (world music), Coding (sequencing beats). *Custom hook:* parents and teachers record family or class songs; the child records their own singing (stored privately).

| Unit | Band | Content |
|---|---|---|
| Sounds around us | 🌱 | Loud, quiet, high, low sounds |
| Clap and stomp | 🌱 | Copy simple rhythms |
| Instrument sounds | 🌱 | Drum, guitar, piano, shaker, trumpet, flute |
| Songs and rhymes | 🌱 | Action songs (original, or public domain) |
| Fast and slow (tempo) | 🌿 | Music that walks, music that runs |
| Loud and quiet (dynamics) | 🌿 | Conductor game |
| Steady beat | 🌿 | Keep the beat with the buddy |
| Instrument families | 🌿 | Strings, wind, brass, percussion, keyboard |
| Rhythm patterns | 🌳 | Long and short sounds, repeating rhythm patterns |
| High and low notes (pitch) | 🌳 | Up and down melodies |
| Making music | 🌳 | Build a beat in a simple sequencer |
| Music and feelings | 🌳 | Happy, sad, exciting music |
| Reading music basics | 🚀 | Notes, rests, the staff, note values |
| Rhythm and time signatures | 🚀 | 4/4, 3/4; bars and beats |
| Scales and melody | 🚀 | Do-re-mi, major scale |
| Music around the world | 🚀 | Instruments and styles across cultures |
| Music theory | 🏔️ | Keys, chords, harmony, intervals |
| Music history | 🏔️ | Eras and genres from classical to modern |
| Composing | 🏔️ | Writing a melody, song structure (verse, chorus) |
| Sound science | 🏔️ | Vibrations, frequency, how instruments make sound |

### 7.20 Countries, flags and cultures
*Signature games:* Flag match, Spin the globe, Passport stamps (collect a stamp per country), Greetings around the world, Landmark puzzle. *Cross-links:* Directions (world map, compass), Time (time zones), Food, Music, Sports, Weather (climate zones), Animals (animals of each continent). *Custom hook:* families add their own heritage, languages and traditions; classes share "where our families come from".

| Unit | Band | Content |
|---|---|---|
| My country | 🌱 | My flag, my country's name, my home town |
| Hello around the world | 🌱 | Greetings in different languages (audio) |
| Land and water | 🌱 | Globe basics: land is green and brown, water is blue |
| Flags and colours | 🌿 | Recognising flags, flag colours and shapes |
| The continents | 🌿 | Seven continents, a song or rhyme |
| The oceans | 🌿 | Five oceans |
| Animals of each continent | 🌿 | Kangaroo, Australia; panda, Asia; lion, Africa |
| Children around the world | 🌳 | Homes, schools, games and food of children in different countries |
| Famous landmarks | 🌳 | Pyramids, Great Wall, Kilimanjaro, Eiffel Tower, Taj Mahal |
| Festivals and celebrations | 🌳 | Eid, Diwali, Christmas, Lunar New Year, Jamhuri Day and others (represented fairly) |
| Capital cities | 🌳 | Capitals of major and neighbouring countries |
| Countries in depth | 🚀 | Regions, physical features (rivers, mountains, deserts) |
| Languages of the world | 🚀 | Language families, words we borrow from other languages |
| Cultures and traditions | 🚀 | Clothing, art, stories, music, respectful curiosity |
| Population and cities | 🚀 | Biggest cities, why people live where they do |
| World history highlights | 🏔️ | Ancient civilisations, empires, independence movements |
| Global connections | 🏔️ | Trade, migration, international organisations |
| Geography in depth | 🏔️ | Plate tectonics, biomes, resources |
| Global citizenship | 🏔️ | Shared challenges, the UN Sustainable Development Goals |

### 7.21 Simple coding and logic
*Signature games:* Robot route (program the buddy's path), Bug hunt (fix the broken instructions), Loop dance, If-this-then-that sorter, Pattern machine. *Cross-links:* Directions and Positions (move, turn), Numbers (patterns, logic), Music (sequencing beats), Shapes (drawing with code). *Custom hook:* teachers build route puzzles on photos of the classroom floor; parents set "program the buddy to reach your bedroom" challenges.

| Unit | Band | Content |
|---|---|---|
| Patterns | 🌱 | Spot and continue colour and shape patterns |
| Step by step | 🌱 | Order the steps: getting dressed, brushing teeth |
| Move the buddy | 🌱 | Tap arrows to move the buddy one step at a time (no reading) |
| Sequences | 🌿 | Plan a whole route before pressing "Go" |
| Debugging | 🌿 | Find and fix the wrong step |
| Repeat (loops) | 🌿 | "Repeat 3 times" instead of three arrows |
| Sorting and rules | 🌿 | Sort by one rule, then two rules |
| Conditions (if/then) | 🌳 | "If the light is red, stop" |
| Events | 🌳 | "When I tap the cat, it meows" |
| Algorithms | 🌳 | Recipes and instructions as algorithms; efficient vs. long routes |
| Drawing with code | 🌳 | Program shapes (square = repeat 4: forward, turn right) |
| Block coding | 🚀 | Variables, loops, conditions in block code; making a mini-game |
| Logic puzzles | 🚀 | And/or/not, logic grids |
| How computers work | 🚀 | Input, process, output; inside a computer |
| The internet and staying safe | 🚀 | How the internet works, passwords, privacy, kindness online |
| Text-based coding intro | 🏔️ | First steps in Python or JavaScript, syntax, debugging |
| Data and algorithms | 🏔️ | Searching and sorting algorithms, data structures intro |
| How AI works (basics) | 🏔️ | Patterns, training data, bias, using AI responsibly |
| Building projects | 🏔️ | A small app, game or website project |

### 7.22 Kindness, manners and citizenship
*Signature games:* Kind or unkind?, Polite words match, What would you do? (scenarios), Fair share, Community helper quest. *Cross-links:* Feelings, Family and community, Countries (global citizenship), Sports (fair play). *Custom hook:* a custom badge for real-world kindness (§9.4 manual award: "Helped a classmate"); family rules chart with photos.

| Unit | Band | Content |
|---|---|---|
| Magic words | 🌱 | Please, thank you, sorry, excuse me |
| Sharing and taking turns | 🌱 | Sharing toys, waiting for your turn |
| Being gentle | 🌱 | Gentle hands, caring for pets and plants |
| Helping at home | 🌱 | Tidy up, set the table |
| Kind and unkind | 🌿 | Spot kind actions; how unkind words feel |
| Good manners | 🌿 | Table manners, greeting people, listening |
| Being a good friend | 🌿 | Including others, playing fair |
| Rules and why we have them | 🌿 | Home, school and road rules |
| Respecting differences | 🌳 | Everyone is different; disability, culture and family differences, positively framed |
| Standing up for others | 🌳 | What to do about bullying, telling a trusted adult |
| Honesty and responsibility | 🌳 | Telling the truth, owning mistakes, keeping promises |
| Caring for our world | 🌳 | Recycling, saving water, not littering |
| Rights and responsibilities | 🚀 | Children's rights (UN Convention), responsibilities that go with them |
| Digital citizenship | 🚀 | Kindness online, privacy, thinking before posting, screen balance |
| Fairness and justice | 🚀 | Fair vs. equal, solving disagreements |
| Making a difference | 🚀 | Small community projects, charity, volunteering |
| How society is organised | 🏔️ | Democracy, government, laws, voting (taught neutrally, no partisan content) |
| Ethics and dilemmas | 🏔️ | Thinking through right and wrong, considering several views |
| Media literacy | 🏔️ | News, advertising, misinformation, checking sources |
| Active citizenship | 🏔️ | Volunteering, civic participation, sustainability action |

### 7.23 Money and saving *(extends Numbers into financial literacy)*
*Signature games:* Market stall (buy and give change), Piggy bank goals, Needs vs. wants sorter, Budget planner, Lemonade-stand business. *Cross-links:* Numbers (counting, decimals, percentages), Food (shopping), Family and community (jobs), and the app's own **treasure economy** (§9), which is a safe, built-in way to practise saving toward a goal. *Custom hook:* parents set a real saving goal in the Wish list and the child tracks it; local currency photos.

| Unit | Band | Content |
|---|---|---|
| What is money? | 🌱 | Coins and notes, money buys things |
| Shopping play | 🌱 | Pretend shop: choose, pay, get the item |
| Saving in a piggy bank | 🌱 | Putting money away for later |
| Coin and note values | 🌿 | Recognising local currency, which is worth more |
| Needs and wants | 🌿 | Food and home vs. toys and treats |
| Paying and change | 🌿 | Simple amounts, getting change |
| Saving for a goal | 🌿 | How many days to save for a toy? (links to the treasure Wish list) |
| Earning money | 🌳 | Jobs and work, chores and pocket money |
| Making choices | 🌳 | You can't buy everything: choosing and trade-offs |
| Sharing and giving | 🌳 | Giving to others, charity |
| Where money is kept | 🌳 | Banks, mobile money (e.g. M-Pesa), keeping money safe |
| Budgeting | 🚀 | Income and spending, simple budgets |
| Prices, discounts and value | 🚀 | Comparing prices, best value, percentages off |
| Banks and interest | 🚀 | Saving accounts, simple interest |
| Being money-smart online | 🚀 | In-app purchases, scams, protecting PINs |
| Entrepreneurship | 🚀 | A small business plan: costs, prices, profit |
| Personal finance | 🏔️ | Payslips, tax basics, bills, credit and debt |
| Investing basics | 🏔️ | Risk and return, compound interest, long-term saving |
| Financial planning | 🏔️ | Emergency funds, goals, insurance basics |
| Economics basics | 🏔️ | Supply and demand, inflation, how economies work |

### 7.24 Grown-up content fills the long tail
No built-in catalogue can cover every age and interest. The Lesson Builder (§10), share codes and the flashcard-style "make your own trail" for teens and adults let families, teachers and older learners extend the app into any topic: a foreign language, exam revision, a local history unit, or a driving theory test.

### 7.25 Subject rollout
| Wave | Subjects |
|---|---|
| **MVP** (🌱–🌳 units) | Numbers, Language, Animals, Colours, Shapes |
| **Launch** (🌱–🌳 units) | + Time, Weather and seasons, Plants, Opposites, Planets, Transport, Sports, Body, **Positions**, **Directions and compass**, Feelings |
| **Post-launch wave 1** | + Food, Family and community, Kindness and citizenship, Money and saving, 🚀 Voyager units for core subjects |
| **Post-launch wave 2** | + Music, Countries and cultures, Coding and logic, 🏔️ Trailblazer units |

Positions and Directions are in the launch wave because they're foundational early-years skills, they need little new art (they reuse existing characters and scenes), and they feed Coding and Shapes later.

---

## 8. Exercises and games

### 8.1 Exercise types (inside lessons)

The **lesson generator** builds each lesson from a unit's item pool plus the band's settings. It mixes 3–5 exercise types so no lesson feels repetitive.

| Type | How it works | Origin |
|---|---|---|
| Listen & tap | Hear a word, tap the matching picture | Chipuka / Martha |
| Pop / feed | Tap the right bubbles; drag food to the right animal | Chipuka |
| Match pairs | Draw a line or drag picture ↔ word, sound ↔ picture | Chipuka |
| Name it | Picture shown; choose the right word (readers) or spoken option | Chipuka |
| Count | Count objects, tap the number | Chipuka / Martha |
| Compare | More/less, bigger/smaller | Chipuka |
| Solve | Picture sums | Chipuka |
| Sequence | Put 3–5 cards in order (life cycle, days, routine) | Chipuka |
| Case-match | Upper ↔ lowercase | Chipuka |
| **Sort into bins** | Drag items into 2–4 groups (land/water/air) | New |
| **Odd one out** | Which doesn't belong? | New |
| **Trace** | Finger-trace letters, numbers and shapes | New |
| **Clock setter** | Drag the hands to show a time | New |
| **Build a word** | Drag letter tiles to spell | Martha |
| **Blend** | Tap sounds in order to hear the word | Martha |
| **True or false** | Buddy makes a claim: thumbs up or down | New |
| **Say it** *(AI phase)* | Child speaks the answer; speech recognition checks it | Future |
| **Type the answer** *(Voyager+)* | Typed numbers, words and short answers with forgiving matching | New |
| **Label the diagram** *(Voyager+)* | Drag labels onto a picture (parts of a plant, solar system, body organs) | New |
| **Read and answer** *(Voyager+)* | Short passage, then 2–4 questions | New |
| **Multi-step problem** *(Voyager+)* | A worked problem in stages, with a hint per stage | New |
| **Flashcards with self-rating** *(Trailblazer)* | Spaced-repetition cards for self-made trails ("I knew it / almost / not yet") | New |

### 8.2 Games (rewards, checkpoints and free play)

Games appear as **unit checkpoints** on the trail and in a **Games Corner** the child can open. Every game is **content-agnostic**: it takes any item set (built-in or custom) and plays.

| Game | Description | Works with custom content? |
|---|---|---|
| **Jigsaw puzzle** | 4 / 9 / 16 pieces from any picture, including **a photo a parent uploads** | ✅ |
| **Memory flip** | Find matching pairs (picture-picture, picture-word, sound-picture) | ✅ |
| **Sorting race** | Items fall; drag them into the right basket | ✅ |
| **Spot the difference** | Two scenes, find 3–5 changes | Built-in scenes |
| **Maze** | Guide the buddy to the answer (e.g. the number 7) | ✅ |
| **What to wear** | Dress the buddy for the weather | Built-in |
| **Planet line-up** | Order the planets at true scale | Built-in |
| **Shape builder / tangram** | Make pictures from shapes | Built-in |
| **Colour mixer** | Mix paint pots to hit a target colour | Built-in |
| **Timeline ladder** | Place events on a day/year/century line | Built-in + custom events |
| **Feed the animal** | Drag the right food to herbivores/carnivores | Built-in |
| **Quiz show** | Buddy hosts a 10-question mixed round across completed units | ✅ |

---

## 9. Rewards: stars, treasures and badges

Rewards are **earned, collectable and spendable**. They exist to celebrate effort and give children meaningful choices, never to manipulate. No real money ever buys rewards, and there are no random chests.

### 9.1 The reward economy

| Reward | How it's earned | What it's for |
|---|---|---|
| ⭐ **Stars** | 1–3 per lesson, bonus stars for checkpoints and review lessons | **Progress:** they unlock trail stages and fill the subject progress bar. Stars are a measure of learning, so they are **never spent**. |
| 💎 **Treasures** (gems/coins) | Completing lessons, daily goals, perfect lessons, badges, game high scores, grown-up gifts | **Currency:** spent in the **Buddy Shop** and **Treasure Room** |
| 🏅 **Badges** | Achievements (built-in and custom) | **Collection:** shown in the Badge Book; many also pay out treasures |
| 🎁 **Real-world rewards** | Custom achievements set by a grown-up | A grown-up delivers them offline (e.g. "Ice cream on Saturday") |

**Why stars and treasures are separate:** if a child spends their stars, their progress appears to go backwards, which is confusing and discouraging. Stars only ever go up; treasures go in and out.

### 9.2 Spending treasures ("utilising" rewards)

| Shop / feature | What treasures buy |
|---|---|
| **Buddy Shop** | Outfits, hats, glasses and accessories for the buddy |
| **Treasure Room** | Furniture, wallpaper, plants and pets to decorate the buddy's home (a cosy, ownable space) |
| **Sticker Album** | Sticker packs to complete themed albums (ocean, space, safari). Packs show exactly which stickers are inside: **no randomness, no loot boxes** |
| **Game unlocks** | Extra game themes and harder game modes in Games Corner |
| **Trail decorations** | Flags, lanterns and paint colours for the child's trail |
| **Wish list** *(grown-up controlled)* | The child "saves up" treasures toward a grown-up-created real reward ("50 💎 = a story at bedtime of your choice"). The grown-up approves the redemption |

Prices are tuned so a child doing their daily goal can buy something small every 2–3 days and something big every 2–3 weeks. Earning curves are a tunable config, not hard-coded.

### 9.3 Built-in badges and achievements

Badges have **tiers** (bronze → silver → gold) and **categories**.

| Category | Examples |
|---|---|
| **Learning milestones** | "Counting Champ" (finish Counting 1–10), "Animal Expert" (all Animals units), "Time Keeper" (read o'clock and half past) |
| **Mastery** | "Perfect Ten" (10 three-star lessons), "No Hints Needed" |
| **Effort and persistence** | "Never Give Up" (finish a lesson after 3+ hints), "Comeback Kid" (master an item once marked weak) |
| **Consistency** | "Week Warrior" (daily goal 5 days in a week), "30-Day Explorer" |
| **Exploration** | "World Traveller" (try every subject), "Game Master" (play every game) |
| **Creator-linked** | "Family Star" (finish a lesson a parent made), "Class Hero" (finish all assigned class work this week) |
| **Hidden / surprise** | "Night Owl" (learn about the Moon at bedtime), unlocked with a special buddy dance |

### 9.4 Custom badges and achievements (parents and teachers)

Grown-ups can create their own badges and achievements in the **Badge Studio** in the grown-up zone.

**1. Design the badge**
- Choose a badge shape, colour and icon from the library, **or upload an image** (e.g. a photo of the family dog, a school logo).
- Give it a name and an optional message the buddy reads aloud when it's earned. The grown-up can record the message in their own voice.

**2. Set how it's earned (achievement rule)**

| Rule type | Example |
|---|---|
| **Complete content** | Finish the custom trail "Our Farm"; finish Animals → Wild animals |
| **Reach a count** | Earn 100 stars; complete 20 lessons; 10 perfect lessons in Numbers |
| **Streak / consistency** | Meet the daily goal 5 days this week |
| **Mastery** | Master all items in "My Spelling Words, Week 3" |
| **Assignment** *(teacher)* | Complete everything assigned this week |
| **Manual award** | A grown-up taps "Award" (for real-world things: tidied room, read a book with Mum, helped a classmate) |
| **Combination** | Any 2 of the above (AND/OR, kept simple: max 3 conditions) |

**3. Attach a reward**
- A treasure amount (within a cap so teachers can't inflate the class economy), **and/or**
- A **real-world reward** text ("Pick Friday's movie") that appears in the child's Wish list and on the grown-up's "to deliver" list.

**4. Choose who can earn it**
One child, several children, a whole class, or "any child who plays this shared lesson pack". Badges travel with **share codes** (§10.5): a teacher can share a "Spelling Bee" badge set with other teachers.

**Guard rails:**
- Custom badge images go through the same safety checks as lesson uploads (§12).
- Teacher-created badges are visible to linked parents.
- Badges cannot be taken away once earned; a grown-up can only hide them.

### 9.5 Rewards for older learners
The economy stays the same at every age, but what's in the shop grows up: room themes, avatar styles, game modes and profile frames instead of toddler stickers. Teens and adults can turn off celebrations and buddy chatter, and they get **personal records** (best streak, fastest mastery) instead of more confetti. **Family challenges** are optional, cooperative goals ("the whole family completes 30 lessons this week"), so a parent learning alongside their children can share a reward. They are never competitive leaderboards between children.

### 9.6 Celebration moments

New badge → the buddy celebrates (full-screen animation, confetti, buddy voice line) → the badge flies into the Badge Book → a treasure count-up. Grown-ups get a **weekly digest** of badges earned. Teachers see a class "badge wall" they can project.

---

## 10. Custom lesson creation (parents and teachers)

### 10.1 The Lesson Builder

The core idea: **built-in and custom content use the same lesson format.** A custom lesson is simply items (cards) plus a choice of exercise types. The same lesson generator and games then run it, so everything the app does with built-in content also works with custom content.

**Step 1: Make cards.** Each card has:
- **Picture:** take a photo, upload an image, or pick from the built-in illustration library
- **Word / label:** e.g. "Grandma's cow, Daisy"
- **Voice:** record it, upload an audio file, or let TTS say it
- Optional: a **fun fact** the buddy says, a **category tag** (for sort games), a **number** (for counting games)

**Step 2: Choose a template.**

| Template | Generates |
|---|---|
| **Learn the names** | Explore → listen & tap → match → name it |
| **Sort them** | Sort into bins by the category tags |
| **Put in order** | Sequence (morning routine, life cycle, story) |
| **Count** | Counting exercises using the card's picture |
| **Spelling list** | Build-a-word + blend, from typed words (teacher favourite) |
| **Quiz** | Grown-up writes questions with 2–4 picture or audio answers |
| **Picture puzzle** | Jigsaw from one uploaded photo, with a "who/what is this?" question after |

**Step 3: Settings.** Age band, number of exercises, buddy hint level, which games unlock at the end.

**Step 4: Preview as child**, then **save, assign and share**.

### 10.2 Custom trails (mini-journeys)
Grown-ups chain custom lessons into a **custom trail** with units and a checkpoint, e.g. "Our Trip to the Coast": Day 1 (beach animals) → Day 2 (boats) → checkpoint jigsaw of the family photo. Custom trails appear as their own place on the child's world map (e.g. a "Family Island" or "Class Island").

### 10.3 Organising content
Chipuka's **Organize** feature carries over: categories, drag-to-reorder subjects and trails, and a "move to…" picker. A teacher can also **remix** a built-in unit: copy it, then add or remove items. Example: add local animals to Farm Animals.

### 10.4 Assigning
- **Parents** assign to one or more of their children.
- **Teachers** assign to a class, a group within a class, or individuals, with an optional due date. Assigned work shows on the child's trail as a glowing "From your teacher" signpost.

### 10.5 Sharing by code
- Content is **private by default** (family or class only).
- Any lesson, trail or badge set can be shared via a **6-character code or QR**. The recipient gets **their own copy**, so the creator's later edits don't change it unless they re-import.
- **What travels:** cards, images, audio, template settings and badges. **What doesn't:** any child data.
- **Before a code is created**, the creator confirms a checklist: "No photos of children's faces, no names or addresses". Faces in shared images are flagged automatically for confirmation (§12).
- No public marketplace in v1. A moderated public library is a possible later phase.

### 10.6 Media handling
- Photos are downscaled and centre-cropped, with **EXIF/GPS metadata removed on the device** before upload.
- Audio is trimmed for silence, loudness-normalised, and capped at 10 seconds per card.
- Storage limits: Free 50 cards · Family 2,000 cards · Classroom 5,000 cards per teacher.
- Media works offline from local storage immediately and uploads in the background with a retry queue (Chipuka's pipeline).

---

## 11. Platform and technical architecture

### 11.1 Platform decision: Next.js web/PWA + React Native CLI app *(decided)*

**Decision (21 Oct 2026):** a **Next.js + MUI web app that installs as a PWA**, plus a **React Native CLI (bare, not Expo) app** for Android first and iOS later. Both live in one monorepo and share all non-UI logic (lesson generation, difficulty, rewards, badge rules, sync, content and i18n) through packages. The web/PWA ships first (MVP); the React Native app follows once the web experience has settled. See `Trailbuddies-development-plan.md` for the full build plan.

| Option considered | Why it was or wasn't chosen |
|---|---|
| **Next.js web/PWA + React Native CLI (chosen)** | Best native feel on phones, full control of the native project (as in Chipuka's plan), and a strong web/PWA for classrooms and laptops. The cost is two UI layers, kept thin by sharing all logic. |
| One Next.js PWA wrapped with Capacitor/TWA | One UI codebase, but a less native feel and dependent on the wrapper |
| React Native + React Native Web | One codebase, but a weaker web/PWA story and no MUI |

### 11.2 Stack (per your defaults)

| Layer | Choice |
|---|---|
| Front end | **Next.js (App Router), JavaScript, MUI**; Baloo 2 + Nunito fonts bundled; SVG + CSS/Lottie animations for buddies and celebrations |
| Offline | Service worker precaching the app shell; **content packs** (per subject) downloaded for offline use; **IndexedDB** (via Dexie) as the on-device database |
| Mobile app | React Native CLI (bare), React Navigation, Zustand, op-sqlite, react-native-svg, React Native Paper themed from shared tokens; Android first, iOS later |
| Back end | **Python FastAPI** (REST + auth, sync, content, sharing, media signing) |
| Database | **PostgreSQL** |
| Media storage | S3-compatible object storage (e.g. Cloudflare R2) with presigned uploads + CDN |
| Auth | Grown-ups only: email magic link + Google/Apple sign-in; children are profiles |
| Payments | App Store / Play Billing in the store apps; Stripe for web and school invoicing |
| Monitoring | Sentry (child data scrubbed); **first-party, aggregated** product analytics only, with **no third-party ad/analytics SDKs** |
| Testing | Jest (domain), React Testing Library (components), Playwright (E2E on web + mobile viewports) |

### 11.3 Monorepo layout (proposed)

```
trailbuddies/
  apps/
    web/                 Next.js PWA (child app + grown-up zone + teacher dashboard)
    mobile/              React Native CLI (bare) app: Android first, iOS later
  packages/
    domain/              lesson generator, difficulty, mastery/spaced review, path layout,
                         reward economy + achievement rule engine  (pure JS, unit-tested)
    content-schema/      JSON schema for items, lessons, units, trails, badges
    content/             built-in content packs (per subject, per language)
    i18n/                UI strings + buddy script tables
    ui/                  MUI theme, tokens, shared components
  services/
    api/                 FastAPI app
    workers/             media processing, weekly digests
  docs/
```

### 11.4 Core data model (simplified)

- **Accounts:** `users` (grown-ups, role: parent/teacher/admin) · `families` · `schools` · `classes` · `class_teachers`
- **Children:** `learners` (profile, birth month/year, age stage, buddy, avatar, is_adult, optional linked login) · `learner_subject_band` (band per subject) · `child_guardians` (child ↔ user, scope) · `class_enrolments`
- **Content (shared schema for built-in and custom):** `items` (cards) · `media_assets` · `lessons` (stable IDs) · `units` · `trails` · `subjects` · `share_codes` · `content_owners`
- **Learning:** `progress` (child, lesson, stars, best) · `item_mastery` (child, item, seen, correct, next_review_at) · `activity` (child, date, minutes, lessons) · `assignments` · `assignment_status`
- **Rewards:** `wallets` (child, treasures) · `transactions` (append-only: earn/spend, source) · `shop_items` · `inventory` · `badges` (built-in + custom, owner, image, rule JSON, reward) · `badge_awards` (child, badge, earned_at, awarded_by) · `wishes` (real-world rewards: status requested/approved/delivered)

The **achievement rule engine** runs in the shared `domain` package. It evaluates badge rules on-device after every lesson, so badges pop even offline. The server re-validates on sync.

### 11.5 Offline and sync

- The child app works **fully offline** once content packs are downloaded.
- **Event-sourced progress.** Lessons completed, items answered, treasures earned or spent and badges awarded are stored as **append-only events** in an on-device outbox and synced when online. Events merge cleanly across devices: a child playing on a tablet at school and a phone at home gets the sum of both, with no overwrite conflicts.
- Content and settings (custom lessons, badges) use **last-write-wins with server timestamps**. Edits are rare and made only by grown-ups.
- Wallet balance = sum of transactions, so it can never desync or go negative after a merge. Spends are checked against the server balance and rolled back with a friendly message in the rare conflict.

### 11.6 Future AI layer (phase 4+)
Optional, behind a grown-up toggle, reached through the same buddy event hooks:
- **Speech recognition** for "say it" exercises and reading aloud (on-device where possible)
- **Conversational hints** generated within strict guard rails (no free chat; the buddy only answers inside the current exercise)
- **AI-assisted lesson builder:** "Make a 5-card lesson about African birds", with images from the licensed library, reviewed by the grown-up before use
- **Auto-tagging** of uploaded photos for sort games

---

## 12. Safety, privacy and accessibility

### 12.1 Legal and policy frameworks (global launch)

| Framework | What it means for Trailbuddies |
|---|---|
| **US COPPA** (amended rule; compliance required from **22 April 2026**) | Verifiable parental consent before collecting a child's personal information (photos and voice recordings of children count); written **data-retention policy with defined periods**; new parental consent for material changes to privacy practices |
| **EU/UK GDPR + UK Age Appropriate Design Code** | Privacy by default, data minimisation, no profiling or nudge techniques for children, DPIA required |
| **Google Play Families policy / Apple Kids category** | No ads or third-party analytics in child surfaces, parent gate before links/purchases, privacy policy, age-appropriate content |
| **Schools (e.g. FERPA in the US; school-as-consent-agent models)** | Data processing agreement for schools; teacher accounts act under school authority |
| **Other markets** (e.g. Kenya Data Protection Act 2019, India DPDP Act) | Region-aware consent and data residency reviewed per market expansion |

**Because there is no upper age limit**, the rules differ by learner age, and the app applies them per profile using the birth month and year:
- **Under 13:** full COPPA treatment as above; parent-owned profile; no free text, no own login.
- **13–17:** still parent-linked. GDPR's "digital age of consent" is between 13 and 16 depending on the EU country, so the country set at sign-up decides when a teen can manage some settings themselves. The UK Age Appropriate Design Code applies to all under-18s.
- **18+:** ordinary adult privacy terms. An adult learner profile on a family account is still kept separate from the children's data.
- Store listings: the app is listed as a **family/education app**, not exclusively in Apple's Kids category, which restricts some features for older users. Child-facing surfaces still meet the Kids/Families rules (to be confirmed with each store's current policy).

*This is a product-planning summary, not legal advice. Get a privacy lawyer review before launch.*

### 12.2 Design choices that follow
- **Collect almost nothing about children:** first name or nickname, age band, avatar. No child email, no location, no free text, no chat, no social features.
- **Grown-up uploads are the main risk.** Uploads default to private; EXIF is removed; **face detection** on images being shared by code prompts the creator to confirm there are no children's faces; uploads are automatically scanned for inappropriate content; a report button sits on any shared content.
- **Retention:** voice recordings and photos are deleted 30 days after their lesson is deleted; inactive accounts are deleted after a set period with warning emails; a one-tap **"export and delete my family's data"**.
- **No dark patterns:** no countdowns, no "buddy is sad" guilt, no random rewards, no purchases from the child side. All purchases sit behind the parent gate and store billing.
- **Screen-time controls:** daily limit, bedtime lock, break reminders.

### 12.3 Accessibility
Large touch targets (≥48 dp), everything spoken aloud, captions for buddy lines, high-contrast mode, reduced-motion mode (calm celebrations), left-handed layouts for drag games, dyslexia-friendly font option for reading units, and screen-reader labels throughout the grown-up zone.

---

## 13. Business model and go-to-market

### 13.1 Tiers *(prices are indicative and need validation)*

| | **Free** | **Family** | **Classroom** | **School** |
|---|---|---|---|---|
| Price (indicative) | $0, 1 learner profile | ~$5.99/mo or ~$49.99/yr, up to 6 learner profiles (children + adults) | ~$60–90 per teacher/yr, up to 35 students | Volume licence, quoted |
| Built-in content | First 2 units of every subject + all of 2 subjects | Everything | Everything | Everything |
| Buddies | 1 | All 4 + new releases | All | All |
| Custom lessons | 3 lessons, 50 cards | Unlimited lessons, 2,000 cards | Unlimited, 5,000 cards | Shared school library |
| Custom badges | 2 | Unlimited | Unlimited | Unlimited + school badge sets |
| Games Corner | 3 games | All | All | All |
| Dashboards | Basic weekly summary | Full progress + weekly digest | Class dashboard, assignments, badge wall | Admin + multi-class reports |
| Share codes | Import only | Import + create | Import + create | Import + create |

**Teacher-to-home flywheel:** a child in a Classroom-licensed class gets **full access at home** while enrolled. Parents experience the full product, and some convert to a Family plan for siblings or summer holidays.

### 13.2 Competitive landscape

| App | Model | Strengths | Gap Trailbuddies fills |
|---|---|---|---|
| **Khan Academy Kids** | Free (non-profit) | Broad, high-quality content, free | Limited parent/teacher authoring of custom content; no custom badges |
| **Duolingo ABC** | Free, no ads | Excellent journey/streak UX; 700+ literacy lessons for ages 3–8 | Literacy only; no custom content; no classroom roster |
| **Lingokids** | Freemium | Many topics, playful | Subscription-heavy; little grown-up creation |
| **ABCmouse** | Paid (~$13.99/mo) | Huge curriculum, rewards room | Expensive; no custom content from parents |
| **Homer** | Freemium | Personalised reading path | Narrower subject range |

For older bands the field widens to apps such as Khan Academy, Prodigy (maths, ages ~6–14) and Duolingo (languages). Most competitors cover a narrow age range, so a child has to switch apps as they grow. **One trail and one buddy from age 3 upwards, with the child's history and badges kept**, is a retention advantage no competitor in the table offers.

**Positioning:** *"The learning trail your family can make their own, from first words onwards."* Breadth of subjects, journey UX, custom content and custom rewards, at a price below ABCmouse.

Khan Academy Kids and Duolingo ABC are both free and good, so the paid value has to come from **creation tools, classroom features and rewards personalisation**, not from content alone.

### 13.3 Go-to-market
0. **Direct-to-parent first.** Because parents can onboard with no school, the primary launch channel is parents: app stores, parenting communities, homeschool groups and word of mouth from shared lesson packs. Schools are a second, reinforcing channel.
1. **Teacher-led pilots** (5–10 early-years classrooms): free Classroom licences for one term in exchange for feedback and testimonials. Teachers drive parents to the app.
2. **Content-creator loop:** teachers share lesson packs by code in teacher communities (Facebook groups, WhatsApp, TES-style sites), and every pack import is an acquisition channel.
3. **App store optimisation** for "learning games for kids", "preschool learning app", "family learning app"; apply for the Apple Kids category and Google Play "Teacher Approved".
4. **Seasonal content drops** (back to school, holidays, space week) with matching badge sets.
5. **Partnerships** with nurseries, homeschool networks and early-years NGOs. A grant-funded free tier for low-income schools strengthens impact positioning.

### 13.4 Key metrics
Activation (child completes 3 lessons in week 1) · weekly active children · lessons per child per week · day-7/day-30 retention · custom lessons created per grown-up · share-code imports · free → Family conversion · Classroom → Family conversion · teacher retention per term.

---

## 14. Roadmap and MVP

*This is the high-level concept roadmap. The detailed, dated plan (solo developer + Claude, web/PWA MVP by ~March 2027, a React Native Android app in mid-2027, public launch ~November 2027) is in `Trailbuddies-development-plan.md`.*

| Phase | Duration (est.) | Delivers |
|---|---|---|
| **0: Foundations** | 3–4 weeks | Monorepo; shared `domain` package (port Chipuka's difficulty/path/organize logic + Martha's lesson schema); content schema; FastAPI + Postgres skeleton; grown-up auth; PWA shell + offline |
| **1: MVP (closed beta)** | 8–10 weeks | 1 buddy (others as art drops); **5 subjects**: Numbers, Alphabet/Phonics, Animals (first 4 units), Colours, Shapes; 10 exercise types; trail + world map; stars, treasures, Buddy Shop, 15 built-in badges; **Lesson Builder** (cards + 3 templates: Learn names, Sort, Picture puzzle); parent dashboard; jigsaw + memory games; offline sync |
| **2: Classroom beta** | 6–8 weeks | Teacher accounts, classes, join codes, assignments, class dashboard, classroom mode with picture passwords; **Badge Studio** (custom badges/achievements + Wish list); share codes; pilots in 5–10 classrooms |
| **3: Breadth and launch** | 10–12 weeks | All 4 buddies; remaining launch subjects (Time, Weather & seasons, Plants, Opposites, Planets, Transport, Sports, Body, Positions, Directions & compass, Feelings; see §7.25); all games; Treasure Room + sticker albums; custom trails; payments; accessibility pass; store submissions; **public launch** |
| **4: Older bands** | Rolling, 1–2 subjects per quarter | 🚀 Voyager (9–12) units subject by subject, starting with Maths, Reading and Space; band-aware look and buddy stages; typed/diagram/reading exercise types; teen sign-in; self-made flashcard trails for teens and adults |
| **5: Schools and AI** | Ongoing | 🏔️ Trailblazer (13+) content; school admin + licences; AI layer (speech, hints, AI-assisted builder); more languages (Kiswahili, French, Spanish); moderated public lesson library |

**Content production runs in parallel from Phase 0:** illustration library (~2,500 items for the 3–8 launch catalogue), buddy art and animation, buddy voice lines (~400 per buddy) and a content voice pack. This is the longest-lead item and the biggest cost after engineering.

### MVP definition of done
A parent can install the app (web, Android, or iOS) and create a profile for their 4-year-old. The child can pick a buddy and complete the first Numbers and Animals units offline, earning stars, treasures and a badge, and can spend treasures on a buddy hat. The parent can photograph the family pets, build a "Our Pets" lesson with their own voice, turn one photo into a jigsaw, and see that the child played it.

---

## 15. Risks and open questions

| Risk / question | Mitigation / decision needed |
|---|---|
| **"No upper limit" dilutes focus**: trying to serve a 3-year-old and an adult equally at launch could make the app mediocre for both | Launch deep at ages 3–8; open the higher bands subject by subject; let grown-up-made content and self-made trails cover the long tail; band-aware look and buddy stages so older learners don't feel talked down to |
| **Content volume** (~2,900 lessons across 23 subjects, ~1,750 for ages 3–8, plus art and audio) is the biggest cost | Lean MVP (5 subjects, 🌱–🌳 units only); one data-driven lesson generator; reuse items across subjects (a "cow" card serves Animals, Sounds, Counting) |
| **iOS PWA limitations** (storage eviction, audio autoplay) | iPhone users use the web app during beta; the React Native iOS build follows launch |
| **Unsafe uploads in shared content** | Private by default, face prompt, automated scanning, report button, share-code revocation |
| **Reward economy inflation** (teachers over-awarding treasures) | Per-badge treasure caps, daily earning caps, economy config tunable server-side |
| **Free competitors** (Khan Kids, Duolingo ABC) | Differentiate on creation, classroom and personalisation, not content volume |
| **Open:** final product name and buddy designs | Naming + trademark search; child playtests of buddy concepts |
| **Open:** illustration source | Commissioned vs. licensed library vs. AI-assisted with human artist finishing |
| **Open:** which second language first | Decide from pilot geography; architecture already supports it |
| **Open:** keep Chipuka as a separate product or fold it in? | Recommendation: fold its logic into the shared `domain` package and retire the separate React Native build |

---

## 16. Recommended next steps
1. ~~Confirm the platform decision~~ (decided: Next.js PWA + React Native CLI, §11.1). Confirm the working name.
2. **Write the content schema** (items, lessons, units, trails, badges, achievement rules) as the first technical artefact. Built-in content, the Lesson Builder and the Badge Studio all depend on it.
3. **Commission buddy concept art** (4 candidates) and run a quick preference test with 10–15 children.
4. **Build a clickable prototype** of the core loop: world map → trail → lesson → reward → shop, plus the Lesson Builder and Badge Studio flows.
5. **Line up 3–5 pilot teachers** for Phase 2.

---

### Sources
- [Federal Register: Children's Online Privacy Protection Rule (April 2025)](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)
- [The Toy Association: Updated COPPA rule requirements take effect April 22](https://www.toyassociation.org/ta/PressRoom2/News/2026-News/updated-coppa-rule-requirements-take-effect-april-22.aspx)
- [White & Case: Unpacking the FTC's COPPA amendments](https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know)
- [Subger: Compare kids & family services (pricing, Oct 2026)](https://subger.com/en/compare/kids-family)
- [Good e-Reader: Duolingo ABC overview](https://goodereader.com/blog/?p=351856)
- Internal: `chipuka-app/PLAN.md`, `martha-learning/README.md`, `martha-learning/lib/lessons.js`
