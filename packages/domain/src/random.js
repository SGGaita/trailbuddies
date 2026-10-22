/**
 * Seeded randomness so lessons are reproducible in tests (and in bug reports).
 * mulberry32: small, fast, good enough for shuffling cards.
 */

/** @typedef {() => number} Rng returns [0, 1) */

/**
 * @param {number} seed
 * @returns {Rng}
 */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Copy of `list`, shuffled (Fisher–Yates).
 * @template T
 * @param {T[]} list
 * @param {Rng} r
 * @returns {T[]}
 */
export function shuffle(list, r) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @template T
 * @param {T[]} list
 * @param {Rng} r
 */
export const pick = (list, r) => list[Math.floor(r() * list.length)];
