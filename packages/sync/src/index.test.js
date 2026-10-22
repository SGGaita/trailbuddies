import { createEvent, memoryOutbox, mergeEvents, deriveState, activity, ulid } from "./index.js";

test("ulids are 26 chars and sort by time", () => {
  const a = ulid(1000);
  const b = ulid(2000);
  expect(a).toHaveLength(26);
  expect(a < b).toBe(true);
});

test("events validate type and learner", () => {
  expect(() => createEvent("nope", "z")).toThrow();
  expect(() => createEvent("lesson_completed", "")).toThrow();
  expect(createEvent("lesson_completed", "z", { lessonId: "x", stars: 2 }).type).toBe("lesson_completed");
});

test("outbox returns pending events in order and forgets sent ones", async () => {
  const box = memoryOutbox();
  const e1 = createEvent("treasure_earned", "z", { amount: 10 }, new Date(1000));
  const e2 = createEvent("treasure_earned", "z", { amount: 5 }, new Date(2000));
  await box.put(e2);
  await box.put(e1);
  expect((await box.pending(10)).map((e) => e.id)).toEqual([e1.id, e2.id]);
  await box.markSent([e1.id]);
  expect((await box.pending(10)).map((e) => e.id)).toEqual([e2.id]);
});

test("two devices merge without double counting; best stars win", () => {
  const tablet = [
    createEvent("lesson_completed", "z", { lessonId: "counting-1-5-1", stars: 2 }, new Date(1000)),
    createEvent("treasure_earned", "z", { amount: 10 }, new Date(1001)),
  ];
  const phone = [
    tablet[1], // already synced copy
    createEvent("lesson_completed", "z", { lessonId: "counting-1-5-1", stars: 3 }, new Date(3000)),
    createEvent("treasure_spent", "z", { amount: 4 }, new Date(3001)),
    createEvent("badge_awarded", "z", { badgeId: "first-steps" }, new Date(3002)),
    createEvent("treasure_earned", "amani", { amount: 99 }, new Date(3003)),
  ];
  const s = deriveState(mergeEvents(tablet, phone), "z");
  expect(s).toMatchObject({ progress: { "counting-1-5-1": 3 }, stars: 3, treasures: 6, badges: ["first-steps"] });
  expect(s.results.map((r) => r.stars)).toEqual([2, 3]);
});

test("answers and results come out in time order with timestamps", () => {
  const evs = [
    createEvent("item_answered", "z", { itemId: "two", firstTry: false }, new Date(2000)),
    createEvent("item_answered", "z", { itemId: "one", firstTry: true }, new Date(1000)),
    createEvent("lesson_completed", "z", { lessonId: "l1", unitId: "u", subjectId: "numbers", kind: "lesson", stars: 2, durationSec: 120 }, new Date(3000)),
  ];
  const s = deriveState(evs, "z");
  expect(s.answers).toEqual([{ itemId: "one", firstTry: true, at: 1000 }, { itemId: "two", firstTry: false, at: 2000 }]);
  expect(s.results[0]).toEqual({ lessonId: "l1", unitId: "u", subjectId: "numbers", kind: "lesson", stars: 2, at: 3000, durationSec: 120 });
});

test("activity counts today's lessons and the last 7 days of minutes", () => {
  const now = new Date(2026, 9, 22, 15, 0);
  const at = (daysAgo, h) => new Date(2026, 9, 22 - daysAgo, h).getTime();
  const results = [
    { at: at(0, 9), durationSec: 300 },
    { at: at(0, 14), durationSec: 420 },
    { at: at(1, 18), durationSec: 600 },
    { at: at(6, 8), durationSec: 60 },
    { at: at(7, 8), durationSec: 999 },
  ];
  expect(activity(results, now)).toEqual({ lessonsToday: 2, minutesToday: 12, week: [1, 0, 0, 0, 0, 10, 12] });
});

test("reviews count as results but add no trail stars", () => {
  const e = createEvent("lesson_completed", "k", { lessonId: "numbers-review", kind: "review", stars: 3, durationSec: 60 });
  const s = deriveState([e], "k");
  expect(s.progress).toEqual({});
  expect(s.results).toHaveLength(1);
});
