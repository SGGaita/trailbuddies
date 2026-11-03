// Teachers and classes (CLS-01..06, HLP-03). Pure rules shared by the web app and tests.
import { PICTURES } from "./pictures.js";

/** Join codes: 6 characters with no 0/O or 1/I, easy to read aloud and type. */
export const JOIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** @param {string} code */
export const normaliseCode = (code) =>
  String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
/** @param {string} code */
export const validCode = (code) => new RegExp(`^[${JOIN_ALPHABET}]{6}$`).test(normaliseCode(code));

/** A roster entry's display name: "Zawadi" or "Zawadi M.". */
export const studentName = (s) => (s.initial ? `${s.first_name} ${s.initial}.` : s.first_name);

const clean = (n) =>
  String(n || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/**
 * CLS-02: turn a pasted list (one per line, or commas) into roster entries. Only a first
 * name is kept; a surname typed in becomes an initial. Names that clash with each other or
 * with the roster are returned in `clashes` so the teacher can add an initial.
 * @param {string} text
 * @param {{ first_name: string, initial?: string | null }[]} existing
 */
export function parseRoster(text, existing = []) {
  const entries = String(text || "")
    .split(/[\n,;]+/)
    .map((line) => clean(line))
    .filter((w) => w.length)
    .map((w) => ({
      first_name: w[0].slice(0, 40),
      initial: w.length > 1 ? w[w.length - 1][0].toUpperCase() : null,
    }));
  const key = (e) => studentName(e).toLowerCase();
  const seen = new Map();
  for (const e of [...existing, ...entries]) seen.set(key(e), (seen.get(key(e)) || 0) + 1);
  const clashes = [...new Set(entries.filter((e) => seen.get(key(e)) > 1).map(key))];
  return { entries, clashes };
}

/** Avatar colours handed out in turn (CLS-02). */
export const ROSTER_COLOURS = ["coral", "sky", "leaf", "berry", "sun", "night"];

/**
 * A random picture password for a roster child (shown to the teacher, who tells the child).
 * @param {() => number} [rand]
 */
export function randomPictures(rand = Math.random) {
  return Array.from({ length: 3 }, () => PICTURES[Math.floor(rand() * PICTURES.length)]);
}

/** Age bands a class can be (same ids as learners' bands). */
export const CLASS_BANDS = ["seedling", "sprout", "explorer", "voyager"];

/**
 * A roster child has no birth date (data minimisation), so class play uses the middle of the
 * class's age band. @param {string} band @param {Date} [now]
 */
export function bandBirth(band, now = new Date()) {
  const age = { seedling: 4, sprout: 6, explorer: 8, voyager: 10 }[band] ?? 6;
  return { year: now.getFullYear() - age, month: 1 };
}

/**
 * HLP-03: the teacher's first-week checklist. Steps tick themselves off from what exists.
 * @param {{ classes: { students: number, printed?: boolean, played?: boolean, viewed?: boolean }[] }} t
 */
export function teacherChecklist(t) {
  const cls = t.classes || [];
  const any = (k) => cls.some((c) => c[k]);
  return [
    { id: "students", done: cls.some((c) => c.students > 0) },
    { id: "letters", done: any("printed") },
    { id: "tablets", done: any("played") },
    { id: "assign", done: false, soon: true },
    { id: "progress", done: any("viewed") },
  ];
}

/** CLS-05: what a teacher may see of a linked child. @param {"class" | "all"} scope */
export const scopeAllows = (scope) => ({
  classPlay: true,
  totals: true,
  homeSubjects: scope === "all",
  familyLessons: false, // Family Island lessons stay with the family
});
