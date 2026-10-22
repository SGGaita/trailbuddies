/**
 * Stars, treasures and the "you kept going" praise at the end of a lesson.
 * Stars measure first-try accuracy and are never spent; treasures are the currency.
 */

/**
 * 90%+ right first time = 3 stars, 60%+ = 2, otherwise 1. Finishing always earns at least 1.
 * @param {number} firstTry questions answered right first time
 * @param {number} total questions asked
 * @returns {1 | 2 | 3}
 */
export function starsFor(firstTry, total) {
  if (!total) return 3;
  const pct = firstTry / total;
  if (pct >= 0.9) return 3;
  if (pct >= 0.6) return 2;
  return 1;
}

/** Treasure amounts (a tunable config; the full economy arrives in Sprint 4). */
export const TREASURE_RULES = { lesson: 10, perfect: 5, dailyGoal: 10, trophy: 15 };

/**
 * @param {{ stars: number, perfect: boolean, reachedGoal: boolean, kind?: "lesson" | "trophy" | "review" }} r
 */
export function treasuresFor({ perfect, reachedGoal, kind = "lesson" }) {
  let n = kind === "trophy" ? TREASURE_RULES.trophy : TREASURE_RULES.lesson;
  if (perfect) n += TREASURE_RULES.perfect;
  if (reachedGoal) n += TREASURE_RULES.dailyGoal;
  return n;
}

/** Praise effort when the child needed several hints but finished. */
export const keptGoing = (/** @type {number} */ hintsUsed) => hintsUsed >= 3;
