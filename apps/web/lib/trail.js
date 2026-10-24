import { getSubject, getUnit, lessonIds, BUILT_IN_UNIT_IDS } from "@trailbuddies/content";

/**
 * Catalogue units for a subject, with lesson ids, in the shape the domain package expects.
 * @param {string} subjectId
 */
export function trailUnits(subjectId) {
  const s = getSubject(subjectId);
  if (!s) return [];
  return s.units.map((u) => ({
    id: u.id,
    title: u.title,
    // A draft unit is playable in development and previews only; elsewhere it's "coming soon".
    status: getUnit(u.id) ? u.status : "planned",
    band: u.band,
    lessonIds: lessonIds(u),
  }));
}

/**
 * Where a lesson plays. Built-in units have their own pages; units that arrived in a content
 * pack after this build play on the generic page (CNT-02).
 * @param {string} unitId @param {number | "trophy"} step
 */
export const lessonHref = (unitId, step) =>
  BUILT_IN_UNIT_IDS.has(unitId)
    ? `/play/lesson/${unitId}/${step}`
    : `/play/go?unit=${encodeURIComponent(unitId)}&step=${step}`;
