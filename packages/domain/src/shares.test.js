import {
  REPORT_THRESHOLD,
  facesWorthAsking,
  formatShareCode,
  moderationQueue,
  needsReview,
  normaliseShareCode,
  packageMedia,
  portableRule,
  scanVerdict,
  shareExpired,
  sharePackage,
  shareProblems,
  validShareCode,
} from "./index.js";

const lesson = {
  id: "L1",
  title: "Our Farm",
  template: "learn",
  assigned: ["zawadi", "leo"],
  version: 3,
  updated_at: "2026-11-01T00:00:00Z",
  progress: { zawadi: 3 },
  cards: [
    { id: "c1", label: "Cow", emoji: "🐄", photo: "P1", voice: "V1", learnerId: "zawadi" },
    { id: "c2", label: "Hen", photo: "P2" },
  ],
  options: { band: "sprout", hints: "light", learner: "zawadi" },
};

describe("share codes", () => {
  test("shown with a dash, typed either way", () => {
    expect(formatShareCode("abcdef")).toBe("ABC-DEF");
    expect(normaliseShareCode("abc-def")).toBe("ABCDEF");
    expect(validShareCode("ABC-DEF")).toBe(true);
    expect(validShareCode("ABC-DE0")).toBe(false);
  });
  test("expire after their 30 days", () => {
    expect(shareExpired({ expires_at: "2026-01-01T00:00:00Z" }, Date.parse("2026-02-01"))).toBe(true);
    expect(shareExpired({ expires_at: "2026-03-01T00:00:00Z" }, Date.parse("2026-02-01"))).toBe(false);
  });
  test("the threshold is three families", () => expect(REPORT_THRESHOLD).toBe(3));
});

describe("SHR-04 the package holds no child data", () => {
  test("a lesson keeps cards, template and settings only", () => {
    const pkg = sharePackage({ kind: "lesson", lessons: [lesson] });
    const text = JSON.stringify(pkg);
    for (const bad of ["zawadi", "leo", "assigned", "progress", "learner", "updated_at", "version", "L1"])
      expect(text).not.toContain(bad);
    expect(pkg.lessons[0]).toEqual({
      title: "Our Farm",
      template: "learn",
      cards: [
        { id: "c1", label: "Cow", emoji: "🐄", photo: "P1" },
        { id: "c2", label: "Hen", photo: "P2" },
      ],
      options: { band: "sprout", hints: "light" },
    });
  });
  test("voice clips only when ticked, removed photos left out", () => {
    const pkg = sharePackage({ kind: "lesson", lessons: [lesson] }, { voice: true, removed: ["P2"] });
    expect(pkg.lessons[0].cards).toEqual([
      { id: "c1", label: "Cow", emoji: "🐄", photo: "P1", voice: "V1" },
      { id: "c2", label: "Hen" },
    ]);
    expect(packageMedia(pkg)).toEqual({ photos: ["P1"], voices: ["V1"] });
    expect(needsReview(pkg)).toBe(true);
    expect(needsReview(sharePackage({ kind: "lesson", lessons: [{ ...lesson, cards: [{ id: "a", label: "A" }] }] }))).toBe(false);
  });
  test("badges travel without their audience, and lesson rules can't", () => {
    const pkg = sharePackage({
      kind: "badges",
      badges: [
        { id: "B1", name: "Farm star", shape: "circle", colour: "green", icon: "plant", rule: { type: "lesson", lesson: "L1" }, treasures: 20, audience: ["zawadi"], note: "Well done", voice: "V9" },
        { id: "B2", name: "Reader", shape: "square", colour: "blue", icon: "book", rule: { type: "combo", op: "and", all: [{ type: "lesson", lesson: "L1" }, { type: "count", metric: "stars", n: 5 }] }, treasures: 10, audience: "class" },
      ],
    });
    expect(JSON.stringify(pkg)).not.toMatch(/zawadi|audience|B1|L1/);
    expect(pkg.badges[0]).toEqual({ name: "Farm star", design: { shape: "circle", colour: "green", icon: "plant" }, rule: { type: "manual" }, treasures: 20, note: "Well done" });
    expect(pkg.badges[1].rule).toEqual({ type: "count", metric: "stars", n: 5 });
  });
  test("portable rules", () => {
    const streak = { type: "streak", days: 3 };
    expect(portableRule(streak)).toBe(streak);
    expect(portableRule({ type: "mastery", lesson: "L1" })).toEqual({ type: "manual" });
    const both = { type: "combo", op: "or", all: [streak, { type: "count", metric: "stars", n: 2 }] };
    expect(portableRule(both)).toEqual(both);
  });
});

describe("SHR-03 the checklist", () => {
  test("needs 'No names or addresses' and an answer for every face", () => {
    expect(shareProblems({}, [])).toEqual(["noNames"]);
    expect(shareProblems({ noNames: true }, ["P1"])).toEqual(["faces"]);
    expect(shareProblems({ noNames: true, notChild: ["P1"] }, ["P1", "P2"])).toEqual(["faces"]);
    expect(shareProblems({ noNames: true, notChild: ["P1"], removed: ["P2"] }, ["P1", "P2"])).toEqual([]);
  });
  test("only clear faces are asked about", () => {
    const size = { width: 720, height: 720 };
    expect(facesWorthAsking([{ score: 0.9, box: { width: 200, height: 200 } }], size)).toBe(1);
    expect(facesWorthAsking([{ score: 0.4, box: { width: 200, height: 200 } }], size)).toBe(0);
    expect(facesWorthAsking([{ score: 0.9, box: { width: 20, height: 20 } }], size)).toBe(0);
  });
});

describe("SAF-08 the image check", () => {
  test("flags likely nudity", () => {
    const p = (porn, sexy = 0.01) => [
      { className: "Neutral", probability: 1 - porn - sexy },
      { className: "Porn", probability: porn },
      { className: "Sexy", probability: sexy },
    ];
    expect(scanVerdict(p(0.01))).toMatchObject({ flagged: false, reason: null });
    expect(scanVerdict(p(0.7))).toMatchObject({ flagged: true, reason: "nudity" });
    expect(scanVerdict(p(0.05, 0.65)).flagged).toBe(true);
    expect(scanVerdict(p(0.05, 0.3)).scores.sexy).toBe(0.3);
  });
});

describe("MOD-01 the queue", () => {
  test("open items, oldest first, overdue after 24 hours", () => {
    const now = Date.parse("2026-11-21T12:00:00Z");
    const q = moderationQueue(
      [
        { id: "b", status: "open", created_at: "2026-11-21T10:00:00Z" },
        { id: "a", status: "open", created_at: "2026-11-19T10:00:00Z" },
        { id: "c", status: "closed", created_at: "2026-11-18T10:00:00Z" },
      ],
      now,
    );
    expect(q.map((i) => [i.id, i.overdue])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });
});
