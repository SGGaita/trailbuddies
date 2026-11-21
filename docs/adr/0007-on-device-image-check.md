# ADR 0007: The image check runs on the grown-up's device, with a person reviewing shares

**Status:** accepted · 21 Nov 2026 (Sprint 11, SAF-08, BST-08, SHR-03, MOD-01)

## Context
Grown-ups add their own photos to lessons and badges, and from Sprint 11 they can share them
with other families by code. Stories SAF-08 and BST-08 ask for an automated check for
inappropriate images; SHR-03 asks for face detection before a share is made. Cloud vision APIs
(Google, AWS, Azure) would mean sending families' photos to a third party, which goes against
our child-safety rules. A server-side model would be too heavy for Vercel functions.

## Decision
- **Open-source models in the browser**: NSFWJS (MobileNetV2, MIT) for nudity and the Tiny
  Face Detector from `@vladmandic/face-api` (MIT) for faces, on TensorFlow.js. The model files
  are **served from our own site** (`apps/web/public/models`, see its README); nothing is
  fetched from a CDN, and no photo leaves Trailbuddies to be checked. They load only in grown-up
  screens, the first time a photo is added or a share is made (`apps/web/lib/imageCheck.js`).
- **Lesson photos**: a flagged photo is kept but hidden (a placeholder for everyone), uploaded
  with the check's scores, and queued for the safety team, who restore or hide it (SAF-08).
  **Badge photos**: a flagged photo is refused with the reason (BST-08).
- **Shares**: every photo is checked for faces; each face must be confirmed as not a child or
  left out (SHR-03). A share with photos or voice clips **waits for a person** on the safety
  team before its code works ("open models + your review"), so a check that a modified client
  skips still can't publish an image. Shares without media work at once.
- The server never trusts the device for what a share contains: it builds the package from its
  own rows (`app/shares.py`, SHR-04).
- If the models can't load (offline), the photo is checked again before it uploads.

## Consequences
- About 1.1 MB of JavaScript (TensorFlow.js) and 2.8 MB of model files are downloaded once by a
  grown-up who adds photos; children's screens never load them.
- Small models make mistakes. Thresholds err towards flagging (`SCAN_LIMITS` in
  `packages/domain/src/shares.js`); a wrong flag costs a short wait for review.
- Photos that stay inside one family rely on the device's check (they are only seen by that
  family). Anything that leaves the family is reviewed by a person first.
- The safety team is whoever is in `TB_ADMIN_EMAILS`; the queue sends a daily reminder when
  anything has waited over 24 hours.
