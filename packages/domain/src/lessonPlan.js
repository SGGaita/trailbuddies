/**
 * PAR-09 / PAR-10: a grown-up's plan for one child's lessons. Other children keep the standard
 * trail, and the content team's updates still arrive.
 *
 *   hidden  trail (subject) ids and unit ids this child doesn't see
 *   skipped lesson ids treated as done for this child, without stars (undo: take it out)
 *   order   per trail, the unit order this grown-up chose (PAR-10)
 *
 * @typedef {{ hidden?: string[], skipped?: string[], order?: Record<string, string[]> }} LessonPlan
 */

/** The empty plan: the standard trail. */
export const EMPTY_PLAN = Object.freeze({ hidden: [], skipped: [], order: {} });

/** Fill in missing parts so callers can read every field. @param {LessonPlan | null | undefined} plan */
export const normalPlan = (plan) => ({
  hidden: plan?.hidden || [],
  skipped: plan?.skipped || [],
  order: plan?.order || {},
});

/** True when the plan changes nothing. */
export const isStandard = (plan) => {
  const p = normalPlan(plan);
  return !p.hidden.length && !p.skipped.length && !Object.keys(p.order).length;
};

/** Add or take out an id from a list in the plan (hide/show, skip/undo). */
export function togglePlan(plan, key, id) {
  const p = normalPlan(plan);
  const list = p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id];
  return { ...p, [key]: list };
}

/** Trails this child sees on the map, in map order. */
export const planSubjects = (subjects, plan) => {
  const hidden = new Set(normalPlan(plan).hidden);
  return subjects.filter((s) => !hidden.has(s.id));
};

/**
 * A trail's units as this child plays them: hidden units left out, the grown-up's order
 * applied (PAR-10). Units the plan doesn't mention (new from the content team) go at the end,
 * in the standard order.
 * @template {{ id: string }} U
 * @param {U[]} units standard order
 * @param {LessonPlan | null | undefined} plan
 * @param {string} subjectId
 * @returns {U[]}
 */
export function planUnits(units, plan, subjectId) {
  const p = normalPlan(plan);
  const hidden = new Set(p.hidden);
  const chosen = p.order[subjectId] || [];
  const byId = new Map(units.map((u) => [u.id, u]));
  const ordered = [...chosen.filter((id) => byId.has(id)).map((id) => byId.get(id)), ...units.filter((u) => !chosen.includes(u.id))];
  return ordered.filter((u) => !hidden.has(u.id));
}

/**
 * Progress as the trail sees it: a skipped lesson counts as done (the next one opens) but has no
 * stars of its own. Stars and rewards always use the real progress.
 * @param {Record<string, number>} progress
 * @param {LessonPlan | null | undefined} plan
 */
export function planProgress(progress, plan) {
  const skipped = normalPlan(plan).skipped.filter((id) => !(progress[id] > 0));
  if (!skipped.length) return progress;
  return { ...progress, ...Object.fromEntries(skipped.map((id) => [id, 1])) };
}

/** Lesson ids skipped and not played since (shown "skipped", no stars). */
export const skippedSet = (progress, plan) => new Set(normalPlan(plan).skipped.filter((id) => !(progress[id] > 0)));
