"use client";
import { facesWorthAsking, scanVerdict } from "@trailbuddies/domain";

/**
 * The image check (SAF-08, BST-08, SHR-03), run in the grown-up's browser with open-source
 * models served from our own site (public/models, MIT licence): NSFWJS for nudity and the Tiny
 * Face Detector for faces. No photo is sent to anyone for checking. TensorFlow.js and the
 * models load only the first time a grown-up adds a photo or makes a share code, never in the
 * children's screens.
 *
 * e2e tests can set `globalThis.__tbImageCheck` to answer instead of the models.
 */

export const MODEL = "nsfwjs-mobilenet-v2+tiny-face";

let loading = null;

async function models() {
  loading ??= (async () => {
    const tf = await import("@tensorflow/tfjs");
    try {
      await tf.setBackend("webgl");
    } catch {
      await tf.setBackend("cpu");
    }
    await tf.ready();
    const { load } = await import("nsfwjs/core");
    const faceapi = await import("@vladmandic/face-api/dist/face-api.esm-nobundle.js");
    const [nsfw] = await Promise.all([
      load("/models/nsfw/", { size: 224 }),
      faceapi.nets.tinyFaceDetector.loadFromUri("/models/face"),
    ]);
    return { nsfw, faceapi };
  })();
  try {
    return await loading;
  } catch (e) {
    loading = null; // try again next time (e.g. it was offline)
    throw e;
  }
}

/** Start loading the models early (e.g. when the share dialog opens). */
export const warmUp = () => models().catch(() => {});

async function canvasFor(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d").drawImage(bmp, 0, 0);
  bmp.close?.();
  return c;
}

/**
 * Check one photo.
 * @param {Blob} blob
 * @param {{ faces?: boolean }} [opts] look for faces too (sharing)
 * @returns {Promise<{ ok: boolean, flagged: boolean, reason: string | null, scores: Record<string, number>,
 *   faces: number, model: string }>} ok false when the check couldn't run (it is retried at upload)
 */
export async function checkImage(blob, { faces = true } = {}) {
  const fake = globalThis.__tbImageCheck;
  if (typeof fake === "function") return { ok: true, faces: 0, reason: null, scores: {}, model: "test", ...(await fake(blob)) };
  try {
    const { nsfw, faceapi } = await models();
    const img = await canvasFor(blob);
    const verdict = scanVerdict(await nsfw.classify(img));
    let n = 0;
    if (faces) {
      const found = await faceapi.detectAllFaces(
        img,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }),
      );
      n = facesWorthAsking(
        found.map((d) => ({ score: d.score, box: { width: d.box.width, height: d.box.height } })),
        { width: img.width, height: img.height },
      );
    }
    return { ok: true, ...verdict, faces: n, model: MODEL };
  } catch {
    return { ok: false, flagged: false, reason: null, scores: {}, faces: 0, model: MODEL };
  }
}

/** What the server keeps with an upload (ScanIn). */
export const scanForServer = (c) =>
  c?.ok ? { flagged: c.flagged, ...(c.reason ? { reason: c.reason } : {}), scores: c.scores, model: c.model } : null;
