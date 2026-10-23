"use client";
import { useEffect, useState } from "react";
import { ulid } from "@trailbuddies/sync";
import {
  MEDIA_RULES,
  squareCrop,
  trimSilence,
  uploadPlan,
  afterAttempt,
  mediaProblem,
} from "@trailbuddies/domain";
import { useFamily, dbName } from "./store";
import { familyDb } from "./db";

/**
 * Grown-ups' photos and voice clips (BLD-01, BLD-15, BLD-16, SAF-02).
 *
 * - Photos are cropped square, resized and re-encoded on the device. Drawing to a canvas and
 *   saving a new JPEG drops every bit of EXIF (location, camera), so nothing leaves the device
 *   with it. The server checks again.
 * - Voice clips have silence trimmed from both ends, are capped at 10 s and saved as WAV.
 * - Both are saved in IndexedDB first, so a card works straight away, even offline, and are
 *   uploaded in the background. The demo family's media never leaves the device.
 */

/** @typedef {{ id: string, kind: "photo" | "voice", type: string, blob: Blob, state: "local" | "uploaded" | "rejected" | "device", attempts: number, nextAt?: number, error?: string }} MediaEntry */

const db = () => {
  const name = dbName(useFamily.getState());
  return name ? familyDb(name) : null;
};

export class StorageFullError extends Error {}

/** Is there room for another photo? Uses the browser's storage estimate when it has one. */
export async function hasRoom(bytes = 3_000_000) {
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (typeof quota === "number" && typeof usage === "number") return quota - usage > bytes;
  } catch {
    /* no estimate: assume there's room */
  }
  return true;
}

/** Load an image file into a bitmap-like source. */
async function loadImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall back to an <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A photo ready to save: centre square, at most 720 px, fresh JPEG (no EXIF).
 * @param {Blob} file
 * @returns {Promise<Blob>}
 */
export async function preparePhoto(file) {
  const img = await loadImage(file);
  const w = img.width;
  const h = img.height;
  const c = squareCrop(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = c.out;
  canvas.height = c.out;
  const g = canvas.getContext("2d");
  g.drawImage(img, c.sx, c.sy, c.s, c.s, 0, 0, c.out, c.out);
  img.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't read that photo");
  return blob;
}

/** 16-bit mono WAV from samples. */
function encodeWav(samples, rate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Trim a recording: quiet start and end cut, capped at 10 s, resampled to 16 kHz mono WAV.
 * @param {Blob} recording
 * @returns {Promise<Blob | null>} null when it was all silence
 */
export async function trimRecording(recording) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  try {
    const audio = await ctx.decodeAudioData(await recording.arrayBuffer());
    const rate = 16_000;
    const off = new OfflineAudioContext(1, Math.ceil(audio.duration * rate), rate);
    const src = off.createBufferSource();
    src.buffer = audio;
    src.connect(off.destination);
    src.start();
    const mono = (await off.startRendering()).getChannelData(0);
    const cut = trimSilence(mono, rate);
    return cut ? encodeWav(mono.subarray(cut.start, cut.end), rate) : null;
  } finally {
    ctx.close?.();
  }
}

/**
 * Hold-to-record (BLD-01 scenario 2). `start()` asks for the microphone; `stop()` returns
 * the trimmed clip. Recording stops by itself after 10 seconds.
 */
export function createRecorder() {
  let rec = null;
  let chunks = [];
  let timer = null;
  let stream = null;
  let finished = null;
  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      finished = new Promise((resolve) => (rec.onstop = resolve));
      rec.start();
      timer = setTimeout(() => rec?.state === "recording" && rec.stop(), MEDIA_RULES.voice.maxMs + 300);
    },
    async stop() {
      clearTimeout(timer);
      if (rec?.state === "recording") rec.stop();
      await finished;
      stream?.getTracks().forEach((t) => t.stop());
      const raw = new Blob(chunks, { type: rec?.mimeType || "audio/webm" });
      rec = null;
      return trimRecording(raw);
    },
    cancel() {
      clearTimeout(timer);
      if (rec?.state === "recording") rec.stop();
      stream?.getTracks().forEach((t) => t.stop());
      rec = null;
    },
  };
}

/**
 * Keep a photo or clip on this device and queue it for upload. Returns its id.
 * @param {"photo" | "voice"} kind
 * @param {Blob} blob
 */
export async function saveMedia(kind, blob) {
  const d = db();
  if (!d) throw new Error("No family on this device");
  const type = blob.type.split(";")[0] || (kind === "photo" ? "image/jpeg" : "audio/wav");
  const problem = mediaProblem(kind, type, blob.size);
  if (problem) throw new Error(problem === "size" ? "That's too big." : "That file can't be used.");
  if (!(await hasRoom(blob.size * 2))) throw new StorageFullError("full");
  const id = ulid();
  const demo = useFamily.getState().mode === "demo";
  try {
    await d.media.put({ id, kind, type, blob, state: demo ? "device" : "local", attempts: 0 });
  } catch (e) {
    if (e?.name === "QuotaExceededError" || e?.inner?.name === "QuotaExceededError")
      throw new StorageFullError("full");
    throw e;
  }
  refreshUploadStatus();
  return id;
}

/** @param {string} id @returns {Promise<MediaEntry | undefined>} */
export const getMedia = async (id) => db()?.media.get(id);

/** Waiting and failed uploads for the builder's banner (BLD-16). */
export async function refreshUploadStatus() {
  const d = db();
  if (!d) return;
  const all = await d.media.where("state").equals("local").toArray();
  const plan = uploadPlan(all, Date.now());
  useFamily.setState({ uploads: { waiting: plan.waiting, failed: plan.failed } });
}

let running = false;
/**
 * Upload what's due (BLD-15): ask the API for a link, send the file, let the server check
 * it. A refused file (e.g. still has GPS data) stays on this device only.
 * @param {any} api
 * @param {{ retry?: boolean }} [opts]
 */
export async function uploadMedia(api, { retry = false } = {}) {
  const s = useFamily.getState();
  if (running || s.mode !== "account" || !s.family?.id || s.family.role === "viewer") return;
  const d = familyDb(s.family.id);
  running = true;
  try {
    const all = await d.media.where("state").equals("local").toArray();
    const plan = uploadPlan(all, Date.now(), { retry });
    for (const id of plan.due) {
      const e = all.find((x) => x.id === id);
      let result = "error";
      let error;
      try {
        const r = await api.startMedia(s.family.id, {
          id,
          kind: e.kind,
          content_type: e.type,
          bytes: e.blob.size,
        });
        if (r.upload) {
          const put = await fetch(r.upload.url, { method: "PUT", body: e.blob, headers: r.upload.headers });
          if (!put.ok) throw new Error(`upload ${put.status}`);
        }
        await api.completeMedia(s.family.id, id);
        result = "ok";
      } catch (err) {
        error = err?.code || err?.message;
        if (err?.status === 422 || err?.status === 413) result = "rejected";
      }
      await d.media.put({ ...afterAttempt(e, result, Date.now()), error });
    }
  } finally {
    running = false;
    await refreshUploadStatus();
  }
}

/**
 * A URL for a card's photo or clip: the local copy when this device has it, otherwise the
 * family's copy on the server (a short-lived link).
 * @param {string | undefined} id
 */
export function useMediaUrl(id) {
  const [state, setState] = useState(/** @type {{ id?: string, url: string | null }} */ ({ url: null }));
  useEffect(() => {
    if (!id) return undefined;
    let url = null;
    let live = true;
    getMedia(id).then((e) => {
      if (!live) return;
      if (e?.blob) url = URL.createObjectURL(e.blob);
      else {
        const s = useFamily.getState();
        url = s.mode === "account" && s.family?.id ? `/api/families/${s.family.id}/media/${id}` : null;
      }
      setState({ id, url });
    });
    return () => {
      live = false;
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [id]);
  return state.id === id ? state.url : null;
}

/** Resolve a URL once (not a hook), for voice clips registered before a lesson starts. */
export async function mediaUrl(id) {
  const e = await getMedia(id);
  if (e?.blob) return URL.createObjectURL(e.blob);
  const s = useFamily.getState();
  return s.mode === "account" && s.family?.id ? `/api/families/${s.family.id}/media/${id}` : null;
}
