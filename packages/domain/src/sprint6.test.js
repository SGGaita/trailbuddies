import {
  answer,
  startLadder,
  settingFor,
  effectiveLevel,
  breakDue,
  minutesSinceBreak,
  STRETCH_MOVES,
  countryRules,
  consentChanges,
  formatDate,
  deviceCheck,
  deviceLimit,
  deviceName,
  packPlan,
  activeSubjects,
  unusedPacks,
  layoutTrail,
  skippedUnits,
  placementQuestions,
  MAX_QUESTIONS,
  SHORTCUTS,
  normaliseLesson,
  normaliseOptions,
  activityTypes,
  buildCustomLesson,
  rng,
} from "./index.js";

describe("ADP-02 lock a subject's level", () => {
  test("a per-subject lock wins, then the learner setting, then auto", () => {
    const amani = { difficulty: "auto", levels: { numbers: "1" } };
    expect(settingFor(amani, "numbers")).toBe("1");
    expect(settingFor(amani, "language")).toBe("auto");
    expect(settingFor({ difficulty: "3" }, "numbers")).toBe("3");
    expect(settingFor({ difficulty: "bogus", levels: { numbers: "9" } }, "numbers")).toBe("auto");
  });
  test("a locked level no longer adjusts, whatever the results", () => {
    const amani = { difficulty: "auto", levels: { numbers: "1" } };
    expect(effectiveLevel(settingFor(amani, "numbers"), "seedling", [3, 3, 3, 3])).toBe(1);
    expect(effectiveLevel(settingFor(amani, "language"), "seedling", [3, 3, 3, 3])).toBe(3);
  });
});

describe("BLD-06 hint settings", () => {
  test("light: repeat twice, then reveal; never removes a choice", () => {
    let s = startLadder();
    const effects = [];
    for (let i = 0; i < 3; i++) {
      const r = answer(s, false, { wrongOptionIds: ["x", "y"], hints: "light" });
      effects.push(r.effect);
      s = r.state;
    }
    expect(effects).toEqual(["repeat", "repeat", "reveal"]);
    expect(s.removed).toEqual([]);
  });
  test("none: try again until the 4th miss", () => {
    let s = startLadder();
    const effects = [];
    for (let i = 0; i < 4; i++) {
      const r = answer(s, false, { hints: "none" });
      effects.push(r.effect);
      s = r.state;
    }
    expect(effects).toEqual(["repeat", "repeat", "repeat", "reveal"]);
  });
  test("full is unchanged", () => {
    const r = answer(answer(startLadder(), false).state, false, { wrongOptionIds: ["x"] });
    expect(r.effect).toBe("eliminate");
  });
});

describe("BLD-03 / BLD-06 custom lessons", () => {
  const cards = [
    { id: "c1", label: "Three cows", emoji: "🐄", number: 3, fact: "Cows give milk.", group: "land" },
    { id: "c2", label: "Two ducks", emoji: "🦆", number: 2, group: "water" },
    { id: "c3", label: "One fish", emoji: "🐟", number: 1, group: "water" },
    { id: "c4", label: "Hen", emoji: "🐔", number: 42, group: "land" },
  ];
  test("keeps fact and a 0-20 number; drops bad numbers", () => {
    const l = normaliseLesson({ id: "L1", title: "Farm", template: "learn", cards });
    expect(l.cards[0]).toMatchObject({ fact: "Cows give milk.", number: 3 });
    expect(l.cards[3].number).toBeUndefined();
  });
  test("options: unknown values are dropped", () => {
    expect(
      normaliseOptions({ band: "seedling", activities: 5, hints: "light", games: ["memory", "chess"] }),
    ).toEqual({
      band: "seedling",
      activities: 5,
      hints: "light",
      games: ["memory"],
    });
    expect(normaliseOptions({ band: "baby", activities: 40, hints: "lots" })).toEqual({});
  });
  test("numbered cards add a counting activity", () => {
    const l = normaliseLesson({ id: "L1", title: "Farm", template: "learn", cards });
    expect(activityTypes(l)).toContain("count");
  });
  test("tags become sort bins (BLD-03 scenario)", () => {
    const l = normaliseLesson({ id: "L1", title: "Where", template: "sort", cards });
    const lesson = buildCustomLesson(l, { level: 2, band: "sprout", r: rng(4) });
    const sort = lesson.steps.find((s) => s.type === "sort");
    expect(sort.bins.map((b) => b.label).sort()).toEqual(["land", "water"]);
  });
  test("Seedling and 5 activities: 2-3 choices and 5 activities (BLD-06 scenario)", () => {
    const l = normaliseLesson({
      id: "L2",
      title: "Seedling",
      template: "learn",
      cards: cards.map(({ number, ...c }) => c),
      options: { band: "seedling", activities: 5 },
    });
    for (let seed = 1; seed < 20; seed++) {
      const lesson = buildCustomLesson(l, { level: 3, band: "explorer", r: rng(seed) });
      const acts = lesson.steps.filter((s) => s.type !== "intro");
      expect(acts).toHaveLength(5);
      for (const s of acts)
        if (s.type === "listen-tap" || s.type === "name-it") expect(s.options.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("PAR-04 break reminders", () => {
  test("off by default; due once enough play has passed since the last break", () => {
    const results = [
      { at: 1000, durationSec: 600 },
      { at: 2000, durationSec: 360 },
    ];
    expect(minutesSinceBreak(results, null)).toBe(16);
    expect(breakDue({}, 16)).toBe(false);
    expect(breakDue({ breaks: 15 }, 16)).toBe(true);
    expect(breakDue({ breaks: 15 }, minutesSinceBreak(results, 1500))).toBe(false);
  });
  test("the stretch is three moves, 30 seconds", () => {
    expect(STRETCH_MOVES.reduce((n, m) => n + m.seconds, 0)).toBe(30);
  });
});

describe("ONB-05 country rules", () => {
  test("formats, seasons and consent region from the country", () => {
    expect(countryRules("ke")).toMatchObject({
      currency: "KES",
      seasons: "east-africa",
      region: "kenya-dpa",
    });
    expect(countryRules("US").region).toBe("us-coppa");
    expect(countryRules("FR")).toMatchObject({ region: "strict", code: "FR" });
    expect(formatDate(Date.UTC(2026, 9, 24), "KE")).toBe("24/10/2026");
    expect(formatDate(Date.UTC(2026, 9, 24), "US")).toBe("10/24/2026");
  });
  test("consent is asked again only when the rules differ", () => {
    expect(consentChanges("KE", "UG")).toBe(true);
    expect(consentChanges("GB", "GB")).toBe(false);
  });
});

describe("FAM-08 devices", () => {
  const d = (id, day) => ({ id, last_seen_at: `2026-10-${day}T10:00:00Z` });
  test("Free 2, Family 6", () => {
    expect(deviceLimit("free")).toBe(2);
    expect(deviceLimit("family")).toBe(6);
  });
  test("one too many suggests the oldest", () => {
    expect(deviceCheck([d("a", 20), d("b", 10), d("c", 22)], "free")).toEqual({ over: 1, oldest: ["b"] });
    expect(deviceCheck([d("a", 20)], "free").over).toBe(0);
  });
  test("device names keep only browser and system", () => {
    expect(deviceName("Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/131.0 Mobile Safari/537.36")).toBe(
      "Chrome on Android",
    );
    expect(
      deviceName("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit Version/18.0 Safari/604.1"),
    ).toBe("Safari on iPad");
  });
});

describe("OFF-02 packs", () => {
  const manifest = {
    release: "2027.03.1",
    channel: "production",
    packs: [
      { subject: "numbers", hash: "n2", bytes: 400_000, units: [] },
      { subject: "animals", hash: "a1", bytes: 300_000, units: [] },
      { subject: "colours", hash: "c1", bytes: 200_000, units: [] },
    ],
  };
  test("active subjects: started first, then favourites", () => {
    expect(
      activeSubjects([{ started: ["numbers"], interests: ["animals"] }, { started: ["colours"] }]),
    ).toEqual(["numbers", "colours", "animals"]);
  });
  test("downloads what's new and fits; reports what doesn't", () => {
    const p = packPlan(manifest, { numbers: "n1", animals: "a1" }, ["numbers", "animals", "colours"], {
      free: 600_000,
    });
    expect(p.download.map((x) => x.subject)).toEqual(["numbers"]);
    expect(p.upToDate).toEqual(["animals"]);
    expect(p.noRoom.map((x) => x.subject)).toEqual(["colours"]);
  });
  test("waits for Wi-Fi unless forced", () => {
    expect(packPlan(manifest, {}, ["numbers"], { wifi: false })).toMatchObject({
      waiting: true,
      download: [],
    });
    expect(packPlan(manifest, {}, ["numbers"], { wifi: false, force: true }).download).toHaveLength(1);
  });
  test("unused packs can be cleared", () => {
    expect(unusedPacks({ numbers: "n1", shapes: "s1" }, ["numbers"])).toEqual(["shapes"]);
  });
});

describe("ADP-05 / ONB-09 placement", () => {
  const unit = (id) => ({ id, title: id, status: "ready", lessonIds: [`${id}-1`, `${id}-2`] });
  test("units before the start show done with bronze stars that aren't real stars", () => {
    const units = [unit("letters-a-e"), unit("letter-sounds-1"), unit("letter-sounds-2")];
    const { nodes, next } = layoutTrail(units, {}, { start: "letter-sounds-1" });
    const first = nodes.filter((n) => n.unitId === "letters-a-e" && n.kind !== "banner");
    expect(first.every((n) => n.state === "done" && n.bronze && n.stars === 1)).toBe(true);
    expect(next.id).toBe("letter-sounds-1-1");
    expect(
      skippedUnits(
        units.map((u) => u.id),
        "letter-sounds-1",
      ),
    ).toEqual(["letters-a-e"]);
  });
  test("'Knows the letters' starts Language at letter sounds", () => {
    expect(SHORTCUTS.find((s) => s.id === "knows-letters")).toMatchObject({
      subject: "language",
      start: "letter-sounds-1",
    });
  });
  test("never more than ten questions", () => {
    const u = (i) => ({
      id: `u${i}`,
      items: [1, 2, 3].map((n) => ({ id: `u${i}-${n}`, label: String(n), number: n, emoji: "⭐" })),
    });
    const qs = placementQuestions(
      Array.from({ length: 8 }, (_, i) => u(i)),
      { level: 2, band: "sprout", r: rng(1) },
    );
    expect(qs.length).toBeLessThanOrEqual(MAX_QUESTIONS);
  });
});
