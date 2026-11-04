// Assignments, class insights and classroom mode (ASN-01..04, CLS-07, MAP-06b, CRM-01..05).
// Pure rules shared by the teacher's dashboard, the class tablet and the child's Class Island.
import { customId } from "./custom.js";

/**
 * @typedef {{ type: "class" } | { type: "group", group_id: string } | { type: "students", student_ids: string[] }} Target
 * @typedef {{ id: string, kind: "unit" | "custom", unit_id?: string | null, lesson?: any, title: string,
 *   target: Target, due_on?: string | null, created_at: string }} Assignment
 * @typedef {{ id: string, type: string, learnerId: string, at: string, data: any }} Ev
 */

/** The unit id an assignment's events carry: a built-in unit, or `custom-<lesson id>`. */
export const assignmentUnit = (/** @type {Assignment} */ a) =>
  a.kind === "custom" ? customId(a.lesson?.id || "") : a.unit_id || "";

/**
 * CLS-07 / ASN-01: who an assignment is for.
 * @param {Assignment} a
 * @param {{ id: string }[]} roster
 * @param {{ id: string, student_ids: string[] }[]} groups
 * @returns {string[]} student ids, in roster order
 */
export function targetsOf(a, roster, groups = []) {
  const t = a.target || { type: "class" };
  const ids = new Set(
    t.type === "group"
      ? groups.find((g) => g.id === t.group_id)?.student_ids || []
      : t.type === "students"
        ? t.student_ids || []
        : roster.map((s) => s.id),
  );
  return roster.filter((s) => ids.has(s.id)).map((s) => s.id);
}

/** "Whole class", the group's name, or the children's names, for lists and the CSV. */
export function targetLabel(a, groups = [], names = {}) {
  const t = a.target || { type: "class" };
  if (t.type === "group") return groups.find((g) => g.id === t.group_id)?.name || "";
  if (t.type === "students") return (t.student_ids || []).map((id) => names[id] || "").filter(Boolean).join(", ");
  return null; // the caller says "Whole class" in its own language
}

const day = (/** @type {string} */ iso) => String(iso || "").slice(0, 10);

/**
 * ASN-01: how far one child is with one assignment. Only lessons finished on or after the day it
 * was set count, so earlier play doesn't tick it off. A unit is done when each of its lessons has
 * been finished; its stars are the average of each lesson's best stars, rounded.
 * @param {Assignment} a
 * @param {Ev[]} events this child's events (class play and, if linked, home)
 * @param {number} lessonsTotal lessons in the unit (1 for a custom lesson)
 */
export function assignmentStatus(a, events, lessonsTotal) {
  const unit = assignmentUnit(a);
  const from = day(a.created_at);
  const best = new Map();
  for (const e of events) {
    if (e.type !== "lesson_completed" || e.data?.unitId !== unit || day(e.at) < from) continue;
    if (e.data.kind === "trophy" || e.data.kind === "review") continue;
    const key = e.data.lessonId;
    best.set(key, Math.max(best.get(key) || 0, Number(e.data.stars) || 0));
  }
  const total = Math.max(1, lessonsTotal);
  const lessonsDone = Math.min(best.size, total);
  const done = lessonsDone >= total;
  const sum = [...best.values()].reduce((n, s) => n + s, 0);
  return {
    done,
    lessonsDone,
    lessonsTotal: total,
    stars: best.size ? Math.round(sum / best.size) : 0,
    doneAt: done ? firstFullAt(events, unit, from, total) : null,
    started: best.size > 0 || events.some((e) => e.type === "item_answered" && e.data?.unitId === unit && day(e.at) >= from),
  };
}

/** When the last missing lesson was first finished. */
function firstFullAt(events, unit, from, total) {
  const seen = new Set();
  const sorted = [...events].sort((x, y) => (x.at < y.at ? -1 : 1));
  for (const e of sorted) {
    if (e.type !== "lesson_completed" || e.data?.unitId !== unit || day(e.at) < from) continue;
    if (e.data.kind === "trophy" || e.data.kind === "review") continue;
    seen.add(e.data.lessonId);
    if (seen.size >= total) return e.at;
  }
  return null;
}

/**
 * ASN-01: is it overdue? Due dates are calendar days (YYYY-MM-DD) in the device's time zone.
 * @param {Assignment} a @param {Date} now
 */
export function isOverdue(a, now = new Date()) {
  if (!a.due_on) return false;
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return a.due_on < today;
}

/**
 * MAP-06b: Class Island order. Work still to do comes first, soonest due date first (undated after
 * dated), newest first among equals; finished work goes last.
 * @template {Assignment & { status?: { done: boolean } }} T
 * @param {T[]} list
 * @returns {T[]}
 */
export function islandOrder(list) {
  const key = (a) => [a.status?.done ? 1 : 0, a.due_on || "9999-12-31"];
  return [...list].sort((x, y) => {
    const [dx, ux] = key(x);
    const [dy, uy] = key(y);
    if (dx !== dy) return dx - dy;
    if (ux !== uy) return ux < uy ? -1 : 1;
    return x.created_at < y.created_at ? 1 : -1;
  });
}

/** ASN-02: colour band for a cell, from stars (0–3). Children are never ranked. */
export function heatLevel(status) {
  if (!status || !status.started) return "none";
  if (!status.done) return "started";
  if (status.stars >= 3) return "secure";
  if (status.stars === 2) return "getting";
  return "help";
}

/**
 * Per-item first-try results for one child and one assignment.
 * @returns {Map<string, { tries: number, firstTry: number }>}
 */
function itemTally(a, events) {
  const unit = assignmentUnit(a);
  const from = day(a.created_at);
  const out = new Map();
  for (const e of events) {
    if (e.type !== "item_answered" || e.data?.unitId !== unit || day(e.at) < from) continue;
    const t = out.get(e.data.itemId) || { tries: 0, firstTry: 0 };
    t.tries += 1;
    if (e.data.firstTry) t.firstTry += 1;
    out.set(e.data.itemId, t);
  }
  return out;
}

/** An item a child struggled with: wrong first time more often than right (at least once). */
const struggled = (t) => t.tries > 0 && t.firstTry / t.tries < 0.5;

/**
 * ASN-02 cell detail: a child's answers in an assignment, weakest first, and the items struggled with.
 * @param {Assignment} a @param {Ev[]} events
 */
export function cellDetail(a, events) {
  const items = [...itemTally(a, events)].map(([itemId, t]) => ({
    itemId,
    tries: t.tries,
    firstTry: t.firstTry,
    struggled: struggled(t),
  }));
  items.sort((x, y) => x.firstTry / x.tries - y.firstTry / y.tries || x.itemId.localeCompare(y.itemId));
  return { items, weak: items.filter((i) => i.struggled).map((i) => i.itemId) };
}

/** ASN-03: the report waits for this many finished children, so one bad day isn't "the class". */
export const STRUGGLING_MIN_DONE = 10;

/**
 * ASN-03: the 5 items the class finds hardest in one assignment (lowest first-try accuracy), each
 * with the children who struggled with it. Null until enough children have finished.
 * @param {Assignment} a
 * @param {Record<string, Ev[]>} byStudent events per student id
 * @param {number} lessonsTotal
 * @param {{ min?: number, limit?: number }} [opts]
 */
export function strugglingItems(a, byStudent, lessonsTotal, { min = STRUGGLING_MIN_DONE, limit = 5 } = {}) {
  const ids = Object.keys(byStudent);
  const finished = ids.filter((id) => assignmentStatus(a, byStudent[id], lessonsTotal).done).length;
  if (finished < min) return { ready: false, finished, needed: min, items: [] };
  const all = new Map();
  for (const id of ids) {
    for (const [itemId, t] of itemTally(a, byStudent[id])) {
      const x = all.get(itemId) || { itemId, tries: 0, firstTry: 0, students: [] };
      x.tries += t.tries;
      x.firstTry += t.firstTry;
      if (struggled(t)) x.students.push(id);
      all.set(itemId, x);
    }
  }
  const items = [...all.values()]
    .map((x) => ({ ...x, accuracy: x.tries ? x.firstTry / x.tries : 1 }))
    .filter((x) => x.accuracy < 1)
    .sort((x, y) => x.accuracy - y.accuracy || y.tries - x.tries || x.itemId.localeCompare(y.itemId))
    .slice(0, limit);
  return { ready: true, finished, needed: min, items };
}

/**
 * ASN-04: the export holds first names, assignments, stars and completion dates only.
 * @param {{ assignments: Assignment[], roster: { id: string, first_name: string, initial?: string | null }[],
 *   groups?: any[], byStudent: Record<string, Ev[]>, lessonsTotal: (a: Assignment) => number }} input
 */
export function exportRows({ assignments, roster, groups = [], byStudent, lessonsTotal }) {
  const rows = [];
  for (const s of roster) {
    for (const a of assignments) {
      if (!targetsOf(a, roster, groups).includes(s.id)) continue;
      const st = assignmentStatus(a, byStudent[s.id] || [], lessonsTotal(a));
      rows.push({
        first_name: s.initial ? `${s.first_name} ${s.initial}.` : s.first_name,
        assignment: a.title,
        stars: st.done ? st.stars : "",
        completed: st.doneAt ? day(st.doneAt) : "",
      });
    }
  }
  return rows;
}

/** One CSV cell: quoted when needed, and a leading = + - @ is defused so spreadsheets don't run it. */
const cell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * @param {string[]} header
 * @param {Record<string, any>[]} rows
 * @param {string[]} keys
 */
export const toCsv = (header, rows, keys) =>
  [header, ...rows.map((r) => keys.map((k) => r[k]))].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";

// --- Classroom mode (CRM-01..05) ---------------------------------------------------------------

/** CRM-03: a shared tablet signs the child out after this long without a tap... */
export const SIGN_OUT_IDLE_MS = 3 * 60_000;
/** ...with a "Still here?" warning this long before. */
export const SIGN_OUT_WARN_MS = 10_000;

/**
 * CRM-03: where the idle timer is.
 * @param {number} lastTapAt ms @param {number} now ms
 * @returns {"active" | "warn" | "out"}
 */
export function idleState(lastTapAt, now) {
  const idle = now - lastTapAt;
  if (idle >= SIGN_OUT_IDLE_MS) return "out";
  if (idle >= SIGN_OUT_IDLE_MS - SIGN_OUT_WARN_MS) return "warn";
  return "active";
}

/**
 * CRM-05: the subjects a class tablet must keep on the device for its assignments to work offline.
 * @param {Assignment[]} assignments
 * @param {(unitId: string) => { subject: string } | null | undefined} unitOf
 */
export function classroomSubjects(assignments, unitOf) {
  const out = new Set();
  for (const a of assignments) {
    if (a.kind !== "unit" || !a.unit_id) continue;
    const u = unitOf(a.unit_id);
    if (u) out.add(u.subject);
  }
  return [...out];
}

/** CRM-05: the photos and clips a custom-lesson assignment needs on the device. */
export function assignmentMedia(assignments) {
  const out = new Set();
  for (const a of assignments) {
    if (a.kind !== "custom") continue;
    for (const c of a.lesson?.cards || []) {
      if (c.photo) out.add(c.photo);
      if (c.voice) out.add(c.voice);
    }
  }
  return [...out];
}
