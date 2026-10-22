import { validate, unitChecks, matchesCatalogue, unapprovedAssets, KINDS } from "./index.js";

const item = (id, extra = {}) => ({ id, label: id, ...extra });
const unit = (over = {}) => ({
  schema: "unit/1",
  id: "test-unit",
  subject: "numbers",
  title: "Test unit",
  band: "seedling",
  status: "ready",
  items: [item("one", { number: 1 }), item("two", { number: 2 }), item("three", { number: 3 })],
  lessons: [
    {
      id: "test-unit-1",
      title: "One and two",
      focus: ["one", "two"],
      exercises: [{ type: "listen-tap" }, { type: "count" }, { type: "match" }],
    },
    {
      id: "test-unit-2",
      title: "Three",
      focus: ["three"],
      review: ["one"],
      exercises: [{ type: "listen-tap", choices: 3 }, { type: "count" }, { type: "compare" }],
    },
  ],
  checkpoint: { review: 4, game: "jigsaw" },
  ...over,
});

test("knows every kind", () => {
  expect(KINDS).toEqual(
    expect.arrayContaining(["unit", "catalogue", "badge", "buddy-script", "assets", "item"]),
  );
});

test("a well-formed unit is valid", () => {
  expect(validate("unit", unit())).toEqual({ valid: true, errors: [] });
});

test("schema errors are readable", () => {
  const r = validate("unit", unit({ band: "toddler" }));
  expect(r.valid).toBe(false);
  expect(r.errors.join(" ")).toMatch(/band/);
});

test("lesson focus items must exist and every item must be taught", () => {
  const u = unit();
  u.lessons[1].focus = ["four"];
  const errs = unitChecks(u);
  expect(errs).toContain('lesson "test-unit-2": focus item "four" is not in items');
  expect(errs.some((e) => e.includes("never introduced"))).toBe(true);
});

test("review items must already have been introduced", () => {
  const u = unit();
  u.lessons[0].review = ["three"];
  expect(unitChecks(u)).toContain(`lesson "test-unit-1": review item "three" hasn't been introduced yet`);
});

test("lesson ids must be prefixed and unique; choices can't exceed items", () => {
  const u = unit();
  u.lessons[1].id = "test-unit-1";
  u.lessons[1].exercises[0].choices = 6;
  const errs = unitChecks(u);
  expect(errs).toContain('lesson id "test-unit-1" is used twice');
  expect(errs.some((e) => e.includes("6 choices"))).toBe(true);
});

test("unit must match its catalogue entry", () => {
  const cat = {
    schema: "catalogue/1",
    subjects: [
      {
        id: "numbers",
        name: "Numbers",
        place: "Numbers Mountain",
        island: "numbers",
        units: [{ id: "test-unit", title: "Test unit", band: "seedling", status: "ready", lessons: 3 }],
      },
    ],
  };
  expect(validate("catalogue", cat).valid).toBe(true);
  expect(matchesCatalogue(unit(), cat)).toEqual(['unit "test-unit": 2 lessons but catalogue says 3']);
});

test("badge rules: combos nest, unknown types fail", () => {
  const good = {
    id: "garden-helper",
    name: "Garden Helper",
    how: "Help in the garden",
    rule: { type: "combo", op: "and", all: [{ type: "manual" }, { type: "count", metric: "stars", n: 50 }] },
  };
  expect(validate("badge", good).valid).toBe(true);
  expect(validate("badge", { ...good, rule: { type: "magic" } }).valid).toBe(false);
});

test("buddy script event names and asset review gate", () => {
  expect(
    validate("buddy-script", {
      schema: "buddy-script/1",
      buddy: "all",
      lang: "en",
      events: { "greet.first": ["Hi!"] },
    }).valid,
  ).toBe(true);
  expect(
    validate("buddy-script", {
      schema: "buddy-script/1",
      buddy: "all",
      lang: "en",
      events: { "Greet!": ["Hi"] },
    }).valid,
  ).toBe(false);
  const m = {
    schema: "assets/1",
    assets: [
      {
        id: "cow",
        kind: "image",
        path: "img/cow.webp",
        source: "ai-assisted",
        license: "own",
        review_status: "draft",
      },
    ],
  };
  expect(validate("assets", m).valid).toBe(true);
  expect(unapprovedAssets(m)).toEqual(['asset "cow" is draft']);
});
