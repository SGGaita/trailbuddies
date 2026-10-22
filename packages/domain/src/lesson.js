/**
 * Lesson generation (ported and extended from Chipuka's buildSteps). A lesson is a list of
 * steps: an intro that shows and says each new item, then exercises built from the unit's
 * lesson config. Generation is pure and seeded, so the same seed gives the same lesson.
 *
 * Exercise types in Sprint 1: listen-tap, name-it, count, match, compare, sequence, odd-one-out.
 * Number-only types fall back to listen-tap for units whose items aren't numbers.
 */
import { shuffle, pick } from "./random.js";
import { choicesFor } from "./difficulty.js";

/** @typedef {import("./random.js").Rng} Rng */
/** @typedef {{ id: string, label: string, say?: string, number?: number, emoji?: string, fact?: string, tags?: string[] }} Item */
/** @typedef {{ type: string, choices?: number, prompt?: string }} ExerciseConfig */
/** @typedef {{ id: string, title: string, focus: string[], review?: string[], exercises: ExerciseConfig[] }} LessonConfig */
/** @typedef {{ id: string, subject: string, title: string, items: Item[], lessons: LessonConfig[], checkpoint: { review: number } }} Unit */
/**
 * @typedef {object} Step
 * @property {string} id
 * @property {string} type
 * @property {string} prompt   text in the buddy's bubble
 * @property {string} say      what the voice says
 * @property {string[]} itemIds items this step practises (for mastery)
 * @property {Item} [target]
 * @property {Item[]} [options]
 * @property {Item[]} [items]
 * @property {any} [extra]
 */
/**
 * @typedef {object} Lesson
 * @property {string} id
 * @property {string} unitId
 * @property {string} subjectId
 * @property {"lesson" | "trophy" | "review"} kind
 * @property {string} title
 * @property {number} level
 * @property {Step[]} steps
 */

export const EXERCISE_TYPES = ["listen-tap", "name-it", "count", "match", "compare", "sequence", "odd-one-out"];
const NUMBER_ONLY = new Set(["count", "compare", "sequence", "odd-one-out"]);
const isNumber = (/** @type {Item} */ it) => typeof it.number === "number";
const words = (/** @type {Item} */ it) => it.say || it.label;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Items introduced up to and including lesson `index` (plus its review items). */
export function introducedUpTo(unit, index) {
  const ids = new Set();
  unit.lessons.slice(0, index + 1).forEach((l) => {
    l.focus.forEach((f) => ids.add(f));
    (l.review || []).forEach((r) => ids.add(r));
  });
  return unit.items.filter((i) => ids.has(i.id));
}

/**
 * How many answer options to show. Content is written for level 2; each level above or
 * below adds or removes one option. Never fewer than 2 or more than the items available.
 */
export function optionCount(config, level, available) {
  const base = config.choices ? config.choices + (level - 2) : choicesFor(level);
  return clamp(base, 2, Math.max(2, available));
}

/**
 * Match pairs (LES-03): 3 at level 1, 4 at level 2, 5 at level 3. Uses only items the
 * learner has met when there are 3 or more of them; never more than the unit has.
 */
export function matchPairs(level, introduced, inUnit) {
  const want = clamp(level + 2, 3, 5);
  return Math.max(2, Math.min(want, Math.max(3, introduced), inUnit));
}

/** Target queue: every focus item first, then review items, then anything introduced. */
function targetQueue(focus, review, pool, r) {
  const q = [...shuffle(focus, r), ...shuffle(review, r)];
  let rest = shuffle(pool, r);
  return () => {
    if (q.length) return q.shift();
    if (!rest.length) rest = shuffle(pool, r);
    return rest.shift();
  };
}

function distractors(target, pool, all, n, r, same = (a, b) => a.id === b.id) {
  const fromPool = shuffle(pool.filter((i) => !same(i, target)), r);
  const extra = shuffle(all.filter((i) => !same(i, target) && !fromPool.includes(i)), r);
  return [...fromPool, ...extra].slice(0, n);
}

/**
 * Build one exercise step.
 * @param {ExerciseConfig} cfg
 * @param {{ id: string, next: () => Item, pool: Item[], all: Item[], level: number, band: string, r: Rng }} ctx
 * @returns {Step}
 */
export function buildExercise(cfg, ctx) {
  const { id, next, pool, all, level, band, r } = ctx;
  const numbers = pool.filter(isNumber);
  let type = cfg.type;
  if (NUMBER_ONLY.has(type) && numbers.length < 2) type = "listen-tap";
  if (type === "match" && pool.length < 2) type = "listen-tap";

  if (type === "listen-tap" || type === "name-it") {
    const target = next();
    const n = optionCount(cfg, level, pool.length);
    const options = shuffle([target, ...distractors(target, pool, all, n - 1, r)], r);
    if (type === "listen-tap") {
      return { id, type, prompt: cfg.prompt || `Tap ${target.label}!`, say: `Tap ${words(target)}!`, target, options, itemIds: [target.id] };
    }
    const prompt = isNumber(target) ? `Find the group of ${target.label}.` : `What is this?`;
    const say = isNumber(target) ? `Which group has ${words(target)}?` : `What is this?`;
    return { id, type, prompt: cfg.prompt || prompt, say, target, options, itemIds: [target.id] };
  }

  if (type === "count") {
    let target = next();
    if (!isNumber(target)) target = pick(numbers, r);
    const n = optionCount(cfg, level, numbers.length);
    const options = shuffle([target, ...distractors(target, numbers, all.filter(isNumber), n - 1, r)], r);
    const emoji = pick(all.filter((i) => i.emoji), r)?.emoji || "⭐";
    return { id, type, prompt: cfg.prompt || "How many? Tap each one to count.", say: "How many are there? Tap each one to count.", target, options, itemIds: [target.id], extra: { emoji } };
  }

  if (type === "match") {
    const pairs = matchPairs(level, pool.length, all.length);
    const first = next();
    const items = shuffle([first, ...distractors(first, pool, all, pairs - 1, r)], r);
    const right = shuffle(items, r);
    const prompt = isNumber(first) ? "Match each group to its number." : "Match each picture to its name.";
    return { id, type, prompt: cfg.prompt || prompt, say: prompt, items, options: right, itemIds: items.map((i) => i.id) };
  }

  if (type === "compare") {
    const a = next();
    const a2 = isNumber(a) ? a : pick(numbers, r);
    const b = pick(numbers.filter((i) => i.number !== a2.number), r);
    const ask = band === "seedling" || r() < 0.5 ? "more" : "fewer";
    const groups = shuffle([a2, b], r);
    const target = ask === "more" ? (a2.number > b.number ? a2 : b) : a2.number < b.number ? a2 : b;
    const emoji = pick(all.filter((i) => i.emoji), r)?.emoji || "⭐";
    return { id, type, prompt: cfg.prompt || `Which has ${ask}?`, say: `Which group has ${ask}?`, target, options: groups, itemIds: [a2.id, b.id], extra: { ask, emoji } };
  }

  if (type === "sequence") {
    const k = clamp(optionCount(cfg, level, numbers.length) + 1, 3, numbers.length);
    const chosen = shuffle(numbers, r).slice(0, k).sort((x, y) => x.number - y.number);
    const say = cfg.prompt || "Put the numbers in order, starting with the smallest.";
    return { id, type, prompt: say, say, items: chosen, options: shuffle(chosen, r), itemIds: chosen.map((i) => i.id) };
  }

  if (type === "odd-one-out") {
    const target = next();
    const base = isNumber(target) ? target : pick(numbers, r);
    const odd = pick(numbers.filter((i) => i.number !== base.number), r);
    const n = clamp(optionCount(cfg, level, 4), 3, 4);
    const emojis = shuffle(all.filter((i) => i.emoji).map((i) => i.emoji), r);
    const groups = Array.from({ length: n - 1 }, (_, i) => ({ id: `same-${i}`, count: base.number, emoji: emojis[i % emojis.length] || "⭐" }));
    const oddGroup = { id: "odd", count: odd.number, emoji: emojis[(n - 1) % emojis.length] || "⭐" };
    return {
      id,
      type,
      prompt: cfg.prompt || "Which group is different?",
      say: `All the groups have ${words(base)}, except one. Which one is different?`,
      target: odd,
      options: [],
      itemIds: [base.id, odd.id],
      extra: { groups: shuffle([...groups, oddGroup], r), answer: "odd" },
    };
  }

  throw new Error(`Unknown exercise type: ${cfg.type}`);
}

const introStep = (lessonId, items) => ({
  id: `${lessonId}-intro`,
  type: "intro",
  prompt: "Let's meet them first. Tap each one!",
  say: `Let's meet them first. ${items.map(words).join(", ")}. Tap each one to hear it!`,
  items,
  itemIds: items.map((i) => i.id),
});

/**
 * A regular lesson from the unit's lesson config.
 * @param {Unit} unit
 * @param {number} index 0-based lesson index
 * @param {{ level: number, band: string, r: Rng }} opts
 * @returns {Lesson}
 */
export function buildLesson(unit, index, { level, band, r }) {
  const cfg = unit.lessons[index];
  if (!cfg) throw new RangeError(`Lesson ${index + 1} not found in ${unit.id}`);
  const byId = (id) => unit.items.find((i) => i.id === id);
  const focus = cfg.focus.map(byId);
  const review = (cfg.review || []).map(byId);
  const pool = introducedUpTo(unit, index);
  const next = targetQueue(focus, review, pool, r);
  const steps = [];
  if (focus.length) steps.push(introStep(cfg.id, focus));
  cfg.exercises.forEach((ex, i) => steps.push(buildExercise(ex, { id: `${cfg.id}-ex${i + 1}`, next, pool, all: unit.items, level, band, r })));
  return { id: cfg.id, unitId: unit.id, subjectId: unit.subject, kind: "lesson", title: cfg.title, level, steps };
}

/**
 * The unit trophy: a mixed review of every item, using the unit's exercise types.
 * @param {Unit} unit
 * @param {{ level: number, band: string, r: Rng, length?: number }} opts
 * @returns {Lesson}
 */
export function buildTrophy(unit, { level, band, r, length = 6 }) {
  const types = [...new Set(unit.lessons.flatMap((l) => l.exercises.map((e) => e.type)))].filter((t) => EXERCISE_TYPES.includes(t));
  const order = shuffle(types, r);
  const pool = unit.items;
  const next = targetQueue([], [], pool, r);
  const id = `${unit.id}-trophy`;
  const steps = Array.from({ length }, (_, i) => buildExercise({ type: order[i % order.length] }, { id: `${id}-ex${i + 1}`, next, pool, all: pool, level, band, r }));
  return { id, unitId: unit.id, subjectId: unit.subject, kind: "trophy", title: `${unit.title} trophy`, level, steps };
}

/**
 * A short review lesson for items that need practice (from dueForReview).
 * @param {Unit[]} units units the items come from
 * @param {string[]} itemIds
 * @param {{ level: number, band: string, r: Rng, max?: number }} opts
 * @returns {Lesson | null}
 */
export function buildReview(units, itemIds, { level, band, r, max = 5 }) {
  const all = units.flatMap((u) => u.items);
  const due = itemIds.map((id) => all.find((i) => i.id === id)).filter(Boolean).slice(0, max);
  if (!due.length) return null;
  const unit = units.find((u) => u.items.some((i) => i.id === due[0].id));
  const pool = all.filter((i) => units.some((u) => u.id === unit.id && u.items.includes(i)));
  const queue = [...due];
  const next = () => queue.shift() || pick(due, r);
  const types = ["listen-tap", "count", "listen-tap", "name-it", "count"];
  const id = `${unit.subject}-review`;
  const steps = due.map((it, i) => buildExercise({ type: isNumber(it) ? types[i % types.length] : "listen-tap" }, { id: `${id}-ex${i + 1}`, next, pool, all: pool, level, band, r }));
  return { id, unitId: unit.id, subjectId: unit.subject, kind: "review", title: "Review", level, steps };
}

/** Steps that ask a question (everything except the intro). */
export const questionSteps = (/** @type {Lesson} */ lesson) => lesson.steps.filter((s) => s.type !== "intro");
