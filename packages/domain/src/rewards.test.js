import { streakInfo, lessonsByDay, goalDaysWithin } from "./streak.js";
import { badgeStats, newBadges, ruleMet, badgePayout } from "./badges.js";
import { capped, treasuresFor } from "./scoring.js";
import { memoryDeck, memoryCards, jigsawSide, jigsawPieces, gameTopics } from "./games.js";
import { dayKey } from "./buddy.js";
import { rng } from "./random.js";
import badges from "../../content/src/badges/built-in.json" with { type: "json" };
import economy from "../../content/src/economy.json" with { type: "json" };

const NOW = new Date(2026, 9, 23, 12); // Friday
const day = (ago) => dayKey(new Date(2026, 9, 23 - ago));
const days = (...list) => Object.fromEntries(list.map(([ago, n]) => [day(ago), n]));

describe("gentle streak (RWD-08)", () => {
  test("goal days count; today doesn't break it before it's done", () => {
    const s = streakInfo(days([1, 2], [2, 2], [3, 2]), { goal: 2, now: NOW });
    expect(s.days).toBe(3);
    expect(s.week.at(-1).status).toBe("today");
  });
  test("missed days use up to 2 rest days a week and lose nothing", () => {
    // Fri today; Thu missed (rest), Wed goal, Tue missed (rest), Mon goal
    const s = streakInfo(days([2, 2], [4, 3]), { goal: 2, now: NOW });
    expect(s.days).toBe(2);
    expect(s.week.map((d) => d.status).slice(-5)).toEqual(["goal", "rest", "goal", "rest", "today"]);
  });
  test("a third missed day in a week ends the streak; days before a streak are just missed", () => {
    const s = streakInfo(days([4, 2]), { goal: 2, now: NOW }); // Mon only, Tue Wed Thu missed
    expect(s.days).toBe(0);
    expect(s.week.filter((d) => d.status === "rest")).toHaveLength(0);
    expect(streakInfo({}, { goal: 2, now: NOW }).days).toBe(0);
  });
  test("goal days in a window, and per-day counts from results", () => {
    expect(goalDaysWithin(days([0, 2], [1, 1], [2, 2]), { goal: 2, window: 7, now: NOW })).toBe(2);
    expect(lessonsByDay([{ at: NOW.getTime() }, { at: NOW.getTime() }])).toEqual({ [day(0)]: 2 });
  });
});

describe("economy (RWD-03, RWD-09)", () => {
  test("amounts come from the config", () => {
    expect(treasuresFor({ perfect: true, reachedGoal: false }, { ...economy.earn, lesson: 12 })).toBe(17);
  });
  test("the daily cap trims quietly; 0 means no cap", () => {
    expect(capped(25, 90, 100)).toBe(10);
    expect(capped(25, 100, 100)).toBe(0);
    expect(capped(25, 500, 0)).toBe(25);
  });
});

const base = { progress: {}, stars: 0, badges: [], answers: [], results: [], games: [], mastery: {}, byDay: {}, goal: 2, now: NOW };
describe("badge engine (BDG-01, BDG-02)", () => {
  test("15 built-in badges across five categories with tiers", () => {
    expect(badges).toHaveLength(15);
    expect(new Set(badges.map((b) => b.category))).toEqual(new Set(["learning", "mastery", "effort", "consistency", "exploration"]));
    expect(badges.every((b) => b.tier && b.icon && b.how)).toBe(true);
  });
  test("first lesson earns First Steps; already earned badges aren't earned again", () => {
    const s = { ...base, results: [{ kind: "lesson", stars: 2, hints: 0, subjectId: "numbers" }], progress: { "counting-1-5-1": 2 }, stars: 2 };
    expect(newBadges(badges, s).map((b) => b.id)).toEqual(["first-steps"]);
    expect(newBadges(badges, { ...s, badges: ["first-steps"] })).toEqual([]);
  });
  test("ten 3-star lessons earns Perfect Ten (works offline: just state)", () => {
    const progress = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`u-${i + 1}`, 3]));
    expect(newBadges(badges, { ...base, progress, stars: 30, badges: ["first-steps"] }).map((b) => b.id)).toContain("perfect-ten");
  });
  test("effort, comeback, streak, exploration and completion rules", () => {
    const s = {
      ...base,
      results: [
        { kind: "lesson", hints: 4, stars: 1, subjectId: "numbers" },
        { kind: "lesson", hints: 0, stars: 3, subjectId: "language" },
        { kind: "lesson", hints: 0, stars: 3, subjectId: "animals" },
      ],
      answers: [
        { itemId: "two", firstTry: false, at: 1 },
        { itemId: "two", firstTry: true, at: 2 },
        { itemId: "two", firstTry: true, at: 3 },
      ],
      games: [{ game: "memory" }, { game: "jigsaw" }],
      byDay: days([0, 2], [1, 2], [2, 2], [3, 2], [4, 2]),
      progress: { "counting-1-5-trophy": 3, "counting-6-10-trophy": 2 },
    };
    const ids = newBadges(badges, s).map((b) => b.id);
    for (const id of ["never-give-up", "comeback-kid", "week-warrior", "world-traveller", "game-master", "counting-champ"]) expect(ids).toContain(id);
    expect(ids).not.toContain("letter-explorer");
    expect(badgeStats(s).comebacks).toBe(1);
  });
  test("combo and mastery rules; payouts by tier", () => {
    const s = { ...base, mastery: { one: { mastered: true } } };
    expect(ruleMet({ type: "mastery", items: ["one"] }, badgeStats(s), s)).toBe(true);
    expect(ruleMet({ type: "combo", op: "and", all: [{ type: "mastery", items: ["one"] }, { type: "count", metric: "lessons", n: 1 }] }, badgeStats(s), s)).toBe(false);
    expect(badgePayout({ tier: "gold" }, economy.badge)).toBe(50);
  });
});

describe("games (GAM-01, GAM-03, GAM-05)", () => {
  test("card counts by band", () => {
    expect(["seedling", "sprout", "explorer"].map(memoryCards)).toEqual([6, 8, 12]);
    expect(["seedling", "sprout", "voyager"].map(jigsawSide)).toEqual([2, 3, 4]);
  });
  test("a memory deck works from any 6 cards, e.g. a custom lesson", () => {
    const custom = Array.from({ length: 6 }, (_, i) => ({ id: `card${i}`, label: `Card ${i}`, image: `asset-${i}` }));
    const deck = memoryDeck(custom, "explorer", rng(1));
    expect(deck).toHaveLength(12);
    const counts = {};
    deck.forEach((c) => (counts[c.pairId] = (counts[c.pairId] || 0) + 1));
    expect(Object.values(counts).every((n) => n === 2)).toBe(true);
    expect(memoryDeck(custom.slice(0, 2), "explorer", rng(1))).toHaveLength(4); // small sets still work
  });
  test("jigsaw pieces cover the grid once", () => {
    const p = jigsawPieces(3, rng(2));
    expect(new Set(p.map((x) => `${x.row},${x.col}`)).size).toBe(9);
  });
  test("topics open after the unit's first lesson", () => {
    const units = [{ id: "u", title: "U", subject: "s", items: [], lessons: [{ id: "u-1" }, { id: "u-2" }] }];
    expect(gameTopics(units, {})[0]).toMatchObject({ open: false, finished: false });
    expect(gameTopics(units, { "u-1": 1 })[0].open).toBe(true);
  });
});
