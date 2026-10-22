import { bandForAge, ageFrom, needsPin, isAdult } from "./bands.js";
import { unitProgress, unitOpen, subjectProgress, currentUnit, totalStars, trophyId } from "./progress.js";
import { layoutTrail, pathData } from "./trail.js";

const unit = (id, status = "ready", n = 3) => ({
  id,
  title: id,
  status,
  lessonIds: Array.from({ length: n }, (_, i) => `${id}-${i + 1}`),
});
const units = [unit("a"), unit("b"), unit("c", "planned")];

describe("bands", () => {
  test("age picks the starting band", () => {
    expect(bandForAge(3)).toBe("seedling");
    expect(bandForAge(6)).toBe("sprout");
    expect(bandForAge(8)).toBe("explorer");
    expect(bandForAge(12)).toBe("voyager");
    expect(bandForAge(46)).toBe("trailblazer");
  });
  test("under 3 and nonsense ages are rejected", () => {
    expect(() => bandForAge(2)).toThrow(RangeError);
    expect(() => bandForAge(NaN)).toThrow(RangeError);
  });
  test("age counts birthdays by month", () => {
    const on = new Date(2026, 9, 22); // 22 Oct 2026
    expect(ageFrom({ year: 2020, month: 6 }, on)).toBe(6);
    expect(ageFrom({ year: 2020, month: 11 }, on)).toBe(5);
  });
  test("PIN and adult rules", () => {
    expect(needsPin([3, 6])).toBe(false);
    expect(needsPin([3, 8])).toBe(true);
    expect(isAdult(18)).toBe(true);
  });
});

describe("progress", () => {
  test("unit progress and trophy", () => {
    const p = { "a-1": 3, "a-2": 2, "a-3": 1, [trophyId("a")]: 3 };
    expect(unitProgress(units[0], p)).toEqual({
      done: 3,
      total: 3,
      lessonsDone: true,
      trophy: true,
      complete: true,
    });
  });
  test("next unit opens after the previous unit's lessons; planned never opens", () => {
    expect(unitOpen(units, 1, {})).toBe(false);
    expect(unitOpen(units, 1, { "a-1": 1, "a-2": 1, "a-3": 1 })).toBe(true);
    const all = { "a-1": 1, "a-2": 1, "a-3": 1, "b-1": 1, "b-2": 1, "b-3": 1 };
    expect(unitOpen(units, 2, all)).toBe(false);
  });
  test("subject progress and current unit", () => {
    const p = { "a-1": 2, "a-2": 2 };
    expect(subjectProgress(units, p)).toEqual({ done: 2, total: 9, pct: 2 / 9 });
    expect(currentUnit(units, p).id).toBe("a");
    expect(currentUnit(units, { "a-1": 1, "a-2": 1, "a-3": 1, [trophyId("a")]: 1 }).id).toBe("b");
  });
  test("stars add up", () => {
    expect(totalStars({ x: 3, y: 2, z: 0 })).toBe(5);
  });
});

describe("trail layout", () => {
  test("first open lesson is next; locked and planned units are marked", () => {
    const t = layoutTrail(units, { "a-1": 3 });
    const lessons = t.nodes.filter((n) => n.kind === "lesson");
    expect(lessons.map((n) => n.state)).toEqual([
      "done",
      "next",
      "open",
      "locked",
      "locked",
      "locked",
      "planned",
      "planned",
      "planned",
    ]);
    expect(t.next.id).toBe("a-2");
    expect(t.nodes.filter((n) => n.kind === "banner").map((n) => n.state)).toEqual([
      "open",
      "locked",
      "planned",
    ]);
  });
  test("trophy becomes next when all lessons are done", () => {
    const t = layoutTrail(units, { "a-1": 1, "a-2": 1, "a-3": 1 });
    expect(t.next.kind).toBe("trophy");
    expect(t.next.unitId).toBe("a");
  });
  test("coordinates scale with width and the path joins stones", () => {
    const narrow = layoutTrail(units, {}, { width: 300 });
    const wide = layoutTrail(units, {}, { width: 600 });
    expect(wide.nodes[1].x).toBe(narrow.nodes[1].x * 2);
    expect(narrow.path).toHaveLength(9 + 3);
    expect(
      pathData([
        [0, 0],
        [10, 20],
      ]),
    ).toBe("M0 0 L10 20");
    expect(narrow.height).toBeGreaterThan(1000);
  });
});
