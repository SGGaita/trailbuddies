import { rng, shuffle } from "./random.js";
import { buildLesson, buildTrophy, buildReview, buildExercise, optionCount, introducedUpTo, questionSteps, EXERCISE_TYPES } from "./lesson.js";

const n = (id, number, emoji) => ({ id, label: String(number), say: id, number, emoji });
const unit = {
  id: "counting-1-5",
  subject: "numbers",
  title: "Counting 1 to 5",
  items: [n("one", 1, "🥭"), n("two", 2, "🐥"), n("three", 3, "🎈"), n("four", 4, "🐞"), n("five", 5, "⭐")],
  lessons: [
    { id: "counting-1-5-1", title: "Meet 1, 2 and 3", focus: ["one", "two", "three"], exercises: [{ type: "listen-tap", choices: 2 }, { type: "count" }, { type: "listen-tap", choices: 3 }, { type: "match" }, { type: "count" }] },
    { id: "counting-1-5-2", title: "Count to 3", focus: [], review: ["one", "two", "three"], exercises: [{ type: "count" }, { type: "compare" }, { type: "name-it", choices: 3 }] },
    { id: "counting-1-5-3", title: "Meet 4 and 5", focus: ["four", "five"], review: ["three"], exercises: [{ type: "sequence" }, { type: "odd-one-out", choices: 3 }, { type: "listen-tap", choices: 3 }] },
  ],
  checkpoint: { review: 4 },
};
const words = { id: "pets", subject: "animals", title: "Pets", items: [{ id: "dog", label: "dog" }, { id: "cat", label: "cat" }, { id: "fish", label: "fish" }], lessons: [{ id: "pets-1", title: "Pets", focus: ["dog", "cat", "fish"], exercises: [{ type: "count" }, { type: "compare" }, { type: "match" }] }], checkpoint: { review: 2 } };
const opts = (seed = 1, level = 2) => ({ level, band: "sprout", r: rng(seed) });

test("seeded random is reproducible", () => {
  expect(shuffle([1, 2, 3, 4, 5], rng(7))).toEqual(shuffle([1, 2, 3, 4, 5], rng(7)));
  const r = rng(1);
  for (let i = 0; i < 100; i++) expect(r()).toBeGreaterThanOrEqual(0);
});

test("same seed, same lesson; other seeds vary the order", () => {
  expect(buildLesson(unit, 0, opts(42))).toEqual(buildLesson(unit, 0, opts(42)));
  const orders = new Set();
  for (let seed = 1; seed < 20; seed++) orders.add(buildLesson(unit, 0, opts(seed)).steps.map((s) => s.target?.id).join(","));
  expect(orders.size).toBeGreaterThan(1);
});

test("lesson starts with an intro of the new items, then one step per exercise", () => {
  const l = buildLesson(unit, 0, opts());
  expect(l.steps[0]).toMatchObject({ type: "intro", itemIds: ["one", "two", "three"] });
  expect(questionSteps(l)).toHaveLength(5);
  expect(l).toMatchObject({ id: "counting-1-5-1", unitId: "counting-1-5", subjectId: "numbers", kind: "lesson", level: 2 });
});

test("review-only lessons have no intro", () => {
  expect(buildLesson(unit, 1, opts()).steps[0].type).not.toBe("intro");
});

test("every focus item is asked about at least once", () => {
  for (let seed = 1; seed < 30; seed++) {
    const asked = new Set(buildLesson(unit, 0, opts(seed)).steps.flatMap((s) => (s.type === "intro" ? [] : s.itemIds)));
    for (const f of ["one", "two", "three"]) expect(asked.has(f)).toBe(true);
  }
});

test("options include the answer, have no duplicates, and only use introduced items when possible", () => {
  for (let seed = 1; seed < 40; seed++) {
    const l = buildLesson(unit, 0, opts(seed));
    for (const s of l.steps.filter((s) => ["listen-tap", "name-it", "count"].includes(s.type))) {
      const ids = s.options.map((o) => o.id);
      expect(ids).toContain(s.target.id);
      expect(new Set(ids).size).toBe(ids.length);
      ids.forEach((id) => expect(["one", "two", "three"]).toContain(id));
    }
  }
});

test("difficulty level changes the number of options", () => {
  const cfg = { type: "listen-tap", choices: 3 };
  expect(optionCount(cfg, 1, 5)).toBe(2);
  expect(optionCount(cfg, 2, 5)).toBe(3);
  expect(optionCount(cfg, 3, 5)).toBe(4);
  expect(optionCount({ type: "listen-tap" }, 3, 3)).toBe(3); // capped by items available
  expect(optionCount({ type: "listen-tap", choices: 2 }, 1, 5)).toBe(2); // never below 2
});

test("introduced items grow lesson by lesson", () => {
  expect(introducedUpTo(unit, 0).map((i) => i.id)).toEqual(["one", "two", "three"]);
  expect(introducedUpTo(unit, 2).map((i) => i.id)).toEqual(["one", "two", "three", "four", "five"]);
});

test("count, compare, sequence and odd-one-out produce answerable specs", () => {
  for (let seed = 1; seed < 30; seed++) {
    const l = buildLesson(unit, 2, opts(seed, 3));
    const seq = l.steps.find((s) => s.type === "sequence");
    expect(seq.items.map((i) => i.number)).toEqual([...seq.items.map((i) => i.number)].sort((a, b) => a - b));
    expect(seq.options).toHaveLength(seq.items.length);
    const odd = l.steps.find((s) => s.type === "odd-one-out");
    const counts = odd.extra.groups.map((g) => g.count);
    expect(counts.filter((c) => c === odd.target.number)).toHaveLength(1);
    expect(odd.extra.groups.find((g) => g.id === "odd").count).toBe(odd.target.number);
  }
  const l2 = buildLesson(unit, 1, opts(5));
  const cmp = l2.steps.find((s) => s.type === "compare");
  const [a, b] = cmp.options;
  expect(a.number).not.toBe(b.number);
  const bigger = a.number > b.number ? a : b;
  expect(cmp.target.id).toBe(cmp.extra.ask === "more" ? bigger.id : (bigger === a ? b : a).id);
  const count = l2.steps.find((s) => s.type === "count");
  expect(count.extra.emoji).toBeTruthy();
});

test("seedlings are only asked which has more", () => {
  for (let seed = 1; seed < 20; seed++) {
    const cmp = buildExercise({ type: "compare" }, { id: "x", next: () => unit.items[1], pool: unit.items, all: unit.items, level: 2, band: "seedling", r: rng(seed) });
    expect(cmp.extra.ask).toBe("more");
  }
});

test("number-only exercises fall back to listen-tap for word units", () => {
  const l = buildLesson(words, 0, opts());
  expect(questionSteps(l).map((s) => s.type)).toEqual(["listen-tap", "listen-tap", "match"]);
});

test("unknown exercise types are rejected; every Sprint 1 type is buildable", () => {
  const ctx = { id: "x", next: () => unit.items[2], pool: unit.items, all: unit.items, level: 2, band: "sprout", r: rng(3) };
  expect(() => buildExercise({ type: "juggle" }, ctx)).toThrow(/Unknown exercise type/);
  const numberTypes = EXERCISE_TYPES.filter((t) => !["sort", "case-match", "build-word"].includes(t));
  for (const t of numberTypes) expect(buildExercise({ type: t }, { ...ctx, r: rng(3) }).type).toBe(t);
  // letter and category types need letters or groups; with numbers they fall back to listen-tap
  for (const t of ["sort", "case-match", "build-word"]) expect(buildExercise({ type: t }, { ...ctx, r: rng(3) }).type).toBe("listen-tap");
});

test("trophy mixes the unit's exercise types across all items", () => {
  const t = buildTrophy(unit, opts(9));
  expect(t).toMatchObject({ id: "counting-1-5-trophy", kind: "trophy" });
  expect(t.steps).toHaveLength(6);
  expect(new Set(t.steps.map((s) => s.type)).size).toBeGreaterThan(2);
  expect(t.steps.some((s) => s.type === "intro")).toBe(false);
});

test("review practises the due items", () => {
  const rv = buildReview([unit], ["four", "two", "missing"], opts(4));
  expect(rv.kind).toBe("review");
  expect(rv.steps).toHaveLength(2);
  expect(rv.steps.flatMap((s) => s.itemIds)).toEqual(expect.arrayContaining(["four", "two"]));
  expect(buildReview([unit], [], opts())).toBeNull();
  expect(() => buildLesson(unit, 9, opts())).toThrow(RangeError);
});
