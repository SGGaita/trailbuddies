// Sprint 3 exercise generators, checked against the real starter units.
import letters from "../../content/src/units/language/letters-a-e.json" with { type: "json" };
import animals from "../../content/src/units/animals/where-animals-live.json" with { type: "json" };
import counting from "../../content/src/units/numbers/counting-1-5.json" with { type: "json" };
import { buildLesson, buildTrophy, buildExercise, questionSteps } from "./lesson.js";
import { rng } from "./random.js";

const opts = (level = 2, seed = 1) => ({ level, band: "sprout", r: rng(seed) });
const types = (lesson) => questionSteps(lesson).map((s) => s.type);

test("letter lessons use case-match with capital and small letters", () => {
  for (let seed = 1; seed < 30; seed++) {
    const l = buildLesson(letters, 1, opts(2, seed));
    expect(types(l)).toEqual(["listen-tap", "case-match", "listen-tap", "match", "case-match"]);
    const cm = l.steps.find((s) => s.type === "case-match");
    expect(cm.items.length).toBeGreaterThanOrEqual(3);
    expect(cm.items.every((i) => typeof i.letter === "string" && i.label === i.letter.toUpperCase())).toBe(
      true,
    );
    expect([...cm.options].sort((a, b) => (a.id < b.id ? -1 : 1))).toEqual(
      [...cm.items].sort((a, b) => (a.id < b.id ? -1 : 1)),
    );
    // listen-tap never mixes words into letter choices
    for (const s of l.steps.filter((x) => x.type === "listen-tap"))
      expect(s.options.every((o) => o.letter)).toBe(true);
  }
});

test("build a word: the word's letters plus spare letters by level", () => {
  for (const level of [1, 2, 3]) {
    const l = buildLesson(letters, 3, opts(level, level));
    const bw = l.steps.filter((s) => s.type === "build-word");
    expect(bw).toHaveLength(3);
    for (const s of bw) {
      expect(s.items.map((t) => t.letter).join("")).toBe(s.target.label);
      expect(s.options).toHaveLength(s.items.length + Math.min(2, level - 1));
      expect(new Set(s.options.map((o) => o.id)).size).toBe(s.options.length); // "bee" has two e tiles
    }
  }
});

test("sort: 2 baskets at level 1, 3 above, every item has a basket", () => {
  const l1 = buildLesson(animals, 2, opts(1, 3)).steps.find((s) => s.type === "sort");
  expect(l1.bins).toHaveLength(2);
  const l3 = buildLesson(animals, 3, opts(3, 3)).steps.find((s) => s.type === "sort");
  expect(l3.bins).toHaveLength(3);
  for (const s of [l1, l3]) {
    expect(s.items.length).toBeGreaterThanOrEqual(s.bins.length);
    expect(s.items.every((i) => s.bins.some((b) => b.id === i.bin))).toBe(true);
    for (const b of s.bins) expect(s.items.some((i) => i.bin === b.id)).toBe(true);
  }
  // lesson 2 has only land and water so far: sort uses those
  const two = buildLesson(animals, 1, opts(3, 9)).steps.find((s) => s.type === "sort");
  expect(two.bins.map((b) => b.id).sort()).toEqual(["land", "water"]);
});

test("odd one out by category, with the buddy's reason", () => {
  for (let seed = 1; seed < 20; seed++) {
    const s = buildLesson(animals, 3, opts(2, seed)).steps.find((x) => x.type === "odd-one-out");
    expect(s.extra.mode).toBe("category");
    expect(s.options).toHaveLength(4);
    const odd = s.options.find((o) => o.id === s.extra.answer);
    const bin = (it) => it.tags[0];
    expect(s.options.filter((o) => bin(o) === bin(odd))).toHaveLength(1);
    expect(s.explain).toMatchObject({ event: "lesson.explain-odd" });
    expect(s.explain.vars.odd).toBe(odd.label);
  }
});

test("compare and number odd-one-out explain themselves", () => {
  const lesson = buildLesson(counting, 1, opts(2, 4));
  const cmp = lesson.steps.find((s) => s.type === "compare");
  expect(cmp.explain.vars.big).toBeGreaterThan(cmp.explain.vars.small);
  expect([cmp.explain.vars.a, cmp.explain.vars.b]).toEqual(cmp.options.map((o) => o.number));
  const odd = buildExercise(
    { type: "odd-one-out" },
    {
      id: "x",
      next: () => counting.items[1],
      pool: counting.items,
      all: counting.items,
      level: 2,
      band: "sprout",
      r: rng(2),
    },
  );
  expect(odd.explain.event).toBe("lesson.explain-odd-number");
});

test("trophies for the new units mix their exercise types", () => {
  const t = buildTrophy(letters, opts(2, 5));
  expect(new Set(types(t))).toEqual(new Set(["listen-tap", "case-match", "match", "build-word"]));
  expect(types(buildTrophy(animals, opts(2, 5)))).toContain("sort");
});
