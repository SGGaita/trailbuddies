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

/** Default treasure amounts; the live values come from content/economy.json (RWD-09). */
export const TREASURE_RULES = { lesson: 10, perfect: 5, dailyGoal: 10, trophy: 15, game: 5, gameNewTopic: 5 };

/**
 * @param {{ stars: number, perfect: boolean, reachedGoal: boolean, kind?: "lesson" | "trophy" | "review" }} r
 */
export function treasuresFor({ perfect, reachedGoal, kind = "lesson" }, rules = TREASURE_RULES) {
  let n = kind === "trophy" ? rules.trophy : rules.lesson;
  if (perfect) n += rules.perfect;
  if (reachedGoal) n += rules.dailyGoal;
  return n;
}

/**
 * The daily earning cap (RWD-03): lessons and games stop paying once today's earnings
 * reach the cap; stars still count and the child isn't told. 0 or null = no cap.
 * @param {number} amount what would be earned
 * @param {number} earnedToday already earned today (capped sources only)
 * @param {number | null} cap
 */
export const capped = (amount, earnedToday, cap) => (cap ? Math.max(0, Math.min(amount, cap - earnedToday)) : amount);

/** Praise effort when the child needed several hints but finished. */
export const keptGoing = (/** @type {number} */ hintsUsed) => hintsUsed >= 3;
