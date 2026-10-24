/**
 * Progress over the subject trail. `progress` maps lesson ids (and "<unit>-trophy")
 * to the best stars earned (1–3). Units come from the catalogue with their lesson ids.
 */

/** @typedef {{ id: string, title: string, status: "ready" | "draft" | "planned", lessonIds: string[] }} TrailUnit */
/** @typedef {Record<string, number>} Progress */

export const trophyId = (/** @type {string} */ unitId) => `${unitId}-trophy`;

/**
 * @param {TrailUnit} unit
 * @param {Progress} progress
 */
export function unitProgress(unit, progress) {
  const done = unit.lessonIds.filter((id) => progress[id] > 0).length;
  const total = unit.lessonIds.length;
  const trophy = progress[trophyId(unit.id)] > 0;
  return { done, total, lessonsDone: done === total, trophy, complete: done === total && trophy };
}

/**
 * A unit is open when it has content and it's the first unit, or the trophy of the unit
 * before it has been won (all lessons, then the trophy review).
 * @param {TrailUnit[]} units
 * @param {number} index
 * @param {Progress} progress
 * @param {string | null} [start] starting unit from placement
 */
export function unitOpen(units, index, progress, start) {
  const u = units[index];
  if (!u || u.status === "planned") return false;
  if (index === 0) return true;
  // Placement (or a grown-up's shortcut) opens every unit up to the starting one.
  if (start && index <= units.findIndex((x) => x.id === start)) return true;
  return unitProgress(units[index - 1], progress).complete;
}

/**
 * Lessons done out of all lessons in a subject (trophies not counted).
 * @param {TrailUnit[]} units
 * @param {Progress} progress
 */
export function subjectProgress(units, progress) {
  let done = 0;
  let total = 0;
  for (const u of units) {
    const p = unitProgress(u, progress);
    done += p.done;
    total += p.total;
  }
  return { done, total, pct: total ? done / total : 0 };
}

/**
 * The unit a learner should work on next: the first open unit that isn't complete,
 * else the last open unit.
 * @param {TrailUnit[]} units
 * @param {Progress} progress
 */
export function currentUnit(units, progress, start) {
  let last = null;
  const from = start ? Math.max(0, units.findIndex((x) => x.id === start)) : 0;
  for (let i = from; i < units.length; i++) {
    if (!unitOpen(units, i, progress, start)) continue;
    last = units[i];
    if (!unitProgress(units[i], progress).complete) return units[i];
  }
  return last;
}

/**
 * Stars across all progress entries.
 * @param {Progress} progress
 */
export const totalStars = (progress) => Object.values(progress).reduce((a, b) => a + (b > 0 ? b : 0), 0);

/**
 * Whether a learner may play a stone: any lesson in an open unit, or the trophy once
 * every lesson in the unit is done.
 * @param {TrailUnit[]} units
 * @param {string} unitId
 * @param {number | "trophy"} step 1-based lesson number or "trophy"
 * @param {Progress} progress
 * @param {string | null} [start] starting unit from placement
 */
export function canPlay(units, unitId, step, progress, start) {
  const i = units.findIndex((u) => u.id === unitId);
  if (i < 0 || !unitOpen(units, i, progress, start)) return false;
  if (step === "trophy") return unitProgress(units[i], progress).lessonsDone;
  return Number.isInteger(step) && step >= 1 && step <= units[i].lessonIds.length;
}
