import { createEvent } from "@trailbuddies/sync";

/**
 * Demo family used until accounts arrive in Sprint 2. Profiles hold only what a
 * learner record holds on the server; everything they've done is in `events`.
 */
export const seedProfiles = () => [
  {
    id: "zawadi",
    name: "Zawadi",
    birth: { year: 2020, month: 6 },
    color: "coral",
    buddy: "zip",
    outfit: { hat: "sunhat" },
    interests: ["animals", "numbers"],
    difficulty: "auto",
  },
  {
    id: "amani",
    name: "Amani",
    birth: { year: 2023, month: 3 },
    color: "sky",
    buddy: null,
    outfit: {},
    interests: ["animals"],
    difficulty: "auto",
  },
  {
    id: "joseph",
    name: "Joseph",
    birth: { year: 1980, month: 4 },
    color: "night",
    buddy: "kiki",
    outfit: {},
    interests: [],
    difficulty: "auto",
  },
];

/**
 * A week of history as events, relative to `now`:
 * Zawadi has played Counting 1–5 lessons 1 and 2 (she finds "two" tricky, so a review is due);
 * Joseph has finished every Counting 1–5 lesson, so his trophy is next; Amani is brand new.
 */
export function seedEvents(now = new Date()) {
  const day = (daysAgo, hour, min = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, min);
    // keep "today" events in the past even early in the morning
    return d.getTime() > now.getTime() ? new Date(now.getTime() - 60_000) : d;
  };
  const lesson = (learnerId, when, lessonId, stars, minutes) =>
    createEvent(
      "lesson_completed",
      learnerId,
      {
        lessonId,
        unitId: lessonId.replace(/-\d+$/, ""),
        subjectId: "numbers",
        kind: "lesson",
        stars,
        durationSec: minutes * 60,
      },
      when,
    );
  const answer = (learnerId, when, itemId, firstTry) =>
    createEvent("item_answered", learnerId, { itemId, unitId: "counting-1-5", firstTry }, when);
  const earn = (learnerId, when, amount) =>
    createEvent("treasure_earned", learnerId, { amount, reason: "lesson" }, when);

  return [
    // Zawadi: minutes across the week 20, 35, 0, 28, 18, 0, 12 (today)
    lesson("zawadi", day(6, 17), "counting-1-5-1", 2, 20),
    answer("zawadi", day(6, 17), "one", true),
    answer("zawadi", day(6, 17), "two", false),
    answer("zawadi", day(6, 17), "three", true),
    lesson("zawadi", day(5, 16), "counting-1-5-1", 3, 15),
    lesson("zawadi", day(5, 17), "counting-1-5-2", 1, 20),
    lesson("zawadi", day(3, 18), "counting-1-5-2", 2, 28),
    lesson("zawadi", day(2, 17), "counting-1-5-1", 3, 18),
    answer("zawadi", day(2, 17), "two", false),
    lesson("zawadi", day(0, 8), "counting-1-5-2", 2, 12),
    earn("zawadi", day(5, 17), 70),
    earn("zawadi", day(0, 8), 60),
    // She bought the sun hat she wears (wallet: 130 earned − 20 = 110).
    createEvent("treasure_spent", "zawadi", { amount: 20, itemId: "sunhat", kind: "outfit" }, day(5, 18)),

    // Joseph: every Counting 1–5 lesson at 3 stars; minutes 30, 25, 0, 40, 20, 15, 0
    lesson("joseph", day(6, 20), "counting-1-5-1", 3, 30),
    lesson("joseph", day(5, 20), "counting-1-5-2", 3, 25),
    lesson("joseph", day(3, 20), "counting-1-5-3", 3, 20),
    lesson("joseph", day(3, 21), "counting-1-5-4", 3, 20),
    lesson("joseph", day(2, 20), "counting-1-5-5", 3, 20),
    lesson("joseph", day(1, 20), "counting-1-5-6", 3, 15),
    earn("joseph", day(1, 20), 410),
  ];
}

/** A lesson Grace made in the Lesson Builder, waiting on Family Island for Zawadi and Amani. */
export const seedLessons = (now = new Date()) => [
  {
    id: "demo-house",
    title: "Around our house",
    template: "sort",
    cards: [
      { id: "h1", label: "Bed", emoji: "🛏️", group: "Inside" },
      { id: "h2", label: "Chair", emoji: "🪑", group: "Inside" },
      { id: "h3", label: "Teapot", emoji: "🫖", group: "Inside" },
      { id: "h4", label: "Tree", emoji: "🌳", group: "Outside" },
      { id: "h5", label: "Kite", emoji: "🪁", group: "Outside" },
      { id: "h6", label: "Flower", emoji: "🌸", group: "Outside" },
    ],
    assigned: ["zawadi", "amani"],
    version: 1,
    by: "Grace",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
];

export const seedFamily = (now = new Date()) => ({
  family: { parent: "Grace", plan: "Free" },
  settings: { voice: true, goal: 2, limit: 20 },
  learners: seedProfiles(),
  lessons: seedLessons(now),
  events: seedEvents(now),
  waiting: [{ id: "w1", learnerId: "zawadi", text: "asked for Bedtime story of my choice" }],
  activeId: null,
});
