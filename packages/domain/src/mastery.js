/**
 * Item mastery and spaced review (concept report §6.3). Each time an item is asked,
 * a right-first-time answer pushes its next review out (1, 3, 7, then 14 days);
 * a miss brings it back tomorrow. Four right-first-time answers in a row = mastered.
 */

const DAY = 24 * 60 * 60 * 1000;
export const REVIEW_DAYS = [1, 3, 7, 14];
export const MASTERED_STREAK = 4;

/**
 * @typedef {object} ItemMastery
 * @property {number} seen
 * @property {number} firstTry
 * @property {number} streak consecutive right-first-time answers
 * @property {number} due epoch ms when it should come back
 * @property {boolean} mastered
 */

/** @returns {ItemMastery} */
const fresh = () => ({ seen: 0, firstTry: 0, streak: 0, due: 0, mastered: false });

/**
 * Update one item's mastery after an answer.
 * @param {ItemMastery | undefined} m
 * @param {boolean} rightFirstTime
 * @param {number} at epoch ms
 * @returns {ItemMastery}
 */
export function updateMastery(m, rightFirstTime, at) {
  const cur = m || fresh();
  const streak = rightFirstTime ? cur.streak + 1 : 0;
  const days = rightFirstTime ? REVIEW_DAYS[Math.min(streak, REVIEW_DAYS.length) - 1] : REVIEW_DAYS[0];
  return {
    seen: cur.seen + 1,
    firstTry: cur.firstTry + (rightFirstTime ? 1 : 0),
    streak,
    due: at + days * DAY,
    mastered: streak >= MASTERED_STREAK,
  };
}

/**
 * Mastery for every item from a list of answers (oldest first).
 * @param {Array<{ itemId: string, firstTry: boolean, at: number }>} answers
 * @returns {Record<string, ItemMastery>}
 */
export function foldMastery(answers) {
  /** @type {Record<string, ItemMastery>} */
  const out = {};
  for (const a of [...answers].sort((x, y) => x.at - y.at)) out[a.itemId] = updateMastery(out[a.itemId], a.firstTry, a.at);
  return out;
}

/**
 * Items that need review now: missed recently (streak 0) and due, oldest due first.
 * Items answered right go quietly onto the 3/7/14-day schedule and come back inside normal lessons.
 * @param {Record<string, ItemMastery>} mastery
 * @param {number} now
 * @param {string[]} [among] limit to these item ids (e.g. one subject's items)
 */
export function dueForReview(mastery, now, among) {
  return Object.entries(mastery)
    .filter(([id, m]) => (!among || among.includes(id)) && !m.mastered && m.streak === 0 && m.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}

/** Items a child finds tricky (for the parent dashboard): under 70% right first time. */
export const tricky = (/** @type {Record<string, ItemMastery>} */ mastery) =>
  Object.entries(mastery)
    .filter(([, m]) => m.seen >= 1 && m.firstTry / m.seen < 0.7 && !m.mastered)
    .map(([id]) => id);
