/**
 * Badge rule engine (BDG-01). Runs on the device after every lesson and game, so badges
 * arrive instantly and offline. Rules are data (content/badges/*.json): complete, count,
 * streak, mastery, combo; manual badges are given by grown-ups.
 */
import { goalDaysWithin } from "./streak.js";

/**
 * Everything the rules look at, worked out from a learner's derived state.
 * @param {any} s state from deriveState plus mastery, byDay (lessons per day) and goal
 */
export function badgeStats(s) {
  const lessons = s.results.filter((r) => r.kind === "lesson");
  const threeStar = Object.entries(s.progress).filter(([id, st]) => !id.endsWith("-trophy") && st >= 3).length;
  // Comebacks: items missed at some point that were later right first time twice running.
  const byItem = {};
  for (const a of [...s.answers].sort((x, y) => x.at - y.at)) (byItem[a.itemId] ||= []).push(a.firstTry);
  const comebacks = Object.values(byItem).filter((list) => {
    const miss = list.indexOf(false);
    if (miss < 0) return false;
    const after = list.slice(miss + 1);
    return after.some((v, i) => v && after[i + 1]);
  }).length;
  const kinds = new Set(s.games.map((g) => g.game));
  return {
    stars: s.stars,
    lessons: lessons.length,
    "perfect-lessons": threeStar,
    badges: s.badges.length,
    games: s.games.length,
    "no-hint-lessons": lessons.filter((r) => r.hints === 0 && r.stars >= 1).length,
    "kept-going-lessons": lessons.filter((r) => r.hints >= 3).length,
    comebacks,
    "goal-days": Object.values(s.byDay || {}).filter((n) => n >= s.goal).length,
    subjects: new Set(s.results.map((r) => r.subjectId).filter(Boolean)).size,
    "game-kinds": kinds.size,
    jigsaws: s.games.filter((g) => g.game === "jigsaw").length,
    "memory-games": s.games.filter((g) => g.game === "memory").length,
    "mastered-items": Object.values(s.mastery || {}).filter((m) => m.mastered).length,
  };
}

/**
 * @param {any} rule
 * @param {ReturnType<typeof badgeStats>} stats
 * @param {any} s derived state (progress, mastery, byDay, goal, now)
 * @returns {boolean}
 */
export function ruleMet(rule, stats, s) {
  switch (rule.type) {
    case "complete":
      return rule.units.every((u) => (s.progress[`${u}-trophy`] || 0) > 0);
    case "count":
      return (stats[rule.metric] || 0) >= rule.n;
    case "streak":
      return goalDaysWithin(s.byDay || {}, { goal: s.goal, window: rule.window || rule.days, now: s.now }) >= rule.days;
    case "mastery":
      return rule.items.every((id) => s.mastery?.[id]?.mastered);
    case "combo":
      return rule.op === "and"
        ? rule.all.every((r) => ruleMet(r, stats, s))
        : rule.all.some((r) => ruleMet(r, stats, s));
    default:
      return false; // manual badges are awarded by grown-ups
  }
}

/**
 * Badges newly earned now, in catalogue order.
 * @param {Array<{ id: string, rule: any }>} catalogue
 * @param {any} s derived state with mastery, byDay, goal
 */
export function newBadges(catalogue, s) {
  const stats = badgeStats(s);
  return catalogue.filter((b) => !s.badges.includes(b.id) && ruleMet(b.rule, stats, s));
}

/** Treasures a badge pays (by tier, from the economy config). */
export const badgePayout = (badge, payouts) => (badge.tier ? payouts[badge.tier] : badge.reward || 0);
