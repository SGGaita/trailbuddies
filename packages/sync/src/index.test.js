import { createEvent, memoryOutbox, mergeEvents, deriveState, ulid } from "./index.js";

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
  expect(s).toEqual({ progress: { "counting-1-5-1": 3 }, stars: 3, treasures: 6, badges: ["first-steps"] });
});
