import { getSubject, getSubjects, getUnit, lessonIds, BUILT_IN_UNIT_IDS } from "@trailbuddies/content";
import { planProgress, planSubjects, planUnits, skippedSet } from "@trailbuddies/domain";

/**
 * Catalogue units for a subject, with lesson ids, in the shape the domain package expects.
 * With a child's lesson plan (PAR-09/10), hidden units are left out and the grown-up's order is
 * used; other children get the standard trail.
 * @param {string} subjectId
 * @param {import("@trailbuddies/domain").LessonPlan} [plan]
 */
export function trailUnits(subjectId, plan) {
  const s = getSubject(subjectId);
  if (!s) return [];
  const units = s.units.map((u) => ({
    id: u.id,
    title: u.title,
    // A draft unit is playable in development and previews only; elsewhere it's "coming soon".
    status: getUnit(u.id) ? u.status : "planned",
    band: u.band,
    lessonIds: lessonIds(u),
  }));
  return plan ? planUnits(units, plan, subjectId) : units;
}

/**
 * One child's trail: their units, progress as the trail sees it (skipped lessons open the next
 * one, without stars) and the skipped stones. @param {string} subjectId @param {any} learner
 */
export function childTrail(subjectId, learner) {
  const plan = learner?.lessonPlan;
  const progress = learner?.progress || {};
  return {
    units: trailUnits(subjectId, plan),
    progress: planProgress(progress, plan),
    skipped: skippedSet(progress, plan),
    start: learner?.placement?.[subjectId] || null,
  };
}

/** Trails a child sees on the map (a grown-up may hide some, PAR-09). @param {any} learner */
export const childSubjects = (learner) => planSubjects(getSubjects(), learner?.lessonPlan);

/**
 * Where a lesson plays. Built-in units have their own pages; units that arrived in a content
 * pack after this build play on the generic page (CNT-02).
 * @param {string} unitId @param {number | "trophy"} step
 */
export const lessonHref = (unitId, step) =>
  BUILT_IN_UNIT_IDS.has(unitId)
    ? `/play/lesson/${unitId}/${step}`
    : `/play/go?unit=${encodeURIComponent(unitId)}&step=${step}`;
