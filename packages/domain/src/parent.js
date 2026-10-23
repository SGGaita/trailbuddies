/**
 * The grown-up zone's views of a learner (PAR-01, PAR-02): plain-words summaries built from
 * the same derived state the learner app uses. Never compares children with each other.
 */

const DAY = 86_400_000;

/**
 * Items a learner finds hard: answered at least twice, under 70% right first time, not yet
 * mastered. Hardest first.
 * @param {Record<string, { seen: number, firstTry: number, mastered: boolean }>} mastery
 * @param {{ limit?: number, min?: number }} [opts]
 */
export function hardItems(mastery, { limit = 6, min = 2 } = {}) {
  return Object.entries(mastery)
    .filter(([, m]) => m.seen >= min && !m.mastered && m.firstTry / m.seen < 0.7)
    .map(([itemId, m]) => ({
      itemId,
      right: m.firstTry,
      total: m.seen,
      pct: Math.round((m.firstTry / m.seen) * 100),
    }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total)
    .slice(0, limit);
}

/** A tip for a hard item, by how hard it is. @param {{ pct: number }} item */
export const tipFor = (item) => (item.pct < 40 ? "practise" : "spot");

/**
 * The learner's latest lessons, newest first (reviews included, games not).
 * @param {Array<{ lessonId: string, kind: string, stars: number, at: number }>} results
 */
export const recentLessons = (results, n = 10) => [...results].sort((a, b) => b.at - a.at).slice(0, n);

/**
 * This week at a glance: minutes, lessons and stars over the last 7 days.
 * @param {Array<{ at: number, durationSec: number, stars: number }>} results
 * @param {Date} [now]
 */
export function weekSummary(results, now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 6 * DAY;
  const week = results.filter((r) => r.at >= from);
  return {
    minutes: Math.round(week.reduce((n, r) => n + (r.durationSec || 0), 0) / 60),
    lessons: week.length,
    stars: week.reduce((n, r) => n + (r.stars || 0), 0),
  };
}
