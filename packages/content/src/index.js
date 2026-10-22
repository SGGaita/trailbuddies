/**
 * Built-in content packs. JSON files are the source of truth; this module
 * gives apps a small read API over them. New units need a JSON file here and
 * an entry in UNITS below (the validator fails if the catalogue and files disagree).
 */
import catalogue from "./catalogue.json" with { type: "json" };
import countingOneToFive from "./units/numbers/counting-1-5.json" with { type: "json" };
import countingSixToTen from "./units/numbers/counting-6-10.json" with { type: "json" };
import buddyEn from "./buddy/en.json" with { type: "json" };
import builtInBadges from "./badges/built-in.json" with { type: "json" };

/** Units with full content, by id. */
export const UNITS = {
  [countingOneToFive.id]: countingOneToFive,
  [countingSixToTen.id]: countingSixToTen,
};

export { catalogue, builtInBadges };

/** @returns {typeof catalogue.subjects} */
export const getSubjects = () => catalogue.subjects;

/** @param {string} id */
export const getSubject = (id) => catalogue.subjects.find((s) => s.id === id) || null;

/** Units with full content for a subject, in trail order. @param {string} subjectId */
export const getReadyUnits = (subjectId) => (getSubject(subjectId)?.units || []).map((u) => UNITS[u.id]).filter(Boolean);

/**
 * Full unit content, or null if the unit is only planned.
 * @param {string} id
 */
export const getUnit = (id) => UNITS[id] || null;

/**
 * Lesson ids for a unit, from content if available, otherwise numbered from the catalogue.
 * @param {{ id: string, lessons?: number }} entry catalogue unit entry
 * @returns {string[]}
 */
export function lessonIds(entry) {
  const unit = UNITS[entry.id];
  if (unit) return unit.lessons.map((l) => l.id);
  return Array.from({ length: entry.lessons || 6 }, (_, i) => `${entry.id}-${i + 1}`);
}

/**
 * A buddy line for an event, with {name}-style placeholders filled.
 * @param {string} event e.g. "greet.back"
 * @param {Record<string, string>} [vars]
 * @param {number} [pick] index; defaults to the first variant
 */
export function buddyLine(event, vars = {}, pick = 0) {
  const lines = buddyEn.events[event];
  if (!lines) return "";
  const line = lines[pick % lines.length];
  return line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
