// Lesson sound effects (LES-02). Plays the sound files in /sounds when they load, and
// falls back to the same chime made with Web Audio (no file needed, works offline).
// Respects the family's "Sounds" setting.
import { useFamily } from "./store";

/** @typedef {"right" | "miss" | "done"} SoundName */

const NOTES = {
  right: [
    [1046.5, 0, 0.25],
    [1568, 0.09, 0.35],
  ],
  miss: [[330, 0, 0.22]],
  done: [
    [1046.5, 0, 0.3],
    [1318.5, 0.12, 0.3],
    [1568, 0.24, 0.3],
    [2093, 0.36, 0.6],
  ],
};

const files = new Map();
let ctx = null;

function synth(name) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    for (const [freq, at, dur] of NOTES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + at);
      if (name === "miss") osc.frequency.linearRampToValueAtTime(freq - 80, now + at + dur);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(name === "miss" ? 0.12 : 0.18, now + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + dur + 0.02);
    }
  } catch {
    /* no audio on this device */
  }
}

/** @param {SoundName} name */
export function playSound(name) {
  if (typeof window === "undefined" || !useFamily.getState().settings?.sound) return;
  let el = files.get(name);
  if (!el) {
    el = new Audio(`/sounds/${name}.wav`);
    el.preload = "auto";
    files.set(name, el);
  }
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(() => synth(name));
  } catch {
    synth(name);
  }
}
