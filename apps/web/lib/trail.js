import { getSubject, lessonIds } from "@trailbuddies/content";

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
    status: u.status,
    band: u.band,
    lessonIds: lessonIds(u),
  }));
}
