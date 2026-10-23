/**
 * Photos and voice clips for the Lesson Builder (BLD-01, BLD-15, BLD-16, SAF-02). Pure
 * rules shared by web and mobile: what may be uploaded, how a photo is cropped, how
 * silence is trimmed from a recording, and when a waiting upload is tried again.
 */

export const MEDIA_RULES = {
  photo: { maxBytes: 2_000_000, types: ["image/jpeg", "image/png", "image/webp"], size: 720 },
  voice: { maxBytes: 1_000_000, types: ["audio/wav", "audio/webm", "audio/ogg", "audio/mp4"], maxMs: 10_000 },
};

/** After this many failed tries an upload waits for a grown-up to press Retry. */
export const AUTO_TRIES = 3;

/**
 * Why a file can't be uploaded, or null when it can.
 * @param {"photo" | "voice"} kind
 * @param {string} type MIME type
 * @param {number} bytes
 * @returns {null | "kind" | "type" | "size" | "empty"}
 */
export function mediaProblem(kind, type, bytes) {
  const rule = MEDIA_RULES[kind];
  if (!rule) return "kind";
  if (!rule.types.includes(String(type).split(";")[0])) return "type";
  if (!bytes) return "empty";
  if (bytes > rule.maxBytes) return "size";
  return null;
}

/**
 * The centre square of a picture, scaled to `size` (never up-scaled).
 * @param {number} w @param {number} h @param {number} [size]
 */
export function squareCrop(w, h, size = MEDIA_RULES.photo.size) {
  const s = Math.min(w, h);
  return { sx: Math.floor((w - s) / 2), sy: Math.floor((h - s) / 2), s, out: Math.min(s, size) };
}

/**
 * Where the sound starts and ends in a recording: quiet at either end is cut, with a little
 * padding kept, and the clip is capped at 10 seconds.
 * @param {ArrayLike<number>} samples mono, -1..1
 * @param {number} rate samples per second
 * @param {{ threshold?: number, padMs?: number, maxMs?: number }} [opts]
 * @returns {{ start: number, end: number } | null} sample indices, or null when it's all silence
 */
export function trimSilence(
  samples,
  rate,
  { threshold = 0.02, padMs = 120, maxMs = MEDIA_RULES.voice.maxMs } = {},
) {
  const win = Math.max(1, Math.round(rate / 100)); // 10 ms windows
  const loud = (i) => {
    let peak = 0;
    for (let j = i; j < Math.min(samples.length, i + win); j++) peak = Math.max(peak, Math.abs(samples[j]));
    return peak >= threshold;
  };
  let first = -1;
  let last = -1;
  for (let i = 0; i < samples.length; i += win) {
    if (loud(i)) {
      if (first < 0) first = i;
      last = Math.min(samples.length, i + win);
    }
  }
  if (first < 0) return null;
  const pad = Math.round((padMs / 1000) * rate);
  const start = Math.max(0, first - pad);
  const end = Math.min(samples.length, last + pad, start + Math.round((maxMs / 1000) * rate));
  return { start, end };
}

/** Wait before the next automatic try: 5 s, 20 s, 80 s … capped at 10 minutes. */
export const retryDelay = (/** @type {number} */ attempts) =>
  Math.min(600_000, 5_000 * 4 ** Math.max(0, attempts - 1));

/**
 * @typedef {object} UploadEntry
 * @property {string} id
 * @property {"local" | "uploaded" | "rejected"} state
 * @property {number} attempts
 * @property {number} [nextAt] epoch ms
 */

/**
 * What the upload queue should do now, and what the builder's banner should say.
 * @param {UploadEntry[]} entries
 * @param {number} now
 * @param {{ retry?: boolean }} [opts] retry: a grown-up pressed Retry
 */
export function uploadPlan(entries, now, { retry = false } = {}) {
  const waiting = entries.filter((e) => e.state === "local");
  const failed = waiting.filter((e) => e.attempts >= AUTO_TRIES);
  const due = waiting.filter((e) => retry || (e.attempts < AUTO_TRIES && (e.nextAt || 0) <= now));
  return { waiting: waiting.length, failed: failed.length, due: due.map((e) => e.id) };
}

/** After an upload attempt. @param {UploadEntry} e @param {"ok" | "error" | "rejected"} result @param {number} now */
export function afterAttempt(e, result, now) {
  if (result === "ok") return { ...e, state: "uploaded", attempts: e.attempts + 1 };
  if (result === "rejected") return { ...e, state: "rejected", attempts: e.attempts + 1 };
  const attempts = e.attempts + 1;
  return { ...e, attempts, nextAt: now + retryDelay(attempts) };
}
