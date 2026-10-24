/**
 * Placement (concept report §4.3 step 5): a short quiz per subject finds where a learner
 * should start, so a child who can already count to 10 doesn't sit through 1 to 5.
 * Two questions per unit, easiest unit first; the quiz stops at the first unit that
 * isn't solid. Grown-ups can also pick "my child can already…" shortcuts.
 */
import { buildExercise } from "./lesson.js";

const PER_UNIT = 2;
/** About two minutes for a young child (ADP-05): the quiz never asks more than this. */
export const MAX_QUESTIONS = 10;

/**
 * @param {import("./lesson.js").Unit[]} units ready units of one subject, in trail order
 * @param {{ level: number, band: string, r: () => number }} opts
 * @returns {Array<import("./lesson.js").Step & { unitId: string }>}
 */
export function placementQuestions(units, { level, band, r }) {
  return units.slice(0, Math.ceil(MAX_QUESTIONS / PER_UNIT)).flatMap((u) => {
    const pool = [...u.items];
    let i = 0;
    const next = () => pool[i++ % pool.length];
    const types = u.items.every((it) => typeof it.number === "number")
      ? ["count", "listen-tap"]
      : ["listen-tap", "listen-tap"];
    return Array.from({ length: PER_UNIT }, (_, k) => ({
      ...buildExercise(
        { type: types[k % types.length], choices: 3 },
        { id: `place-${u.id}-${k + 1}`, next, pool, all: u.items, level, band, r },
      ),
      unitId: u.id,
    }));
  });
}

/**
 * Where to start: the first unit that isn't solid (or the last unit if all are). Returns
 * null when that is the first unit, i.e. start at the beginning.
 * @param {string[]} unitIds trail order
 * @param {Record<string, boolean[]>} answers right-first-time per question, by unit
 */
export function placementStart(unitIds, answers) {
  const solid = (id) => (answers[id] || []).length >= PER_UNIT && answers[id].every(Boolean);
  let i = 0;
  while (i < unitIds.length - 1 && solid(unitIds[i])) i++;
  return i === 0 ? null : unitIds[i];
}

/** Stop asking once a unit isn't solid. */
export function placementDone(unitIds, answers) {
  for (const id of unitIds) {
    const a = answers[id] || [];
    if (a.length < PER_UNIT) return a.some((x) => !x);
    if (a.some((x) => !x)) return true;
  }
  return true;
}

/**
 * "My child can already…" shortcuts for subjects with content. Each one sets a starting unit.
 * @type {Array<{ id: string, label: string, subject: string, start: string }>}
 */
export const SHORTCUTS = [
  { id: "count-5", label: "Counts to 5", subject: "numbers", start: "counting-6-10" },
  { id: "count-10", label: "Counts to 10", subject: "numbers", start: "number-shapes-0-10" },
  { id: "knows-letters", label: "Knows the letters", subject: "language", start: "letter-sounds-1" },
  { id: "knows-colours", label: "Knows the main colours", subject: "colours", start: "colours-of-things" },
  { id: "knows-shapes", label: "Knows circle, square, triangle", subject: "shapes", start: "more-shapes" },
];

/**
 * Units a placement skipped are shown as done with bronze stars (ADP-05, ONB-09). These
 * are display stars only: they don't count towards totals or badges.
 * @param {string[]} unitIds trail order
 * @param {string | null | undefined} start
 */
export const skippedUnits = (unitIds, start) => {
  const i = start ? unitIds.indexOf(start) : -1;
  return i > 0 ? unitIds.slice(0, i) : [];
};

/**
 * Subjects ordered by a learner's interests: favourites first, otherwise catalogue order.
 * @template {{ id: string }} S
 * @param {S[]} subjects
 * @param {string[]} [interests]
 */
export function orderSubjects(subjects, interests = []) {
  const rank = (s) => {
    const i = interests.indexOf(s.id);
    return i < 0 ? interests.length + subjects.indexOf(s) : i;
  };
  return [...subjects].sort((a, b) => rank(a) - rank(b));
}
