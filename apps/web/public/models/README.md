# On-device image check models (SAF-08, SHR-03)

Served from our own site, so a grown-up's photo is checked in their browser and never sent
to a third party. Loaded only in grown-up screens, when a photo is added or a share is made.

| Folder | Model | Source | Licence |
|---|---|---|---|
| `nsfw/` | NSFWJS MobileNetV2 (224 px), Keras layers model | `nsfwjs@4.4.0` (`dist/models/mobilenet_v2`, unpacked from its JS bundle to `model.json` + `.bin`) | MIT, © 2019 Infinite Red, Inc. |
| `face/` | Tiny Face Detector | `@vladmandic/face-api@1.7.15` (`model/tiny_face_detector_model*`) | MIT, © Vladimir Mandic (after face-api.js by Vincent Mühler) |

To update: unpack the new npm versions and copy the same files here (see `lib/imageCheck.js`).
