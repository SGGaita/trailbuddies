// Speech: the device's built-in voice (ported from Martha's Learning Corner).
// Recorded clips (buddy lines, parents' recordings) plug in here in Sprint 1 and 5.
let voice = null;
let token = 0;

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

export function stop() {
  token++;
  if (canSpeak()) {
    try {
      speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Say a line. A new call cancels the previous one. `done` runs when it finishes
 * (or after a time-out, because some browsers never fire `onend`).
 * @param {string} text
 * @param {{ rate?: number, done?: () => void, enabled?: boolean }} [opts]
 */
export function speak(text, { rate = 0.9, done, enabled = true } = {}) {
  stop();
  const my = token;
  const finish = () => {
    if (my === token && done) done();
  };
  if (!enabled || !canSpeak() || !text) return finish();
  try {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1.1;
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  } catch {
    finish();
  }
  setTimeout(finish, Math.max(1600, text.length * 110));
}
