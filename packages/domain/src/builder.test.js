import {
  templateProblem,
  normaliseLesson,
  nextVersion,
  buildCustomLesson,
  customUnit,
  groupsOf,
  lessonsFor,
  customId,
  isCustomId,
  mediaProblem,
  squareCrop,
  trimSilence,
  uploadPlan,
  afterAttempt,
  retryDelay,
  AUTO_TRIES,
  hardItems,
  tipFor,
  recentLessons,
  weekSummary,
  rng,
  questionSteps,
} from "./index.js";

const card = (id, label, extra = {}) => ({ id, label, ...extra });
const pets = [
  card("k1", "Simba the dog", { emoji: "🐕", group: "Pets" }),
  card("k2", "Daisy the cow", { photo: "m1", voice: "v1", group: "Farm" }),
  card("k3", "Kuku the hen", { emoji: "🐔", group: "farm" }),
  card("k4", "Nemo the fish", { emoji: "🐟", group: "Pets" }),
  card("k5", "Tom the cat", { emoji: "🐈", group: "Pets" }),
  card("k6", "Bessie the goat", { emoji: "🐐", group: "Farm" }),
];
const lesson = (over = {}) =>
  normaliseLesson({
    id: "L1",
    title: "Our Pets",
    template: "learn",
    cards: pets,
    assigned: ["zawadi"],
    ...over,
  });

describe("templates (BLD-04)", () => {
  test("every template needs at least 3 cards", () => {
    expect(templateProblem(pets.slice(0, 2), "learn")).toEqual({ need: "cards", n: 1 });
    expect(templateProblem(pets.slice(0, 3), "learn")).toBeNull();
  });
  test("sort needs 2+ groups, and a group on every card", () => {
    const one = pets.map((c) => ({ ...c, group: "Pets" }));
    expect(templateProblem(one, "sort")).toEqual({ need: "groups", n: 1 });
    const gap = [...pets.slice(0, 4), card("k9", "Ball")];
    expect(templateProblem(gap, "sort")).toEqual({ need: "group-each", n: 1 });
    expect(templateProblem(pets, "sort")).toBeNull();
  });
  test("groups are matched without caring about capitals", () => {
    expect(groupsOf(pets)).toEqual(["Pets", "Farm"]);
  });
  test("picture puzzle needs a photo", () => {
    expect(
      templateProblem(
        pets.filter((c) => !c.photo),
        "puzzle",
      ),
    ).toEqual({ need: "photo", n: 1 });
    expect(templateProblem(pets, "puzzle")).toBeNull();
  });
});

describe("normalising and versions (BLD-09)", () => {
  test("text is trimmed and capped; empty cards and duplicate ids dropped", () => {
    const l = normaliseLesson({
      id: "L",
      title: "  ",
      template: "nope",
      cards: [card("a", "  Big   dog "), card("a", "again"), card("b", "   "), card("c", "x".repeat(60))],
    });
    expect(l.title).toBe("My lesson");
    expect(l.template).toBe("learn");
    expect(l.cards.map((c) => c.id)).toEqual(["a", "c"]);
    expect(l.cards[0].label).toBe("Big dog");
    expect(l.cards[1].label).toHaveLength(40);
  });
  test("at most 12 cards", () => {
    const many = Array.from({ length: 15 }, (_, i) => card(`c${i}`, `Card ${i}`));
    expect(normaliseLesson({ id: "L", cards: many }).cards).toHaveLength(12);
  });
  test("a puzzle gets a default question and the first photo card", () => {
    const l = lesson({ template: "puzzle" });
    expect(l.question).toBe("What is this?");
    expect(l.puzzleCard).toBe("k2");
  });
  test("adding cards keeps the old ids and bumps the version", () => {
    const before = lesson();
    const after = normaliseLesson({
      ...before,
      cards: [...before.cards, card("k7", "Polly"), card("k8", "Bobo")],
    });
    expect(after.cards.slice(0, 6).map((c) => c.id)).toEqual(before.cards.map((c) => c.id));
    expect(nextVersion(before, after)).toBe(2);
    expect(nextVersion(before, normaliseLesson({ ...before, assigned: ["amani"] }))).toBe(1);
  });
});

describe("generated lessons", () => {
  const opts = (seed = 1) => ({ level: 2, band: "sprout", r: rng(seed) });
  test("'Learn the names': explore, then listen & tap, match, name it", () => {
    const g = buildCustomLesson(lesson(), opts());
    expect(g.id).toBe("custom-L1");
    expect(g.kind).toBe("custom");
    expect(g.steps.map((s) => s.type)).toEqual([
      "intro",
      "listen-tap",
      "listen-tap",
      "match",
      "name-it",
      "name-it",
    ]);
    // Every question uses only this lesson's cards, by their stable ids.
    const ids = new Set(pets.map((c) => c.id));
    questionSteps(g).forEach((s) => s.itemIds.forEach((id) => expect(ids.has(id)).toBe(true)));
  });
  test("cards keep their photo and voice on the item", () => {
    const daisy = customUnit(lesson()).items.find((i) => i.id === "k2");
    expect(daisy).toMatchObject({ photo: "m1", voice: "v1", say: "Daisy the cow" });
  });
  test("'Sort them' sorts by the grown-up's groups", () => {
    const g = buildCustomLesson(lesson({ template: "sort" }), opts(3));
    const sort = g.steps.find((s) => s.type === "sort");
    expect(sort.bins.map((b) => b.label).sort()).toEqual(["Farm", "Pets"]);
    sort.items.forEach((it) => expect(sort.bins.map((b) => b.id)).toContain(it.bin));
  });
  test("'Picture puzzle': a jigsaw of the photo, then the question with picture choices", () => {
    const g = buildCustomLesson(lesson({ template: "puzzle", question: "Who is this?" }), opts());
    expect(g.steps.map((s) => s.type)).toEqual(["jigsaw", "listen-tap"]);
    expect(g.steps[0].target.photo).toBe("m1");
    const ask = g.steps[1];
    expect(ask.prompt).toBe("Who is this?");
    expect(ask.options.map((o) => o.id)).toContain("k2");
    expect(ask.options.length).toBeGreaterThanOrEqual(2);
    expect(g.steps[0].extra.side).toBe(3);
    expect(
      buildCustomLesson(lesson({ template: "puzzle" }), { ...opts(), band: "seedling" }).steps[0].extra.side,
    ).toBe(2);
  });
  test("ids and assignment", () => {
    expect(customId("x")).toBe("custom-x");
    expect(isCustomId("custom-x")).toBe(true);
    expect(isCustomId("counting-1-5-1")).toBe(false);
    const ls = [
      lesson(),
      { ...lesson(), id: "L2", assigned: ["amani"] },
      { ...lesson(), id: "L3", deleted: true },
    ];
    expect(lessonsFor(ls, "zawadi").map((l) => l.id)).toEqual(["L1"]);
  });
});

describe("media (BLD-01, BLD-15, BLD-16)", () => {
  test("only small photos and clips of the right type", () => {
    expect(mediaProblem("photo", "image/jpeg", 300_000)).toBeNull();
    expect(mediaProblem("photo", "image/gif", 300_000)).toBe("type");
    expect(mediaProblem("photo", "image/jpeg", 5_000_000)).toBe("size");
    expect(mediaProblem("voice", "audio/wav;codecs=1", 100_000)).toBeNull();
    expect(mediaProblem("voice", "audio/wav", 0)).toBe("empty");
    expect(mediaProblem("video", "video/mp4", 10)).toBe("kind");
  });
  test("photos are cropped to the centre square and never scaled up", () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, s: 3000, out: 720 });
    expect(squareCrop(300, 500)).toEqual({ sx: 0, sy: 100, s: 300, out: 300 });
  });
  test("silence is trimmed from both ends and clips are capped at 10 s", () => {
    const rate = 1000;
    const s = new Float32Array(3000);
    for (let i = 1000; i < 1500; i++) s[i] = 0.5;
    expect(trimSilence(s, rate)).toEqual({ start: 880, end: 1620 });
    expect(trimSilence(new Float32Array(2000), rate)).toBeNull();
    const long = new Float32Array(15_000).fill(0.4);
    const t = trimSilence(long, rate);
    expect(t.end - t.start).toBe(10_000);
  });
  test("uploads retry with back-off, then wait for Retry after 3 failures", () => {
    const now = 1_000_000;
    let e = { id: "m1", state: "local", attempts: 0 };
    expect(uploadPlan([e], now).due).toEqual(["m1"]);
    e = afterAttempt(e, "error", now);
    expect(e.nextAt).toBe(now + retryDelay(1));
    expect(uploadPlan([e], now).due).toEqual([]);
    expect(uploadPlan([e], now + 5_000).due).toEqual(["m1"]);
    e = afterAttempt(afterAttempt(e, "error", now), "error", now);
    expect(e.attempts).toBe(AUTO_TRIES);
    const later = uploadPlan([e, { id: "m2", state: "local", attempts: 3 }], now + 10_000_000);
    expect(later).toEqual({ waiting: 2, failed: 2, due: [] });
    expect(uploadPlan([e], now, { retry: true }).due).toEqual(["m1"]);
    expect(afterAttempt(e, "ok", now).state).toBe("uploaded");
    expect(afterAttempt(e, "rejected", now).state).toBe("rejected");
    expect(retryDelay(10)).toBe(600_000);
  });
});

describe("grown-up views (PAR-01, PAR-02)", () => {
  test("hard items: seen twice or more, under 70%, hardest first", () => {
    const m = {
      one: { seen: 4, firstTry: 4, mastered: true },
      two: { seen: 5, firstTry: 1, mastered: false },
      three: { seen: 4, firstTry: 2, mastered: false },
      four: { seen: 1, firstTry: 0, mastered: false },
      five: { seen: 3, firstTry: 3, mastered: false },
    };
    const hard = hardItems(m);
    expect(hard.map((h) => h.itemId)).toEqual(["two", "three"]);
    expect(hard[0]).toEqual({ itemId: "two", right: 1, total: 5, pct: 20 });
    expect(tipFor(hard[0])).toBe("practise");
    expect(tipFor(hard[1])).toBe("spot");
  });
  test("recent lessons, newest first, and the week in numbers", () => {
    const now = new Date(2030, 5, 15, 12);
    const day = (d) => new Date(2030, 5, 15 - d, 9).getTime();
    const results = [
      { lessonId: "a", kind: "lesson", stars: 2, at: day(8), durationSec: 600 },
      { lessonId: "b", kind: "lesson", stars: 3, at: day(2), durationSec: 300 },
      { lessonId: "c", kind: "review", stars: 1, at: day(0), durationSec: 120 },
    ];
    expect(recentLessons(results, 2).map((r) => r.lessonId)).toEqual(["c", "b"]);
    expect(weekSummary(results, now)).toEqual({ minutes: 7, lessons: 2, stars: 4 });
  });
});
