import {
  assignmentUnit,
  targetsOf,
  targetLabel,
  assignmentStatus,
  isOverdue,
  islandOrder,
  heatLevel,
  cellDetail,
  strugglingItems,
  exportRows,
  toCsv,
  idleState,
  SIGN_OUT_IDLE_MS,
  SIGN_OUT_WARN_MS,
  classroomSubjects,
  assignmentMedia,
  teacherChecklist,
} from "./index.js";

const roster = [{ id: "s1", first_name: "Zawadi", initial: "M" }, { id: "s2", first_name: "Amani" }, { id: "s3", first_name: "Baraka" }];
const groups = [{ id: "g1", name: "Readers", student_ids: ["s1", "s3"] }];
const water = { id: "a1", kind: "unit", unit_id: "water-animals", title: "Water animals", target: { type: "group", group_id: "g1" }, due_on: "2026-11-06", created_at: "2026-11-02T08:00:00Z" };

let n = 0;
const done = (lessonId, stars, at = "2026-11-03T09:00:00Z", unitId = "water-animals", kind = "lesson") => ({
  id: `e${++n}`,
  type: "lesson_completed",
  learnerId: "s1",
  at,
  data: { lessonId, unitId, subjectId: "animals", kind, stars },
});
const answer = (itemId, firstTry, at = "2026-11-03T09:00:00Z", unitId = "water-animals") => ({
  id: `e${++n}`,
  type: "item_answered",
  learnerId: "s1",
  at,
  data: { itemId, unitId, firstTry },
});

describe("ASN-01 / CLS-07 who gets the work", () => {
  test("class, group or chosen children, in roster order", () => {
    expect(targetsOf({ ...water, target: { type: "class" } }, roster, groups)).toEqual(["s1", "s2", "s3"]);
    expect(targetsOf(water, roster, groups)).toEqual(["s1", "s3"]);
    expect(targetsOf({ ...water, target: { type: "students", student_ids: ["s3", "s2"] } }, roster)).toEqual(["s2", "s3"]);
    // A child who left the class, or a deleted group, gets nothing.
    expect(targetsOf({ ...water, target: { type: "students", student_ids: ["gone"] } }, roster)).toEqual([]);
    expect(targetsOf({ ...water, target: { type: "group", group_id: "nope" } }, roster, groups)).toEqual([]);
  });

  test("labels for lists and the export", () => {
    expect(targetLabel(water, groups)).toBe("Readers");
    expect(targetLabel({ ...water, target: { type: "class" } })).toBeNull();
    expect(targetLabel({ ...water, target: { type: "students", student_ids: ["s1", "s2"] } }, [], { s1: "Zawadi M.", s2: "Amani" })).toBe("Zawadi M., Amani");
  });

  test("custom lessons carry their custom unit id", () => {
    expect(assignmentUnit(water)).toBe("water-animals");
    expect(assignmentUnit({ kind: "custom", lesson: { id: "01ABC" } })).toBe("custom-01ABC");
  });
});

describe("ASN-01 status changes to done with stars", () => {
  test("every lesson of the unit, from the day it was set; best stars per lesson, averaged", () => {
    const events = [
      done("water-animals:1", 3, "2026-11-01T09:00:00Z"), // before it was set: doesn't count
      done("water-animals:1", 2),
      done("water-animals:1", 3, "2026-11-04T09:00:00Z"),
      done("water-animals:2", 1, "2026-11-04T10:00:00Z"),
    ];
    const part = assignmentStatus(water, events.slice(0, 2), 2);
    expect(part).toMatchObject({ done: false, lessonsDone: 1, lessonsTotal: 2, started: true, doneAt: null });
    const all = assignmentStatus(water, events, 2);
    expect(all).toMatchObject({ done: true, lessonsDone: 2, stars: 2, doneAt: "2026-11-04T10:00:00Z" });
  });

  test("the trophy, reviews and other units don't count; nothing played means not started", () => {
    const events = [done("water-animals:T", 3, undefined, "water-animals", "trophy"), done("x:1", 3, undefined, "farm")];
    expect(assignmentStatus(water, events, 1)).toMatchObject({ done: false, started: false, stars: 0 });
  });

  test("a custom lesson is one lesson", () => {
    const a = { ...water, kind: "custom", unit_id: null, lesson: { id: "L1" } };
    expect(assignmentStatus(a, [done("custom-L1", 3, undefined, "custom-L1", "custom")], 1)).toMatchObject({ done: true, stars: 3 });
  });

  test("a set day counts the whole of that day, whatever the time", () => {
    expect(assignmentStatus(water, [done("water-animals:1", 3, "2026-11-02T06:00:00Z")], 1).done).toBe(true);
  });
});

describe("MAP-06b Class Island order", () => {
  test("due work first, soonest first; undated next; finished last", () => {
    const list = [
      { id: "done", due_on: "2026-11-01", created_at: "1", status: { done: true } },
      { id: "nodate", due_on: null, created_at: "2", status: { done: false } },
      { id: "fri", due_on: "2026-11-06", created_at: "3", status: { done: false } },
      { id: "wed", due_on: "2026-11-04", created_at: "4", status: { done: false } },
    ];
    expect(islandOrder(list).map((a) => a.id)).toEqual(["wed", "fri", "nodate", "done"]);
  });

  test("overdue is a calendar day", () => {
    expect(isOverdue(water, new Date("2026-11-06T20:00:00"))).toBe(false);
    expect(isOverdue(water, new Date("2026-11-07T08:00:00"))).toBe(true);
    expect(isOverdue({ ...water, due_on: null }, new Date("2030-01-01"))).toBe(false);
  });
});

describe("ASN-02 heatmap", () => {
  test("cells: not started, started, then by stars", () => {
    expect(heatLevel(null)).toBe("none");
    expect(heatLevel({ started: false })).toBe("none");
    expect(heatLevel({ started: true, done: false })).toBe("started");
    expect(heatLevel({ started: true, done: true, stars: 3 })).toBe("secure");
    expect(heatLevel({ started: true, done: true, stars: 2 })).toBe("getting");
    expect(heatLevel({ started: true, done: true, stars: 1 })).toBe("help");
  });

  test("a cell's answers, weakest first, with the items struggled with", () => {
    const events = [answer("hippo", false), answer("hippo", false), answer("hippo", true), answer("duck", true), answer("fish", false), answer("fish", true)];
    const d = cellDetail(water, events);
    expect(d.items.map((i) => i.itemId)).toEqual(["hippo", "fish", "duck"]);
    expect(d.weak).toEqual(["hippo"]); // fish was right half the time: not "struggled"
  });
});

describe("ASN-03 struggling items", () => {
  const byStudent = (count, wrong) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        `k${i}`,
        [done("water-animals:1", 2), answer("hippo", i >= wrong), answer("duck", true), answer("crab", i % 2 === 0)],
      ]),
    );

  test("waits for 10 finished children", () => {
    const r = strugglingItems(water, byStudent(9, 5), 1);
    expect(r).toMatchObject({ ready: false, finished: 9, needed: 10, items: [] });
  });

  test("the hardest items by first-try accuracy, with who struggled; items everyone got right are left out", () => {
    const r = strugglingItems(water, byStudent(12, 9), 1);
    expect(r.ready).toBe(true);
    expect(r.items.map((i) => i.itemId)).toEqual(["hippo", "crab"]);
    expect(r.items[0].students).toHaveLength(9);
    expect(r.items[0].accuracy).toBeCloseTo(3 / 12);
  });

  test("at most 5", () => {
    const events = ["a", "b", "c", "d", "e", "f", "g"].map((id) => answer(id, false));
    const all = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`k${i}`, [done("water-animals:1", 1), ...events]]));
    expect(strugglingItems(water, all, 1).items).toHaveLength(5);
  });
});

describe("ASN-04 export", () => {
  test("first names, assignments, stars and completion dates only; children it wasn't for are left out", () => {
    const rows = exportRows({
      assignments: [water],
      roster,
      groups,
      byStudent: { s1: [done("water-animals:1", 3, "2026-11-05T09:00:00Z")], s3: [] },
      lessonsTotal: () => 1,
    });
    expect(rows).toEqual([
      { first_name: "Zawadi M.", assignment: "Water animals", stars: 3, completed: "2026-11-05" },
      { first_name: "Baraka", assignment: "Water animals", stars: "", completed: "" },
    ]);
  });

  test("CSV is quoted and safe to open in a spreadsheet", () => {
    const csv = toCsv(["Name", "Work"], [{ a: "=SUM(A1)", b: 'Say "hi", then go' }], ["a", "b"]);
    expect(csv).toBe(`Name,Work\r\n'=SUM(A1),"Say ""hi"", then go"\r\n`);
  });
});

describe("CRM-03 auto sign-out", () => {
  test("3 minutes without a tap, with a 10-second warning", () => {
    expect(SIGN_OUT_IDLE_MS).toBe(180_000);
    expect(idleState(0, 60_000)).toBe("active");
    expect(idleState(0, SIGN_OUT_IDLE_MS - SIGN_OUT_WARN_MS)).toBe("warn");
    expect(idleState(0, SIGN_OUT_IDLE_MS)).toBe("out");
  });
});

describe("CRM-05 offline classroom", () => {
  test("subjects to keep and custom-lesson media to download", () => {
    const units = { "water-animals": { subject: "animals" }, "counting-1-5": { subject: "numbers" } };
    const list = [water, { ...water, unit_id: "counting-1-5" }, { ...water, unit_id: "gone" }, { kind: "custom", lesson: { cards: [{ photo: "m1", voice: "m2" }, { emoji: "🐟" }] } }];
    expect(classroomSubjects(list, (id) => units[id]).sort()).toEqual(["animals", "numbers"]);
    expect(assignmentMedia(list)).toEqual(["m1", "m2"]);
  });
});

describe("HLP-03 checklist: assign work", () => {
  test("ticks itself off once work is assigned", () => {
    const steps = teacherChecklist({ classes: [{ students: 3, assigned: true }] });
    expect(steps.find((s) => s.id === "assign")).toEqual({ id: "assign", done: true });
  });
});
