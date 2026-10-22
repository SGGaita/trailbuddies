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

export const EXERCISE_TYPES = ["listen-tap", "name-it", "count", "match", "compare", "sequence", "odd-one-out", "sort", "case-match", "build-word"];
const NUMBER_ONLY = new Set(["count", "compare", "sequence"]);
const isNumber = (/** @type {Item} */ it) => typeof it.number === "number";
const isLetter = (/** @type {Item} */ it) => typeof it.letter === "string" && !(it.tags || []).includes("word");
const isWord = (/** @type {Item} */ it) => (it.tags || []).includes("word");
/** Items of the same kind (letters with letters, words with words) so choices make sense. */
const kindOf = (/** @type {Item} */ it) => (isWord(it) ? "word" : isLetter(it) ? "letter" : "other");
const sameKind = (list, it) => list.filter((x) => kindOf(x) === kindOf(it));
/** @typedef {{ id: string, label: string, say?: string, emoji?: string }} Group */
const groupOf = (/** @type {Item} */ it, /** @type {Group[]} */ groups) =>
  groups.find((g) => (it.tags || []).includes(g.id));
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
  const { id, next, pool, all, level, band, r, groups = [] } = ctx;
  const numbers = pool.filter(isNumber);
  const letters = pool.filter(isLetter);
  const wordItems = pool.filter(isWord);
  const grouped = pool.filter((i) => groupOf(i, groups));
  const groupIds = [...new Set(grouped.map((i) => groupOf(i, groups).id))];
  /** The next target that fits, or any item of that kind. */
  const nextOf = (pred, list) => {
    for (let i = 0; i < 8; i++) {
      const t = next();
      if (t && pred(t)) return t;
    }
    return pick(list, r);
  };
  let type = cfg.type;
  if (NUMBER_ONLY.has(type) && numbers.length < 2) type = "listen-tap";
  if (type === "odd-one-out" && numbers.length < 2 && groupIds.length < 2) type = "listen-tap";
  if (type === "case-match" && letters.length < 2) type = "listen-tap";
  if (type === "build-word" && !wordItems.length) type = "listen-tap";
  if (type === "sort" && groupIds.length < 2) type = "listen-tap";
  if (type === "match" && pool.length < 2) type = "listen-tap";

  if (type === "listen-tap" || type === "name-it") {
    const target = next();
    const kin = sameKind(pool, target);
    const n = optionCount(cfg, level, kin.length);
    const options = shuffle([target, ...distractors(target, kin, sameKind(all, target), n - 1, r)], r);
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
    const first = next();
    const kin = sameKind(pool, first);
    const pairs = matchPairs(level, kin.length, sameKind(all, first).length);
    const items = shuffle([first, ...distractors(first, kin, sameKind(all, first), pairs - 1, r)], r);
    const right = shuffle(items, r);
    const prompt = isNumber(first) ? "Match each group to its number." : "Match each picture to its name.";
    return { id, type, prompt: cfg.prompt || prompt, say: prompt, items, options: right, itemIds: items.map((i) => i.id) };
  }

  if (type === "compare") {
    const a = next();
    const a2 = isNumber(a) ? a : pick(numbers, r);
    const b = pick(numbers.filter((i) => i.number !== a2.number), r);
    const ask = band === "seedling" || r() < 0.5 ? "more" : "fewer";
    const shown = shuffle([a2, b], r);
    const target = ask === "more" ? (a2.number > b.number ? a2 : b) : a2.number < b.number ? a2 : b;
    const emoji = pick(all.filter((i) => i.emoji), r)?.emoji || "⭐";
    const [big, small] = a2.number > b.number ? [a2.number, b.number] : [b.number, a2.number];
    // LES-06: after a right answer the buddy counts both groups.
    const explain = {
      event: ask === "more" ? "lesson.explain-compare" : "lesson.explain-compare-fewer",
      vars: { a: shown[0].number, b: shown[1].number, big, small },
    };
    return { id, type, prompt: cfg.prompt || `Which has ${ask}?`, say: `Which group has ${ask}?`, target, options: shown, itemIds: [a2.id, b.id], extra: { ask, emoji }, explain };
  }

  if (type === "sequence") {
    const k = clamp(optionCount(cfg, level, numbers.length) + 1, 3, numbers.length);
    const chosen = shuffle(numbers, r).slice(0, k).sort((x, y) => x.number - y.number);
    const say = cfg.prompt || "Put the numbers in order, starting with the smallest.";
    return { id, type, prompt: say, say, items: chosen, options: shuffle(chosen, r), itemIds: chosen.map((i) => i.id) };
  }

  if (type === "odd-one-out" && numbers.length < 2) {
    // Categories (LES-09): 2-3 from one group and one from another; the buddy says why.
    const target = nextOf((i) => groupOf(i, groups), grouped);
    const base = groupOf(target, groups);
    const sameCount = level >= 2 ? 3 : 2;
    const inBase = all.filter((i) => groupOf(i, groups)?.id === base.id);
    const same = [target, ...shuffle(inBase.filter((i) => i.id !== target.id), r)].slice(0, sameCount);
    const others = all.filter((i) => { const g = groupOf(i, groups); return g && g.id !== base.id; });
    const odd = pick(others, r);
    const oddGroup = groupOf(odd, groups);
    const options = shuffle([...same, odd], r);
    return {
      id,
      type,
      prompt: cfg.prompt || "Which one is different?",
      say: "Which one is different?",
      target: odd,
      options,
      itemIds: [...same.map((i) => i.id), odd.id],
      extra: { mode: "category", answer: odd.id },
      explain: { event: "lesson.explain-odd", vars: { odd: words(odd), where: oddGroup.say || oddGroup.label, others: base.say || base.label } },
    };
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
      explain: { event: "lesson.explain-odd-number", vars: { same: base.number, odd: odd.number } },
    };
  }

  if (type === "case-match") {
    // LES-10: capital on the left, small letter on the right.
    const first = nextOf(isLetter, letters);
    const pairs = matchPairs(level, letters.length, all.filter(isLetter).length);
    const items = shuffle([first, ...distractors(first, letters, all.filter(isLetter), pairs - 1, r)], r);
    const prompt = "Match the big and small letters.";
    return { id, type, prompt: cfg.prompt || prompt, say: prompt, items, options: shuffle(items, r), itemIds: items.map((i) => i.id) };
  }

  if (type === "build-word") {
    // LES-11: the word's letters plus 0-2 spare letters by level.
    const target = nextOf(isWord, wordItems);
    const unitLetters = all.filter(isLetter);
    const tileFor = (ch, i) => {
      const it = unitLetters.find((l) => l.letter === ch);
      return { id: `${target.id}-${i}`, letter: ch, label: ch, say: it ? words(it) : ch };
    };
    const slots = [...target.label.toLowerCase()].map(tileFor);
    const spare = shuffle(unitLetters.filter((l) => !target.label.includes(l.letter)), r)
      .slice(0, clamp(level - 1, 0, 2))
      .map((l, i) => ({ id: `${target.id}-x${i}`, letter: l.letter, label: l.letter, say: words(l) }));
    return {
      id,
      type,
      prompt: cfg.prompt || "Spell the word for this picture.",
      say: `Let's spell ${words(target)}!`,
      target,
      items: slots,
      options: shuffle([...slots, ...spare], r),
      itemIds: [target.id],
      // The word is read out when it's complete.
      explain: { event: "lesson.word-done", vars: { word: words(target) } },
    };
  }

  if (type === "sort") {
    // LES-08: drop each item in the right basket; 2 baskets at level 1, up to 4 above.
    const binCount = clamp(level + 1, 2, Math.min(4, groupIds.length));
    const first = nextOf((i) => groupOf(i, groups), grouped);
    const binIds = [groupOf(first, groups).id, ...shuffle(groupIds.filter((g) => g !== groupOf(first, groups).id), r)].slice(0, binCount);
    const bins = groups.filter((g) => binIds.includes(g.id));
    const candidates = grouped.filter((i) => binIds.includes(groupOf(i, groups).id));
    const total = clamp(level + 3, binCount * 1 + 1, Math.min(6, candidates.length));
    const oneEach = binIds.map((b) => (b === groupOf(first, groups).id ? first : pick(candidates.filter((i) => groupOf(i, groups).id === b), r)));
    const rest = shuffle(candidates.filter((i) => !oneEach.includes(i)), r).slice(0, Math.max(0, total - oneEach.length));
    const items = shuffle([...oneEach, ...rest], r).map((i) => ({ ...i, bin: groupOf(i, groups).id }));
    const prompt = "Put each one where it belongs.";
    return { id, type, prompt: cfg.prompt || prompt, say: prompt, bins, items, itemIds: items.map((i) => i.id) };
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
  cfg.exercises.forEach((ex, i) =>
    steps.push(buildExercise(ex, { id: `${cfg.id}-ex${i + 1}`, next, pool, all: unit.items, level, band, r, groups: unit.groups })),
  );
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
  const steps = Array.from({ length }, (_, i) => buildExercise({ type: order[i % order.length] }, { id: `${id}-ex${i + 1}`, next, pool, all: pool, level, band, r, groups: unit.groups }));
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
  const steps = due.map((it, i) => buildExercise({ type: isNumber(it) ? types[i % types.length] : "listen-tap" }, { id: `${id}-ex${i + 1}`, next, pool, all: pool, level, band, r, groups: unit.groups }));
  return { id, unitId: unit.id, subjectId: unit.subject, kind: "review", title: "Review", level, steps };
}

/** Steps that ask a question (everything except the intro). */
export const questionSteps = (/** @type {Lesson} */ lesson) => lesson.steps.filter((s) => s.type !== "intro");
