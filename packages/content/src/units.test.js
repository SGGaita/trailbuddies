import { buildLesson, buildTrophy, rng } from "@trailbuddies/domain";
import { ALL_UNITS } from "./units/all.js";

// Every lesson of every unit can be generated at every level, and no exercise quietly turns
// into a different type because the unit lacks what it needs (numbers, letters, words, groups).
describe("every unit plays", () => {
  for (const unit of ALL_UNITS) {
    test(unit.id, () => {
      for (let li = 0; li < unit.lessons.length; li++) {
        const wanted = unit.lessons[li].exercises.map((e) => e.type);
        for (const level of [1, 2, 3])
          for (let seed = 1; seed <= 12; seed++) {
            const lesson = buildLesson(unit, li, { level, band: unit.band, r: rng(seed * 31 + level) });
            const got = lesson.steps.filter((s) => s.type !== "intro").map((s) => s.type);
            expect(got).toEqual(wanted);
            for (const s of lesson.steps)
              if (s.options && s.type !== "odd-one-out") expect(s.options.length).toBeGreaterThan(0);
          }
      }
      for (let seed = 1; seed <= 5; seed++)
        expect(buildTrophy(unit, { level: 2, band: unit.band, r: rng(seed) }).steps).toHaveLength(6);
    });
  }

  test("item ids are unique across units (mastery is kept per item)", () => {
    const seen = new Map();
    for (const u of ALL_UNITS)
      for (const it of u.items) {
        expect(seen.get(it.id) ?? u.id).toBe(u.id);
        seen.set(it.id, u.id);
      }
  });
});
