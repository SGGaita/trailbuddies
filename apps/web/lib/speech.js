// Speech service. Recorded clips (buddy lines, content words, a parent's own voice)
// play when one exists; otherwise the device voice says the text. Ported from Martha's
// Learning Corner. Clips arrive with the voice packs (Sprint 6) and parent recordings (Sprint 5).
let voice = null;
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

/** Speaking rate per band: slower for the youngest learners. */
export const RATE = { seedling: 0.8, sprout: 0.85, explorer: 0.95, voyager: 1, trailblazer: 1 };

/** Map from an asset id to a playable URL. Empty until voice packs are added. */
const clips = new Map();
/** @param {string} assetId @param {string} url */
export const registerClip = (assetId, url) => clips.set(assetId, url);

export function stop() {
  token++;
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
 * @param {{ rate?: number, band?: string, clip?: string, done?: () => void, enabled?: boolean }} [opts]
 */
export function speak(text, { rate, band, clip, done, enabled = true } = {}) {
  stop();
  const my = token;
  let finished = false;
  const finish = () => {
    if (finished || my !== token) return;
    finished = true;
    if (done) done();
  };
  if (!enabled || !text) return finish();

  const tts = () => {
    if (!canSpeak()) return finish();
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = rate ?? RATE[band] ?? 0.9;
      u.pitch = 1.1;
      u.onend = finish;
      u.onerror = finish;
      speechSynthesis.speak(u);
    } catch {
      finish();
    }
    setTimeout(finish, Math.max(1600, text.length * 110));
  };

  const url = clip && clips.get(clip);
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
