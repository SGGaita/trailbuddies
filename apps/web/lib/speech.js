// Speech service. Recorded clips (buddy lines, content words, a parent's own voice)
// play when one exists; otherwise the device voice says the text. Ported from Martha's
// Learning Corner. Clips arrive with the voice packs (Sprint 6) and parent recordings (Sprint 5).
import { useFamily } from "./store";

let voice = null;
/** ACC-03: listeners for captions; each gets the line being said, then null when it ends. */
const listeners = new Set();
/** @param {(text: string | null) => void} fn @returns {() => void} unsubscribe */
export const onSpeech = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = (text) => listeners.forEach((fn) => fn(text));
let token = 0;
let audio = null;

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice() {
  if (!canSpeak()) return;
  const v = speechSynthesis.getVoices();
  voice =
    v.find((x) => /^en-GB/i.test(x.lang)) ||
    v.find((x) => /^en/i.test(x.lang) && /female|samantha|karen|zira|moira|google uk/i.test(x.name)) ||
    v.find((x) => /^en/i.test(x.lang)) ||
    null;
}
if (canSpeak()) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

/** The family's voice-speed setting (slow 0.8, normal 1, fast 1.15). */
const voiceScale = () => useFamily.getState().settings?.voice_rate || 1;

/**
 * Each buddy's own voice until recorded voice packs exist (BUD-01): device voice with
 * its own pitch and speed. Zip the robot is quick and high, Juma the elephant slow and low.
 */
export const BUDDY_VOICES = {
  zip: { pitch: 1.45, rate: 1.08 },
  tumi: { pitch: 0.95, rate: 0.92 },
  juma: { pitch: 0.7, rate: 0.88 },
  kiki: { pitch: 1.2, rate: 0.85 },
};

/** Speaking rate per band: slower for the youngest learners. */
export const RATE = { seedling: 0.8, sprout: 0.85, explorer: 0.95, voyager: 1, trailblazer: 1 };

/** Map from an asset id to a playable URL. Empty until voice packs are added. */
const clips = new Map();
/** @param {string} assetId @param {string} url */
export const registerClip = (assetId, url) => clips.set(assetId, url);

/** A grown-up's recording of a card's word (BLD-01): said instead of the device voice. */
const textClips = new Map();
/** @param {string} text @param {string} url */
export const registerTextClip = (text, url) => textClips.set(text.trim().toLowerCase(), url);
export const clearTextClips = () => textClips.clear();

export function stop() {
  token++;
  emit(null);
  if (canSpeak()) {
    try {
      speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
  if (audio) {
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
    audio = null;
  }
}

/**
 * Say a line. A new call cancels the previous one. `done` runs when it finishes
 * (or after a time-out, because some browsers never fire `onend`).
 * @param {string} text
 * @param {{ rate?: number, band?: string, buddy?: string | null, clip?: string, done?: () => void, enabled?: boolean }} [opts]
 */
export function speak(text, { rate, band, buddy, clip, done, enabled = true } = {}) {
  stop();
  const my = token;
  let finished = false;
  const finish = () => {
    if (finished || my !== token) return;
    finished = true;
    emit(null);
    if (done) done();
  };
  if (!enabled || !text) return finish();
  emit(text);

  const tts = () => {
    if (!canSpeak()) return finish();
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      const bv = (buddy && BUDDY_VOICES[buddy]) || { pitch: 1.1, rate: 1 };
      u.rate = Math.min(2, (rate ?? RATE[band] ?? 0.9) * bv.rate * voiceScale());
      u.pitch = bv.pitch;
      u.onend = finish;
      u.onerror = finish;
      speechSynthesis.speak(u);
    } catch {
      finish();
    }
    setTimeout(finish, Math.max(1600, text.length * 110));
  };

  const url = (clip && clips.get(clip)) || textClips.get(text.trim().toLowerCase());
  if (url) {
    try {
      audio = new Audio(url);
      audio.onended = finish;
      audio.onerror = () => my === token && tts();
      audio.play().catch(() => my === token && tts());
      return;
    } catch {
      /* fall through to the device voice */
    }
  }
  tts();
}
