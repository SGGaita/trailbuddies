# Trailbuddies interactive prototype

One self-contained HTML page showing four connected apps with shared, saved state:

| App | Devices | Screens |
|---|---|---|
| Learner (children, teens, adults) | Tablet, phone, web | 32 flow steps: map, trail, playable lessons (10 exercise types), rewards, shop, room, badges, wishes, games, islands, gate, break, older learners |
| Parent | Phone, tablet, web | 30 screens: onboarding, home, progress, Lesson Builder (real photo upload), trails, remix, import/share codes, Badge Studio, wishes and awards, settings, family, join a class, plans and M-Pesa checkout, letter sounds, languages, help |
| Teacher | Web, tablet | Sign-up, home, roster and class code, assign work, progress heatmap, class badges, classroom mode |
| School & safety | Web | Licence and teachers, reports and library, moderation queue |

Screen IDs and story references match `docs/Trailbuddies-user-stories.md` and the wireframes.

## Files
- `head.html`: title, fonts, all CSS (page chrome, device frames, app styles, phone/tablet/web layers)
- `body.html`: guide panel and device stage
- `screens_meta.json`: screen titles, devices and story IDs shown in the guide
- `js/core.js`: state, router, actions, devices, guide; `art.js`: buddies, outfits, islands; `content.js`: subjects, lesson generators, badges, demo data; `child1.js` / `child2.js`: learner app; `parent.js`; `teacher.js`; `flows.js`: guided flows and boot
- `build.py`: concatenates everything into `trailbuddies-prototype.html`
- `tests/`: Playwright smoke test, device screenshot sweep, keyboard/phone lesson test

## Rules
No `alert`/`confirm`, no file downloads, no layout based on window height, storage wrapped in try/catch. Run all three tests before publishing.
