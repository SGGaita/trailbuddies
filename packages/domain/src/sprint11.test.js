import { createEvent, deriveState } from "@trailbuddies/sync";
import {
  BADGE_TREASURE_MAX,
  badgeProblems,
  canEarn,
  customCatalogue,
  earnedCustom,
  engineRule,
  manualAward,
  newBadges,
  ruleProblems,
  ruleSummary,
  wishCards,
  wishProblems,
  grownUpQueue,
  waitingCount,
  weekWorkDone,
} from "./index.js";

const lessons = [
  { id: "L1", title: "Week 3 spelling", cards: [{ id: "c1" }, { id: "c2" }] },
  { id: "L2", title: "Our Farm", cards: [{ id: "f1" }] },
];
const family = { kind: "family", lessons, learners: ["zawadi", "leo"] };
const base = {
  id: "B1",
  name: "Garden Helper",
  shape: "circle",
  colour: "green",
  icon: "plant",
  treasures: 20,
  audience: ["zawadi"],
  rule: { type: "manual" },
};
let t = Date.parse("2026-11-20T10:00:00Z");
const ev = (type, data, learner = "zawadi") => createEvent(type, learner, data, new Date((t += 1000)));

describe("badge checks (BST-01…03, BST-06)", () => {
  test("a good badge has no problems", () => {
    expect(badgeProblems(base, family)).toEqual([]);
  });

  test("treasures are capped at 50, with a reason", () => {
    expect(BADGE_TREASURE_MAX).toBe(50);
    expect(badgeProblems({ ...base, treasures: 50 }, family)).toEqual([]);
    expect(badgeProblems({ ...base, treasures: 51 }, family)).toEqual(["treasureCap"]);
    expect(badgeProblems({ ...base, treasures: -1 }, family)).toEqual(["treasures"]);
  });

  test("name, design, reward and who can earn it", () => {
    expect(badgeProblems({ ...base, name: "  " }, family)).toContain("name");
    expect(badgeProblems({ ...base, icon: "nope" }, family)).toContain("design");
    expect(badgeProblems({ ...base, icon: "nope", photo: "M1" }, family)).toEqual([]); // a photo instead of an icon
    expect(badgeProblems({ ...base, reward: "x".repeat(81) }, family)).toContain("reward");
    expect(badgeProblems({ ...base, audience: [] }, family)).toContain("audience");
    expect(badgeProblems({ ...base, audience: ["stranger"] }, family)).toContain("audience");
    // A whole class only works for class badges.
    expect(badgeProblems({ ...base, audience: "class" }, family)).toContain("audience");
    expect(badgeProblems({ ...base, audience: "class" }, { kind: "class", learners: [] })).toEqual([]);
  });

  test("rules: lessons must exist, counts are sensible, combinations have 2 or 3 conditions", () => {
    expect(ruleProblems({ type: "lesson", lesson: "L1" }, family)).toEqual([]);
    expect(ruleProblems({ type: "lesson", lesson: "gone" }, family)).toEqual(["rule.pickLesson"]);
    expect(ruleProblems({ type: "count", metric: "stars", n: 100 }, family)).toEqual([]);
    expect(ruleProblems({ type: "count", metric: "stars", n: 0 }, family)).toEqual(["rule.count"]);
    expect(ruleProblems({ type: "streak", days: 8 }, family)).toEqual(["rule.streak"]);
    expect(ruleProblems({ type: "assignment" }, family)).toEqual(["rule.unknown"]); // teachers only
    expect(ruleProblems({ type: "assignment" }, { kind: "class" })).toEqual([]);
    const two = [{ type: "lesson", lesson: "L1" }, { type: "count", metric: "stars", n: 50 }];
    expect(ruleProblems({ type: "combo", op: "and", all: two }, family)).toEqual([]);
    expect(ruleProblems({ type: "combo", op: "and", all: two.slice(0, 1) }, family)).toEqual(["rule.comboTooFew"]);
    expect(ruleProblems({ type: "combo", op: "or", all: [...two, ...two] }, family)).toEqual(["rule.comboTooMany"]);
    expect(ruleProblems({ type: "combo", op: "or", all: [two[0], { type: "manual" }] }, family)).toEqual(["rule.manualInCombo"]);
    expect(ruleProblems({ type: "combo", op: "or", all: [two[0], { type: "combo", op: "and", all: two }] }, family)).toEqual([
      "rule.nested",
    ]);
  });

  test("a whole-class badge includes children who join later", () => {
    expect(canEarn({ audience: "class" }, "new-joiner")).toBe(true);
    expect(canEarn({ audience: ["a"] }, "b")).toBe(false);
  });
});

describe("plain-English summaries (BST-02)", () => {
  test("each rule reads back before saving", () => {
    expect(ruleSummary({ type: "manual" }, { by: "Ms Priya" })).toBe("Ms Priya awards it.");
    expect(ruleSummary({ type: "manual" })).toBe("A grown-up awards it.");
    expect(ruleSummary({ type: "manual" }, { by: "You" })).toBe("You award it.");
    expect(ruleSummary({ type: "lesson", lesson: "L1" }, { lessons })).toBe("Earned when they finish “Week 3 spelling”.");
    expect(ruleSummary({ type: "mastery", lesson: "L2" }, { lessons })).toBe("Earned when they master every card in “Our Farm”.");
    expect(ruleSummary({ type: "count", metric: "stars", n: 100 })).toBe("Earned when they reach 100 stars.");
    expect(ruleSummary({ type: "count", metric: "lessons", n: 1 })).toBe("Earned when they reach 1 lesson.");
    expect(ruleSummary({ type: "streak", days: 5 })).toBe("Earned when they meet the daily goal on 5 days in a week.");
    expect(ruleSummary({ type: "assignment" })).toBe("Earned when they finish everything assigned this week.");
  });

  test("combinations join with and / or", () => {
    const all = [
      { type: "lesson", lesson: "L1" },
      { type: "count", metric: "stars", n: 50 },
      { type: "streak", days: 3 },
    ];
    expect(ruleSummary({ type: "combo", op: "and", all: all.slice(0, 2) }, { lessons })).toBe(
      "Earned when they finish “Week 3 spelling” and reach 50 stars.",
    );
    expect(ruleSummary({ type: "combo", op: "or", all }, { lessons })).toBe(
      "Earned when they finish “Week 3 spelling”, reach 50 stars, or meet the daily goal on 3 days in a week.",
    );
  });
});

describe("custom badges in the badge engine (BST-02)", () => {
  const state = (over = {}) => ({
    results: [],
    progress: {},
    answers: [],
    games: [],
    badges: [],
    stars: 0,
    mastery: {},
    byDay: {},
    goal: 2,
    now: new Date("2026-11-20T12:00:00Z"),
    ...over,
  });

  test("finishing a custom lesson earns it, only for children who can earn it", () => {
    const b = { ...base, id: "B2", rule: { type: "lesson", lesson: "L1" } };
    expect(engineRule(b.rule)).toEqual({ type: "lessons", ids: ["custom-L1"] });
    const cat = customCatalogue([b, { ...b, id: "B3", audience: ["leo"] }, { ...base }], "zawadi", lessons);
    expect(cat.map((c) => c.id)).toEqual(["B2"]); // not Leo's, and not the manual one
    expect(cat[0]).toMatchObject({ reward: 20, icon: "🌱", custom: { name: "Garden Helper", shape: "circle" } });
    expect(newBadges(cat, state()).map((x) => x.id)).toEqual([]);
    expect(newBadges(cat, state({ progress: { "custom-L1": 2 } })).map((x) => x.id)).toEqual(["B2"]);
    expect(newBadges(cat, state({ progress: { "custom-L1": 2 }, badges: ["B2"] }))).toEqual([]); // once only
  });

  test("mastery of a lesson's cards, and a deleted lesson can never be mastered", () => {
    expect(engineRule({ type: "mastery", lesson: "L1" }, lessons)).toEqual({ type: "mastery", items: ["c1", "c2"] });
    expect(engineRule({ type: "mastery", lesson: "gone" }, lessons)).toEqual({ type: "never" });
    const cat = customCatalogue([{ ...base, rule: { type: "mastery", lesson: "L1" } }], "zawadi", lessons);
    const both = { c1: { mastered: true }, c2: { mastered: true } };
    expect(newBadges(cat, state({ mastery: { c1: { mastered: true } } }))).toEqual([]);
    expect(newBadges(cat, state({ mastery: both })).length).toBe(1);
  });

  test("combinations and the class assignment rule", () => {
    const rule = { type: "combo", op: "and", all: [{ type: "lesson", lesson: "L2" }, { type: "count", metric: "stars", n: 3 }] };
    const cat = customCatalogue([{ ...base, rule }], "zawadi", lessons);
    expect(newBadges(cat, state({ progress: { "custom-L2": 3 }, stars: 2 }))).toEqual([]);
    expect(newBadges(cat, state({ progress: { "custom-L2": 3 }, stars: 3 })).length).toBe(1);
    const cls = customCatalogue([{ ...base, audience: "class", rule: { type: "assignment" } }], "s1");
    expect(newBadges(cls, state())).toEqual([]);
    expect(newBadges(cls, state({ assignmentsDone: true })).length).toBe(1);
  });
});

describe("awards from a grown-up, and badges that can't be taken away (BST-05, BDG-07)", () => {
  test("award once, with the treasures and the design", () => {
    const b = { ...base, reward: "Pick Friday's movie", note: "Thank you!" };
    const a = manualAward(b, "zawadi", []);
    expect(a).toEqual({
      badge: {
        badgeId: "B1",
        name: "Garden Helper",
        manual: true,
        custom: { name: "Garden Helper", shape: "circle", colour: "green", icon: "plant", note: "Thank you!", reward: "Pick Friday's movie" },
      },
      treasures: 20,
    });
    expect(manualAward(b, "zawadi", ["B1"])).toBeNull();
    expect(manualAward(b, "leo", [])).toBeNull(); // not Leo's badge
  });

  test("an earned badge stays after its badge is deleted; hiding it is reversible", () => {
    const a = manualAward(base, "zawadi", []);
    const events = [
      ev("badge_awarded", a.badge),
      ev("treasure_earned", { amount: a.treasures, reason: "badge", badgeId: "B1" }),
      ev("badge_awarded", a.badge), // the same award from a second device
    ];
    let s = deriveState(events, "zawadi");
    expect(s.treasures).toBe(20);
    expect(earnedCustom(s).map((b) => [b.id, b.name, b.manual])).toEqual([["B1", "Garden Helper", true]]);
    s = deriveState([...events, ev("badge_hidden", { badgeId: "B1" })], "zawadi");
    expect(s.badges).toContain("B1"); // still earned
    expect(earnedCustom(s)).toEqual([]); // just not shown
    s = deriveState([...events, ev("badge_hidden", { badgeId: "B1" }), ev("badge_hidden", { badgeId: "B1", hidden: false })], "zawadi");
    expect(earnedCustom(s).length).toBe(1);
  });
});

describe("wishes (BST-07) and real-world rewards (BST-04)", () => {
  const wishes = [
    { id: "W1", learner_id: "zawadi", title: "Bedtime story of my choice", price: 50 },
    { id: "W2", learner_id: "zawadi", title: "Extra park time", price: 150 },
    { id: "W3", learner_id: "leo", title: "Pancakes", price: 20 },
  ];
  const earn = (n) => ev("treasure_earned", { amount: n, reason: "lesson" });

  test("checks", () => {
    expect(wishProblems(wishes[0], ["zawadi"])).toEqual([]);
    expect(wishProblems({ ...wishes[0], title: "" , price: 0, learner_id: "x" }, ["zawadi"])).toEqual(["title", "price", "learner"]);
    expect(wishProblems({ ...wishes[0], price: 1001 }, ["zawadi"])).toEqual(["price"]);
  });

  test("saving up, then asking holds the treasures", () => {
    let s = deriveState([earn(30)], "zawadi");
    let cards = wishCards(wishes, s, "zawadi");
    expect(cards.map((c) => [c.id, c.status, c.percent, c.toGo, c.canAsk])).toEqual([
      ["W1", "open", 60, 20, false],
      ["W2", "open", 20, 120, false],
    ]);
    const e = [earn(30), earn(30)];
    s = deriveState(e, "zawadi");
    expect(wishCards(wishes, s, "zawadi")[0].canAsk).toBe(true);
    const ask = ev("wish_requested", { wishId: "W1", amount: 50 });
    s = deriveState([...e, ask], "zawadi");
    expect(s.treasures).toBe(10);
    cards = wishCards(wishes, s, "zawadi");
    expect(cards[0]).toMatchObject({ id: "W1", status: "asked", percent: 100, canAsk: false, requestId: ask.id });
  });

  test("approve then deliver keeps them spent; 'not now' gives them back and the wish stays", () => {
    const e = [earn(60), ev("wish_requested", { wishId: "W1", amount: 50 })];
    const requestId = e[1].id;
    const approved = deriveState([...e, ev("wish_approved", { wishId: "W1", requestId })], "zawadi");
    expect(approved.wishes.W1.status).toBe("approved");
    const delivered = deriveState(
      [...e, ev("wish_approved", { wishId: "W1", requestId }), ev("wish_delivered", { wishId: "W1", requestId })],
      "zawadi",
    );
    expect(delivered).toMatchObject({ treasures: 10, wishes: { W1: { status: "delivered" } } });
    const declined = deriveState([...e, ev("wish_declined", { wishId: "W1", requestId })], "zawadi");
    expect(declined).toMatchObject({ treasures: 60, wishes: { W1: { status: "open", held: 0 } } });
    // A late answer to an old request does nothing.
    const stale = deriveState([...e, ev("wish_declined", { wishId: "W1", requestId: "old" })], "zawadi");
    expect(stale.treasures).toBe(10);
  });

  test("two devices: asking twice holds once; asking without enough after a merge is refused", () => {
    const e = [earn(60), ev("wish_requested", { wishId: "W1", amount: 50 }), ev("wish_requested", { wishId: "W1", amount: 50 })];
    expect(deriveState(e, "zawadi").treasures).toBe(10);
    const shop = [earn(60), ev("treasure_spent", { amount: 40, itemId: "party" }), ev("wish_requested", { wishId: "W1", amount: 50 })];
    const s = deriveState(shop, "zawadi");
    expect(s.treasures).toBe(20);
    expect(s.refusedWishes.map((r) => r.wishId)).toEqual(["W1"]);
    expect(s.wishes.W1).toBeUndefined();
  });

  test("real-world rewards: earned, waiting to be delivered, then delivered", () => {
    const a = manualAward({ ...base, reward: "Pick Friday's movie" }, "zawadi", []);
    let s = deriveState([ev("badge_awarded", a.badge)], "zawadi");
    expect(wishCards(wishes, s, "zawadi").at(-1)).toMatchObject({ kind: "reward", title: "Pick Friday's movie", badge: "Garden Helper", delivered: false });
    s = deriveState([ev("badge_awarded", a.badge), ev("reward_delivered", { badgeId: "B1" })], "zawadi");
    expect(wishCards(wishes, s, "zawadi").at(-1).delivered).toBe(true);
  });

  test("the grown-up's queue across children", () => {
    const zEvents = [earn(200), ev("wish_requested", { wishId: "W1", amount: 50 }), ev("badge_awarded", manualAward({ ...base, reward: "Movie night" }, "zawadi", []).badge)];
    const lEvents = [earn(50, "leo"), ev("wish_requested", { wishId: "W3", amount: 20 }, "leo")];
    lEvents[0] = ev("treasure_earned", { amount: 50 }, "leo");
    const leo = deriveState(lEvents, "leo");
    const q = grownUpQueue(wishes, [
      { id: "zawadi", name: "Zawadi", state: deriveState(zEvents, "zawadi") },
      { id: "leo", name: "Leo", state: { ...leo, wishes: { W3: { ...leo.wishes.W3, status: "approved" } } } },
    ]);
    expect(q.requests.map((r) => [r.name, r.wish.title, r.held])).toEqual([["Zawadi", "Bedtime story of my choice", 50]]);
    expect(q.approved.map((r) => r.name)).toEqual(["Leo"]);
    expect(q.toDeliver.map((r) => [r.name, r.reward])).toEqual([["Zawadi", "Movie night"]]);
    expect(waitingCount(q)).toBe(3);
  });
});

describe("the class 'assignment' rule: everything due this week (BST-02)", () => {
  const week = { monday: "2026-11-16", sunday: "2026-11-22" };
  const a = (id, due_on) => ({ id, due_on });
  test("done only when something is due this week and all of it is finished", () => {
    const done = new Set(["A1", "A2"]);
    const statusOf = (x) => ({ done: done.has(x.id) });
    expect(weekWorkDone([a("A1", "2026-11-18"), a("A2", "2026-11-20"), a("A9", "2026-11-30")], statusOf, week)).toBe(true);
    expect(weekWorkDone([a("A1", "2026-11-18"), a("A3", "2026-11-19")], statusOf, week)).toBe(false);
    expect(weekWorkDone([a("A9", "2026-11-30"), a("A8", null)], statusOf, week)).toBe(false); // nothing due
  });
});
