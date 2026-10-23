/**
 * Custom lessons from the Lesson Builder (BLD-01..09, GAM-02). A grown-up makes cards
 * (a word plus a photo, a library picture or neither, an optional voice clip and an
 * optional group) and picks a template; the lesson is generated from the cards each time
 * it's played, so editing a lesson never breaks progress: card ids are stable, new cards
 * just appear in the next session.
 */
import { shuffle } from "./random.js";
import { buildExercise } from "./lesson.js";

/** @typedef {import("./random.js").Rng} Rng */
/**
 * @typedef {object} Card
 * @property {string} id      stable for the life of the card
 * @property {string} label   the word on the card
 * @property {string} [emoji] a library picture
 * @property {string} [photo] media asset id of a photo
 * @property {string} [voice] media asset id of a voice clip
 * @property {string} [group] category for 'Sort them'
 */
/**
 * @typedef {object} CustomLesson
 * @property {string} id
 * @property {string} title
 * @property {"learn" | "sort" | "puzzle"} template
 * @property {Card[]} cards
 * @property {string[]} assigned  learner ids
 * @property {string} [question]  picture puzzle: asked after the jigsaw
 * @property {string} [puzzleCard] picture puzzle: the card whose photo is the jigsaw
 * @property {number} [version]
 */

export const TEMPLATES = /** @type {const} */ (["learn", "sort", "puzzle"]);
export const CARD_LIMITS = { min: 3, max: 12 };
export const LIMITS = { title: 60, label: 40, question: 80, group: 24 };
/** Prefix of a custom lesson's id in progress keys, events and routes. */
export const customId = (/** @type {string} */ id) => `custom-${id}`;
export const isCustomId = (/** @type {string} */ id) => typeof id === "string" && id.startsWith("custom-");

const clean = (s, max) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Distinct groups across the cards, in first-seen order. @param {Card[]} cards */
export function groupsOf(cards) {
  const seen = new Map();
  cards.forEach((c) => {
    const g = clean(c.group, LIMITS.group);
    if (g && !seen.has(g.toLowerCase())) seen.set(g.toLowerCase(), g);
  });
  return [...seen.values()];
}

/**
 * Can this template be played with these cards? Returns null when it can, or what's missing
 * so the builder can say what to add (BLD-04 scenario 2).
 * @param {Card[]} cards
 * @param {string} template
 * @returns {null | { need: "cards" | "groups" | "photo" | "group-each", n: number }}
 */
export function templateProblem(cards, template) {
  if (cards.length < CARD_LIMITS.min) return { need: "cards", n: CARD_LIMITS.min - cards.length };
  if (template === "sort") {
    const groups = groupsOf(cards);
    if (groups.length < 2) return { need: "groups", n: 2 - groups.length };
    const missing = cards.filter((c) => !clean(c.group, LIMITS.group)).length;
    if (missing) return { need: "group-each", n: missing };
  }
  if (template === "puzzle" && !cards.some((c) => c.photo)) return { need: "photo", n: 1 };
  return null;
}

/**
 * Tidy a lesson for saving: trimmed text, unique card ids, at most 12 cards, a valid
 * template and a puzzle card that exists. Never changes a card's id.
 * @param {CustomLesson} lesson
 * @returns {CustomLesson}
 */
export function normaliseLesson(lesson) {
  const seen = new Set();
  const cards = (lesson.cards || [])
    .filter((c) => c && c.id && !seen.has(c.id) && seen.add(c.id))
    .map((c) => {
      const out = { id: c.id, label: clean(c.label, LIMITS.label) };
      if (c.emoji) out.emoji = c.emoji;
      if (c.photo) out.photo = c.photo;
      if (c.voice) out.voice = c.voice;
      const g = clean(c.group, LIMITS.group);
      if (g) out.group = g;
      return out;
    })
    .filter((c) => c.label)
    .slice(0, CARD_LIMITS.max);
  const template = TEMPLATES.includes(lesson.template) ? lesson.template : "learn";
  const photoCards = cards.filter((c) => c.photo);
  const puzzleCard =
    template === "puzzle"
      ? (photoCards.find((c) => c.id === lesson.puzzleCard) || photoCards[0])?.id
      : undefined;
  return {
    id: lesson.id,
    title: clean(lesson.title, LIMITS.title) || "My lesson",
    template,
    cards,
    assigned: [...new Set(lesson.assigned || [])],
    ...(template === "puzzle"
      ? { question: clean(lesson.question, LIMITS.question) || "What is this?", puzzleCard }
      : {}),
    version: lesson.version || 1,
  };
}

/**
 * Next version after an edit: the version goes up when the cards or the template change,
 * so a device can tell its cached copy is out of date. Card ids carry over untouched.
 * @param {CustomLesson} before
 * @param {CustomLesson} after
 */
export function nextVersion(before, after) {
  if (!before) return 1;
  const key = (l) => JSON.stringify([l.template, l.question, l.puzzleCard, l.cards]);
  return key(before) === key(after) ? before.version || 1 : (before.version || 1) + 1;
}

/** Card → lesson item. Groups become tags so the sort exercise can use them. */
const toItem = (/** @type {Card} */ c) => ({
  id: c.id,
  label: c.label,
  say: c.label,
  emoji: c.emoji || (c.photo ? "" : "⭐"),
  ...(c.photo ? { photo: c.photo } : {}),
  ...(c.voice ? { voice: c.voice } : {}),
  ...(c.group ? { tags: [`g:${c.group.toLowerCase()}`] } : {}),
});

/** The custom lesson as a unit, so the regular exercise builders can use it. */
export function customUnit(/** @type {CustomLesson} */ lesson) {
  const items = lesson.cards.map(toItem);
  const groups = groupsOf(lesson.cards).map((g) => ({
    id: `g:${g.toLowerCase()}`,
    label: g,
    say: g,
    emoji: "🧺",
  }));
  return { id: customId(lesson.id), subject: "family", title: lesson.title, items, groups };
}

/** Exercises per template. 'Learn the names': explore → listen & tap → match → name it. */
export const TEMPLATE_STEPS = {
  learn: ["listen-tap", "listen-tap", "match", "name-it", "name-it"],
  sort: ["listen-tap", "sort", "sort"],
};

/**
 * Generate a playable lesson from a custom lesson.
 * @param {CustomLesson} lesson
 * @param {{ level: number, band: string, r: Rng }} opts
 * @returns {import("./lesson.js").Lesson}
 */
export function buildCustomLesson(lesson, { level, band, r }) {
  const unit = customUnit(lesson);
  const id = unit.id;
  const all = unit.items;
  const base = { id, unitId: id, subjectId: "family", kind: "custom", title: lesson.title, level };

  if (lesson.template === "puzzle") {
    // GAM-02: a jigsaw of the photo, then the grown-up's question with picture choices.
    const target = all.find((i) => i.id === lesson.puzzleCard) || all.find((i) => i.photo) || all[0];
    const others = shuffle(
      all.filter((i) => i.id !== target.id),
      r,
    ).slice(0, Math.min(3, Math.max(1, level)));
    const options = shuffle([target, ...others], r);
    const question = lesson.question || "What is this?";
    return {
      ...base,
      steps: [
        {
          id: `${id}-jigsaw`,
          type: "jigsaw",
          prompt: "Put the picture back together!",
          say: "Let's make the picture!",
          target,
          itemIds: [],
          extra: { side: band === "seedling" ? 2 : 3 },
        },
        {
          id: `${id}-ask`,
          type: "listen-tap",
          prompt: question,
          say: question,
          target,
          options,
          itemIds: [target.id],
        },
      ],
    };
  }

  // Explore every card first (up to 6 at once so the intro stays short).
  const intro = shuffle(all, r).slice(0, Math.min(all.length, 6));
  let queue = shuffle(all, r);
  const next = () => {
    if (!queue.length) queue = shuffle(all, r);
    return queue.shift();
  };
  const types = TEMPLATE_STEPS[lesson.template] || TEMPLATE_STEPS.learn;
  const steps = [
    {
      id: `${id}-intro`,
      type: "intro",
      prompt: "Let's meet them first. Tap each one!",
      say: `Let's meet them first. ${intro.map((i) => i.say).join(", ")}. Tap each one to hear it!`,
      items: intro,
      itemIds: intro.map((i) => i.id),
    },
    ...types.map((type, i) =>
      buildExercise(
        { type },
        { id: `${id}-ex${i + 1}`, next, pool: all, all, level, band, r, groups: unit.groups },
      ),
    ),
  ];
  return { ...base, steps };
}

/** Lessons assigned to a learner, newest first. @param {CustomLesson[]} lessons @param {string} learnerId */
export const lessonsFor = (lessons, learnerId) =>
  lessons
    .filter((l) => !l.deleted && (l.assigned || []).includes(learnerId))
    .slice()
    .reverse();
