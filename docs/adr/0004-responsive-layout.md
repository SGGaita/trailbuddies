# ADR 0004: One responsive web app with CSS breakpoints, not separate device apps

**Status:** accepted · 22 Oct 2026

## Context
The learner app runs on tablet, phone and web; the parent app on phone, tablet and web; teachers on web and tablet (development plan §3.4). Server-rendered pages can't know the screen size, so JS-based device detection flickers on first paint.

## Decision
- Breakpoints live in `packages/tokens`: phone below 600 px, tablet 600–1199 px, desktop 1200 px and up (MUI `xs`/`sm`/`lg`).
- Each area has one shell (`LearnerShell`, `FamilyShell`, `TeachShell`) that switches layout with **CSS only** (`sx` breakpoints): bottom tabs on phones, an icon rail on tablets, a sidebar on desktops.
- Where a screen needs a different structure (the world map becomes a list on phones), both variants render and CSS shows one. Logic stays in `packages/domain`, so both variants read the same data.
- Playwright runs every screen at 390×844, 1180×820 and 1440×900, fails on sideways scrolling or console errors, and saves screenshots for review.

## Consequences
- No hydration flicker; works the same in the PWA and later in a WebView.
- Some markup renders twice on structural switches; acceptable for the screen sizes involved.
