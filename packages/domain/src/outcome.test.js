import { lessonOutcome } from "./outcome.js";

const lesson = {
  id: "u-1",
  kind: "lesson",
  steps: [
    { id: "u-1-intro", type: "intro", itemIds: ["a", "b"] },
    { id: "u-1-ex1", type: "listen-tap", itemIds: ["a"] },
    { id: "u-1-ex2", type: "count", itemIds: ["b"] },
    { id: "u-1-ex3", type: "match", itemIds: ["a", "b"] },
  ],
};

test("all right first time is 3 stars, perfect, with the perfect bonus", () => {
  const ok = { firstTry: true, misses: 0 };
  const o = lessonOutcome(
    lesson,
    { "u-1-ex1": ok, "u-1-ex2": ok, "u-1-ex3": ok },
    { lessonsToday: 0, goal: 2 },
  );
  expect(o).toMatchObject({
    stars: 3,
    perfect: true,
    total: 3,
    firstTry: 3,
    treasures: 15,
    reachedGoal: false,
    complete: true,
  });
  expect(o.answers).toHaveLength(4); // the match step practises two items
});

test("the lesson that reaches the daily goal earns the goal bonus once", () => {
  const ok = { firstTry: true, misses: 0 };
  const miss = { firstTry: false, misses: 2 };
  const r = { "u-1-ex1": ok, "u-1-ex2": miss, "u-1-ex3": ok };
  expect(lessonOutcome(lesson, r, { lessonsToday: 1, goal: 2 })).toMatchObject({
    stars: 2,
    reachedGoal: true,
    treasures: 20,
  });
  expect(lessonOutcome(lesson, r, { lessonsToday: 2, goal: 2 }).reachedGoal).toBe(false);
});

test("many hints still finish with 1 star and kept-going praise; misses are recorded for review", () => {
  const miss = { firstTry: false, misses: 3 };
  const o = lessonOutcome(
    lesson,
    { "u-1-ex1": miss, "u-1-ex2": miss, "u-1-ex3": miss },
    { lessonsToday: 0, goal: 2 },
  );
  expect(o).toMatchObject({ stars: 1, keptGoing: true, hints: 9, treasures: 10 });
  expect(o.answers.every((a) => a.firstTry === false)).toBe(true);
});

test("leaving early keeps the answers given so far but is not complete", () => {
  const o = lessonOutcome(lesson, { "u-1-ex1": { firstTry: true, misses: 0 } }, { lessonsToday: 0, goal: 2 });
  expect(o).toMatchObject({ complete: false, total: 1 });
  expect(o.answers).toEqual([{ itemId: "a", firstTry: true, stepId: "u-1-ex1" }]);
});

test("trophies use the trophy reward", () => {
  const ok = { firstTry: true, misses: 0 };
  const o = lessonOutcome(
    { ...lesson, kind: "trophy" },
    { "u-1-ex1": ok, "u-1-ex2": ok, "u-1-ex3": ok },
    { lessonsToday: 5, goal: 2 },
  );
  expect(o.treasures).toBe(20);
});
