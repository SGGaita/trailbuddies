import { gateQuestion, gatePasses, pinProblem } from "./gate.js";
import { hashPin, checkPin } from "./pin.js";
import { placementQuestions, placementStart, placementDone, orderSubjects } from "./placement.js";
import { unitOpen, canPlay, currentUnit } from "./progress.js";
import { layoutTrail } from "./trail.js";
import { rng } from "./random.js";

describe("parent gate", () => {
  test("questions are grown-up sums with a 3-digit-ish answer", () => {
    for (let s = 1; s < 50; s++) {
      const q = gateQuestion(s);
      expect(q.answer).toBeGreaterThanOrEqual(36);
      expect(q.text).toMatch(/^What is \d+ × \d\?$/);
      expect(gatePasses(q, String(q.answer))).toBe(true);
      expect(gatePasses(q, String(q.answer + 1))).toBe(false);
      expect(gatePasses(q, "")).toBe(false);
    }
  });
  test("PINs must be 4 digits and not obvious", () => {
    expect(pinProblem("123")).toBe("length");
    expect(pinProblem("12a4")).toBe("length");
    expect(pinProblem("1111")).toBe("easy");
    expect(pinProblem("1234")).toBe("easy");
    expect(pinProblem("9876")).toBe("easy");
    expect(pinProblem("2580")).toBeNull();
  });
  test("PIN hash checks on the device and never contains the PIN", async () => {
    const stored = await hashPin("2580");
    expect(JSON.stringify(stored)).not.toContain("2580");
    expect(await checkPin("2580", stored)).toBe(true);
    expect(await checkPin("2581", stored)).toBe(false);
    expect(await checkPin("2580", null)).toBe(false);
  });
});

const unit = (id, nums) => ({
  id,
  subject: "numbers",
  title: id,
  items: nums.map((n) => ({ id: `n${n}`, label: String(n), say: String(n), number: n, emoji: "🍊" })),
  lessons: [],
  checkpoint: { review: 6 },
});

describe("placement", () => {
  const units = [unit("a", [1, 2, 3]), unit("b", [6, 7, 8])];
  const ids = units.map((u) => u.id);
  test("two questions per unit, tagged with the unit", () => {
    const qs = placementQuestions(units, { level: 2, band: "sprout", r: rng(1) });
    expect(qs.map((q) => q.unitId)).toEqual(["a", "a", "b", "b"]);
    expect(qs.every((q) => q.target && q.options.length >= 2)).toBe(true);
  });
  test("start at the first unit that isn't solid", () => {
    expect(placementStart(ids, { a: [true, false] })).toBeNull();
    expect(placementStart(ids, { a: [true, true], b: [false, true] })).toBe("b");
    expect(placementStart(ids, { a: [true, true], b: [true, true] })).toBe("b");
  });
  test("the quiz stops early at the first miss", () => {
    expect(placementDone(ids, { a: [false] })).toBe(true);
    expect(placementDone(ids, { a: [true] })).toBe(false);
    expect(placementDone(ids, { a: [true, true], b: [true] })).toBe(false);
    expect(placementDone(ids, { a: [true, true], b: [true, true] })).toBe(true);
  });
  test("interests come first on the map", () => {
    const s = [{ id: "numbers" }, { id: "language" }, { id: "animals" }];
    expect(orderSubjects(s, ["animals"]).map((x) => x.id)).toEqual(["animals", "numbers", "language"]);
    expect(orderSubjects(s).map((x) => x.id)).toEqual(["numbers", "language", "animals"]);
  });
});

describe("a placement start opens units", () => {
  const units = [
    { id: "a", title: "A", status: "ready", lessonIds: ["a-1"] },
    { id: "b", title: "B", status: "ready", lessonIds: ["b-1"] },
    { id: "c", title: "C", status: "planned", lessonIds: [] },
  ];
  test("units up to the start are open, and next is in the start unit", () => {
    expect(unitOpen(units, 1, {}, "b")).toBe(true);
    expect(unitOpen(units, 2, {}, "c")).toBe(false); // planned stays closed
    expect(canPlay(units, "b", 1, {}, "b")).toBe(true);
    expect(currentUnit(units, {}, "b").id).toBe("b");
    expect(layoutTrail(units, {}, { start: "b" }).next.id).toBe("b-1");
    expect(layoutTrail(units, {}).next.id).toBe("a-1");
  });
});

import { matchPairs } from "./lesson.js";
import { firstNameOnly } from "./names.js";

describe("completion rules", () => {
  test("match shows 3–5 pairs by level, from met items when there are enough", () => {
    expect([1, 2, 3].map((l) => matchPairs(l, 10, 10))).toEqual([3, 4, 5]);
    expect(matchPairs(3, 3, 5)).toBe(3); // only 3 met so far: stay with those
    expect(matchPairs(2, 1, 2)).toBe(2); // a unit with 2 items can't do more
  });
  test("only the first name is kept", () => {
    expect(firstNameOnly("  Zawadi  Wanjiru Kamau ")).toEqual({ name: "Zawadi", trimmed: true });
    expect(firstNameOnly("Zizi")).toEqual({ name: "Zizi", trimmed: false });
    expect(firstNameOnly("   ")).toEqual({ name: "", trimmed: false });
  });
});
