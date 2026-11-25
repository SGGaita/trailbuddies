import { layoutTrail, isStandard, planProgress, planSubjects, planUnits, skippedSet, togglePlan, EMPTY_PLAN } from "./index.js";

const units = [
  { id: "a", title: "A", status: "ready", lessonIds: ["a-1", "a-2"] },
  { id: "b", title: "B", status: "ready", lessonIds: ["b-1"] },
  { id: "c", title: "C", status: "ready", lessonIds: ["c-1"] },
];

describe("a grown-up's plan for one child (PAR-09, PAR-10)", () => {
  test("hiding a trail or a unit leaves it out for this child only", () => {
    const plan = togglePlan(togglePlan(EMPTY_PLAN, "hidden", "letters"), "hidden", "b");
    expect(planSubjects([{ id: "numbers" }, { id: "letters" }], plan).map((s) => s.id)).toEqual(["numbers"]);
    expect(planUnits(units, plan, "numbers").map((u) => u.id)).toEqual(["a", "c"]);
    expect(planUnits(units, EMPTY_PLAN, "numbers").map((u) => u.id)).toEqual(["a", "b", "c"]); // other children
    expect(togglePlan(plan, "hidden", "b").hidden).toEqual(["letters"]); // undo
  });

  test("a skipped lesson opens the next one, without stars, and can be undone", () => {
    const plan = togglePlan(EMPTY_PLAN, "skipped", "a-1");
    const shown = planProgress({}, plan);
    const { nodes, next } = layoutTrail(units, shown, { skipped: skippedSet({}, plan) });
    const a1 = nodes.find((n) => n.id === "a-1");
    expect(a1).toMatchObject({ state: "done", stars: 0, skipped: true });
    expect(next.id).toBe("a-2");
    expect(planProgress({ "a-1": 3 }, plan)).toEqual({ "a-1": 3 }); // played later: real stars win
    expect(skippedSet({ "a-1": 3 }, plan).size).toBe(0);
    expect(isStandard(togglePlan(plan, "skipped", "a-1"))).toBe(true);
  });

  test("the grown-up's unit order is kept, and new units go at the end (PAR-10)", () => {
    const plan = { order: { numbers: ["c", "a"] } };
    expect(planUnits(units, plan, "numbers").map((u) => u.id)).toEqual(["c", "a", "b"]);
    expect(planUnits([...units, { id: "d" }], plan, "numbers").map((u) => u.id)).toEqual(["c", "a", "b", "d"]);
    expect(planUnits(units.filter((u) => u.id !== "c"), plan, "numbers").map((u) => u.id)).toEqual(["a", "b"]);
    expect(planUnits(units, plan, "letters").map((u) => u.id)).toEqual(["a", "b", "c"]);
  });
});
