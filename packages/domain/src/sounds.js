// LES-19: letter sounds a grown-up records once. 26 letters plus 10 common digraphs (the usual
// phase 2-3 phonics set). Recordings are keyed by sound and play wherever a lesson says one.

const LETTER_WORDS = {
  a: "apple",
  b: "bat",
  c: "cat",
  d: "dog",
  e: "egg",
  f: "fish",
  g: "goat",
  h: "hat",
  i: "insect",
  j: "jam",
  k: "kite",
  l: "lion",
  m: "moon",
  n: "nest",
  o: "octopus",
  p: "pig",
  q: "queen",
  r: "rain",
  s: "sun",
  t: "tiger",
  u: "umbrella",
  v: "van",
  w: "web",
  x: "fox",
  y: "yo-yo",
  z: "zebra",
};
const DIGRAPH_WORDS = {
  sh: "ship",
  ch: "chip",
  th: "thumb",
  ng: "ring",
  ck: "duck",
  ee: "bee",
  oo: "moon",
  ai: "rain",
  oa: "boat",
  ar: "car",
};

/** @type {{ id: string, kind: "letter" | "digraph", example: string }[]} */
export const SOUNDS = [
  ...Object.entries(LETTER_WORDS).map(([id, example]) => ({ id, kind: "letter", example })),
  ...Object.entries(DIGRAPH_WORDS).map(([id, example]) => ({ id, kind: "digraph", example })),
];
export const SOUND_IDS = SOUNDS.map((s) => s.id);

/** @param {string} id */
export const isSound = (id) => SOUND_IDS.includes(id);

/**
 * Lines in the content that say a sound, so a recording can play for them: every item with a
 * `letter` (e.g. { letter: "s", say: "sss" }) whose sound has a recording: its `say` line and
 * the letter itself, which blending tiles speak.
 * @param {{ items: { letter?: string, say?: string, label?: string }[] }[]} units
 * @param {Record<string, string>} recorded sound id -> media id
 * @returns {{ text: string, sound: string, media: string }[]}
 */
export function soundLines(units, recorded) {
  const out = [];
  const seen = new Set();
  const add = (text, sound, media) => {
    const key = String(text || "")
      .trim()
      .toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ text, sound, media });
  };
  for (const u of units)
    for (const it of u.items || []) {
      const sound = (it.letter || "").toLowerCase();
      const media = recorded[sound];
      if (!media) continue;
      if (it.say) add(it.say, sound, media); // "sss"
      add(sound, sound, media); // blending tiles say the letter itself
    }
  return out;
}

/** "12 of 36 recorded". @param {Record<string, string>} recorded */
export const recordedCount = (recorded) => SOUND_IDS.filter((id) => recorded[id]).length;
