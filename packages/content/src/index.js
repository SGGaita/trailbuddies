/**
 * Built-in content packs. JSON files are the source of truth; this module
 * gives apps a small read API over them. New units need a JSON file here and
 * an entry in UNITS below (the validator fails if the catalogue and files disagree).
 */
import catalogue from "./catalogue.json" with { type: "json" };
import countingOneToFive from "./units/numbers/counting-1-5.json" with { type: "json" };
import countingSixToTen from "./units/numbers/counting-6-10.json" with { type: "json" };
import lettersAtoE from "./units/language/letters-a-e.json" with { type: "json" };
import whereAnimalsLive from "./units/animals/where-animals-live.json" with { type: "json" };
import buddyEn from "./buddy/en.json" with { type: "json" };
import zipEn from "./buddy/en.zip.json" with { type: "json" };
import tumiEn from "./buddy/en.tumi.json" with { type: "json" };
import jumaEn from "./buddy/en.juma.json" with { type: "json" };
import kikiEn from "./buddy/en.kiki.json" with { type: "json" };
import builtInBadges from "./badges/built-in.json" with { type: "json" };

/** Units with full content, by id. */
export const UNITS = {
  [countingOneToFive.id]: countingOneToFive,
  [countingSixToTen.id]: countingSixToTen,
  [lettersAtoE.id]: lettersAtoE,
  [whereAnimalsLive.id]: whereAnimalsLive,
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

/** Buddy script table (BUD-08): lines by language, buddy and event. Writers add lines in JSON. */
const SCRIPTS = { en: { all: buddyEn, zip: zipEn, tumi: tumiEn, juma: jumaEn, kiki: kikiEn } };

/** Warnings for missing lines, in development only. */
const warn = (msg) => {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") console.warn(msg);
};

/**
 * Every line for an event: the buddy's own lines first, then the shared ones, then the
 * generic fallback (with a development warning).
 * @param {string} event
 * @param {{ buddy?: string | null, lang?: string }} [opts]
 * @returns {string[]}
 */
export function linesFor(event, { buddy, lang = "en" } = {}) {
  const table = SCRIPTS[lang] || SCRIPTS.en;
  const own = buddy && table[buddy]?.events[event];
  if (own?.length) return own;
  const shared = table.all.events[event];
  if (shared?.length) return shared;
  warn(`[buddy] no line for "${event}"${buddy ? ` (${buddy})` : ""}; using the fallback`);
  return table.all.events.fallback;
}

const fill = (line, vars) => line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/**
 * A buddy line for an event, with {name}-style placeholders filled.
 * @param {string} event e.g. "greet.back"
 * @param {Record<string, string | number>} [vars]
 * @param {number} [pick] which variant (wraps around); defaults to the first
 * @param {string | null} [buddy]
 */
export function buddyLine(event, vars = {}, pick = 0, buddy = null) {
  const lines = linesFor(event, { buddy });
  return fill(lines[pick % lines.length], vars);
}

/**
 * Variety rule (BUD-06): a random line for the event, never the same as `last`.
 * @param {string} event
 * @param {{ buddy?: string | null, vars?: Record<string, string | number>, last?: string | null, r?: () => number }} [opts]
 */
export function buddySays(event, { buddy = null, vars = {}, last = null, r = Math.random } = {}) {
  const lines = linesFor(event, { buddy }).map((l) => fill(l, vars));
  const pool = lines.length > 1 ? lines.filter((l) => l !== last) : lines;
  return pool[Math.floor(r() * pool.length)];
}
