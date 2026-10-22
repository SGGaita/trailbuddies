import { autoLevel, effectiveLevel, choicesFor, describeLevel } from "./difficulty.js";
import { starsFor, treasuresFor, keptGoing } from "./scoring.js";
import { startLadder, answer, hintsUsed } from "./hints.js";
import { updateMastery, foldMastery, dueForReview, tricky, REVIEW_DAYS } from "./mastery.js";
import { layoutTrail } from "./trail.js";
import { canPlay } from "./progress.js";

const DAY = 86400000;

describe("difficulty", () => {
  test("bands start at sensible levels", () => {
    expect(autoLevel("seedling", [])).toBe(2);
    expect(autoLevel("explorer", [])).toBe(3);
    expect(choicesFor(1)).toBe(2);
    expect(describeLevel(3)).toBe("Level 3 · 4 choices");
  });
  test("two 3-star lessons in a row go up; two 1-star lessons go down; mixed results hold", () => {
    expect(autoLevel("sprout", [3, 3])).toBe(3);
    expect(autoLevel("sprout", [3, 2, 3])).toBe(2);
    expect(autoLevel("sprout", [1, 1])).toBe(1);
    expect(autoLevel("sprout", [1, 1, 1, 1])).toBe(1); // floor
    expect(autoLevel("explorer", [3, 3, 3, 3])).toBe(3); // ceiling
    expect(autoLevel("sprout", [3, 3, 1, 1])).toBe(2);
  });
  test("a locked setting wins over auto; bad settings fall back to auto", () => {
    expect(effectiveLevel("1", "explorer", [3, 3])).toBe(1);
    expect(effectiveLevel("auto", "sprout", [3, 3])).toBe(3);
    expect(effectiveLevel("9", "sprout", [])).toBe(2);
    expect(effectiveLevel(undefined, "seedling", [])).toBe(2);
  });
});

describe("scoring", () => {
  test("stars follow first-try accuracy and never drop below 1", () => {
    expect(starsFor(5, 5)).toBe(3);
    expect(starsFor(9, 10)).toBe(3);
    expect(starsFor(4, 5)).toBe(2);
    expect(starsFor(3, 5)).toBe(2);
    expect(starsFor(2, 5)).toBe(1);
    expect(starsFor(0, 5)).toBe(1);
    expect(starsFor(0, 0)).toBe(3);
  });
  test("treasures: lesson, perfect, daily goal and trophy", () => {
    expect(treasuresFor({ stars: 2, perfect: false, reachedGoal: false })).toBe(10);
    expect(treasuresFor({ stars: 3, perfect: true, reachedGoal: true })).toBe(25);
    expect(treasuresFor({ stars: 3, perfect: false, reachedGoal: false, kind: "trophy" })).toBe(15);
  });
  test("effort praise after 3 or more hints", () => {
    expect(keptGoing(2)).toBe(false);
    expect(keptGoing(3)).toBe(true);
  });
});

describe("hint ladder", () => {
  test("repeat, then eliminate a wrong option, then reveal", () => {
    let s = startLadder();
    let r = answer(s, false, { wrongOptionIds: ["a", "b"], chosenId: "a" });
    expect(r.effect).toBe("repeat");
    r = answer(r.state, false, { wrongOptionIds: ["a", "b"], chosenId: "a" });
    expect(r).toMatchObject({ effect: "eliminate", removeId: "b" });
    r = answer(r.state, false, { wrongOptionIds: ["a"], chosenId: "a" });
    expect(r.effect).toBe("reveal");
    expect(r.state.revealed).toBe(true);
    expect(answer(r.state, false).effect).toBe("reveal"); // still pointing at the answer
    r = answer(r.state, true);
    expect(r).toMatchObject({ effect: "correct", firstTry: false });
    expect(answer(r.state, true).effect).toBe("ignore");
    expect(hintsUsed([r.state, startLadder()])).toBe(3);
  });
  test("right first time", () => {
    expect(answer(startLadder(), true)).toMatchObject({ effect: "correct", firstTry: true });
  });
  test("with nothing left to remove, the second miss reveals", () => {
    const r1 = answer(startLadder(), false, { wrongOptionIds: ["a"] });
    expect(answer(r1.state, false, { wrongOptionIds: [] }).effect).toBe("reveal");
  });
});

describe("mastery and spaced review", () => {
  test("right answers push review out 1, 3, 7, 14 days; a miss brings it back tomorrow", () => {
    let m = updateMastery(undefined, true, 0);
    expect(m.due).toBe(REVIEW_DAYS[0] * DAY);
    m = updateMastery(m, true, 0);
    expect(m.due).toBe(3 * DAY);
    m = updateMastery(updateMastery(m, true, 0), true, 0);
    expect(m).toMatchObject({ streak: 4, due: 14 * DAY, mastered: true });
    m = updateMastery(m, false, 0);
    expect(m).toMatchObject({ streak: 0, due: DAY, mastered: false, seen: 5, firstTry: 4 });
  });
  test("due items are recent misses whose time has come", () => {
    const mastery = foldMastery([
      { itemId: "two", firstTry: false, at: 0 },
      { itemId: "three", firstTry: true, at: 0 },
      { itemId: "four", firstTry: false, at: 2 * DAY },
    ]);
    expect(dueForReview(mastery, DAY + 1)).toEqual(["two"]);
    expect(dueForReview(mastery, 10 * DAY)).toEqual(["two", "four"]);
    expect(dueForReview(mastery, 10 * DAY, ["four"])).toEqual(["four"]);
    expect(tricky(mastery).sort()).toEqual(["four", "two"]);
  });
  test("answers are folded oldest first regardless of input order", () => {
    const m = foldMastery([
      { itemId: "x", firstTry: true, at: 5 },
      { itemId: "x", firstTry: false, at: 1 },
    ]);
    expect(m.x.streak).toBe(1);
  });
});

describe("trail review stone", () => {
  const unit = (id, status = "ready") => ({ id, title: id, status, lessonIds: [`${id}-1`, `${id}-2`] });
  test("review stone sits before the next stone and pushes the rest down", () => {
    const plain = layoutTrail([unit("a"), unit("b")], { "a-1": 3 });
    const withReview = layoutTrail([unit("a"), unit("b")], { "a-1": 3 }, { review: true });
    const rv = withReview.nodes.find((n) => n.kind === "review");
    expect(rv).toBeTruthy();
    expect(rv.y).toBe(plain.next.y);
    expect(withReview.next.id).toBe("a-2");
    expect(withReview.next.y).toBe(plain.next.y + 100);
    expect(withReview.height).toBe(plain.height + 100);
    expect(withReview.path).toHaveLength(plain.path.length + 1);
  });
  test("no review stone when nothing is next", () => {
    const t = layoutTrail([unit("a", "planned")], {}, { review: true });
    expect(t.nodes.some((n) => n.kind === "review")).toBe(false);
  });
});

describe("canPlay", () => {
  const units = [
    { id: "a", title: "A", status: "ready", lessonIds: ["a-1", "a-2"] },
    { id: "b", title: "B", status: "ready", lessonIds: ["b-1"] },
  ];
  test("lessons in the first unit are open; the trophy waits for every lesson", () => {
    expect(canPlay(units, "a", 2, {})).toBe(true);
    expect(canPlay(units, "a", "trophy", { "a-1": 3 })).toBe(false);
    expect(canPlay(units, "a", "trophy", { "a-1": 3, "a-2": 1 })).toBe(true);
    expect(canPlay(units, "a", 3, {})).toBe(false);
  });
  test("the next unit opens only after the trophy", () => {
    expect(canPlay(units, "b", 1, { "a-1": 3, "a-2": 1 })).toBe(false);
    expect(canPlay(units, "b", 1, { "a-1": 3, "a-2": 1, "a-trophy": 2 })).toBe(true);
  });
});
