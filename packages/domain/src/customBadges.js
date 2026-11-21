/**
 * Badge Studio (BST-01…06, BDG-07): badges grown-ups design, with a rule for how they're earned,
 * a reward, and who can earn them. Family badges belong to a family; class badges to a class.
 *
 * A custom badge is turned into an engine rule (badges.js) so it is checked on the device after
 * every lesson and game, exactly like the built-in badges, and works offline. When one is
 * earned, the award event carries a snapshot of its design, so the badge stays in the badge book
 * even if a grown-up later deletes it: badges can be hidden, never taken away (BDG-07).
 */
import { customId } from "./custom.js";

/** BST-03: the most treasures a custom badge can give (a gold built-in badge gives 50). */
export const BADGE_TREASURE_MAX = 50;
/** BST-02: a combination has at most 3 conditions. */
export const MAX_CONDITIONS = 3;
export const BADGE_NAME_MAX = 40;
export const BADGE_REWARD_MAX = 80;
export const BADGE_NOTE_MAX = 120;

/** What a count rule can count. */
export const COUNT_METRICS = ["stars", "lessons", "perfect-lessons", "goal-days", "mastered-items"];
/** Rule types a family badge can use, then a class badge. Manual can't be part of a combination. */
export const FAMILY_RULES = ["manual", "lesson", "count", "streak", "mastery", "combo"];
export const CLASS_RULES = ["manual", "count", "streak", "assignment", "combo"];

export const BADGE_SHAPES = ["circle", "square", "diamond", "arch"];
export const BADGE_COLOURS = ["blue", "green", "pink", "yellow", "orange"];
export const BADGE_ICONS = ["star", "plant", "heart", "trophy", "book", "sparkle", "rocket", "broom", "music", "paw", "sun", "smile"];
export const ICON_EMOJI = {
  star: "⭐",
  plant: "🌱",
  heart: "💛",
  trophy: "🏆",
  book: "📚",
  sparkle: "✨",
  rocket: "🚀",
  broom: "🧹",
  music: "🎵",
  paw: "🐾",
  sun: "☀️",
  smile: "😊",
};

/**
 * @typedef {{ type: "manual" } | { type: "lesson", lesson: string } | { type: "count", metric: string, n: number }
 *   | { type: "streak", days: number } | { type: "mastery", lesson: string } | { type: "assignment" }
 *   | { type: "combo", op: "and" | "or", all: any[] }} BadgeRule
 * @typedef {{ id: string, name: string, shape: string, colour: string, icon: string, photo?: string | null,
 *   note?: string, voice?: string | null, rule: BadgeRule, treasures: number, reward?: string,
 *   audience: string[] | "class", updated_at?: string }} CustomBadge
 */

const isInt = (n) => Number.isInteger(n);

/**
 * Problems with a rule, as i18n keys (empty when it's fine).
 * @param {BadgeRule} rule
 * @param {{ kind: "family" | "class", lessons?: { id: string }[] }} ctx
 * @param {boolean} [inCombo]
 * @returns {string[]}
 */
export function ruleProblems(rule, ctx, inCombo = false) {
  const allowed = ctx.kind === "class" ? CLASS_RULES : FAMILY_RULES;
  if (!rule || !allowed.includes(rule.type)) return ["rule.unknown"];
  const lessonIds = new Set((ctx.lessons || []).map((l) => l.id));
  switch (rule.type) {
    case "manual":
      return inCombo ? ["rule.manualInCombo"] : [];
    case "lesson":
    case "mastery":
      return lessonIds.has(rule.lesson) ? [] : ["rule.pickLesson"];
    case "count":
      if (!COUNT_METRICS.includes(rule.metric)) return ["rule.unknown"];
      return isInt(rule.n) && rule.n >= 1 && rule.n <= 1000 ? [] : ["rule.count"];
    case "streak":
      return isInt(rule.days) && rule.days >= 1 && rule.days <= 7 ? [] : ["rule.streak"];
    case "assignment":
      return [];
    case "combo": {
      if (inCombo) return ["rule.nested"];
      if (!["and", "or"].includes(rule.op)) return ["rule.unknown"];
      if (!Array.isArray(rule.all) || rule.all.length < 2) return ["rule.comboTooFew"];
      if (rule.all.length > MAX_CONDITIONS) return ["rule.comboTooMany"];
      return [...new Set(rule.all.flatMap((r) => ruleProblems(r, ctx, true)))];
    }
    default:
      return ["rule.unknown"];
  }
}

/**
 * Everything wrong with a badge before it's saved (empty when it can be saved).
 * @param {CustomBadge} b
 * @param {{ kind: "family" | "class", lessons?: { id: string }[], learners?: string[] }} ctx
 *   learners: the family's learner ids, or the class's student ids
 * @returns {string[]}
 */
export function badgeProblems(b, ctx) {
  const out = [];
  const name = (b.name || "").trim();
  if (!name || name.length > BADGE_NAME_MAX) out.push("name");
  if (!BADGE_SHAPES.includes(b.shape) || !BADGE_COLOURS.includes(b.colour)) out.push("design");
  if (!b.photo && !BADGE_ICONS.includes(b.icon)) out.push("design");
  if (!isInt(b.treasures) || b.treasures < 0) out.push("treasures");
  else if (b.treasures > BADGE_TREASURE_MAX) out.push("treasureCap");
  if ((b.reward || "").length > BADGE_REWARD_MAX) out.push("reward");
  if ((b.note || "").length > BADGE_NOTE_MAX) out.push("note");
  const known = new Set(ctx.learners || []);
  const everyone = ctx.kind === "class" && b.audience === "class";
  if (!everyone && (!Array.isArray(b.audience) || !b.audience.length || b.audience.some((id) => !known.has(id))))
    out.push("audience");
  out.push(...ruleProblems(b.rule, ctx));
  return [...new Set(out)];
}

/** Does a rule (or one of its combined conditions) use this rule type? */
export const ruleUses = (rule, type) => rule?.type === type || (rule?.all || []).some((r) => r.type === type);

/** BST-06: can this learner (or student) earn the badge? A whole-class badge includes new joiners. */
export const canEarn = (b, learnerId) => b.audience === "class" || (Array.isArray(b.audience) && b.audience.includes(learnerId));

/**
 * The badge engine's rule for a custom rule. Lessons are custom (Lesson Builder) lessons.
 * @param {BadgeRule} rule
 * @param {{ id: string, cards?: { id: string }[] }[]} lessons
 */
export function engineRule(rule, lessons = []) {
  switch (rule.type) {
    case "lesson":
      return { type: "lessons", ids: [customId(rule.lesson)] };
    case "mastery": {
      const lesson = lessons.find((l) => l.id === rule.lesson);
      // A lesson that was deleted can't be mastered any more: never met.
      return lesson?.cards?.length ? { type: "mastery", items: lesson.cards.map((c) => c.id) } : { type: "never" };
    }
    case "count":
      return { type: "count", metric: rule.metric, n: rule.n };
    case "streak":
      return { type: "streak", days: rule.days, window: 7 };
    case "assignment":
      return { type: "assignment" };
    case "combo":
      return { type: "combo", op: rule.op, all: rule.all.map((r) => engineRule(r, lessons)) };
    default:
      return { type: "manual" };
  }
}

/** The design that travels with an award, so an earned badge outlives its definition (BDG-07). */
export const badgeSnapshot = (b) => ({
  name: b.name,
  shape: b.shape,
  colour: b.colour,
  icon: b.icon,
  ...(b.photo ? { photo: b.photo } : {}),
  ...(b.note ? { note: b.note } : {}),
  ...(b.voice ? { voice: b.voice } : {}),
  ...(b.reward ? { reward: b.reward } : {}),
});

/**
 * Custom badges as engine catalogue entries for one learner: only badges they can earn, and
 * never manual ones (those are given by a grown-up).
 * @param {CustomBadge[]} badges
 * @param {string} learnerId
 * @param {{ id: string, cards?: { id: string }[] }[]} lessons
 */
export function customCatalogue(badges, learnerId, lessons = []) {
  return badges
    .filter((b) => b.rule?.type !== "manual" && canEarn(b, learnerId))
    .map((b) => ({ id: b.id, name: b.name, icon: ICON_EMOJI[b.icon], reward: b.treasures, rule: engineRule(b.rule, lessons), custom: badgeSnapshot(b) }));
}

/**
 * BST-05: what a grown-up's "Award" records, or null when the child already has the badge
 * (a badge is earned once) or can't earn it.
 * @param {CustomBadge} b
 * @param {string} learnerId
 * @param {string[]} earned badge ids the learner has
 * @returns {{ badge: { badgeId: string, name: string, custom: object, manual: true }, treasures: number } | null}
 */
export function manualAward(b, learnerId, earned) {
  if (!canEarn(b, learnerId) || earned.includes(b.id)) return null;
  return {
    badge: { badgeId: b.id, name: b.name, custom: badgeSnapshot(b), manual: true },
    treasures: Math.min(Math.max(0, b.treasures | 0), BADGE_TREASURE_MAX),
  };
}

const metricWords = {
  stars: ["star", "stars"],
  lessons: ["lesson", "lessons"],
  "perfect-lessons": ["three-star lesson", "three-star lessons"],
  "goal-days": ["day meeting the daily goal", "days meeting the daily goal"],
  "mastered-items": ["word or picture mastered", "words or pictures mastered"],
};

/**
 * BST-02: the rule read back in plain English before saving.
 * @param {BadgeRule} rule
 * @param {{ lessons?: { id: string, title: string }[], by?: string }} [ctx] by: who awards a manual badge
 * @returns {string}
 */
export function ruleSummary(rule, ctx = {}) {
  const title = (id) => {
    const l = (ctx.lessons || []).find((x) => x.id === id);
    return l ? `“${l.title}”` : "a lesson";
  };
  const one = (r) => {
    switch (r.type) {
      case "manual":
        // "You award it" (a teacher's own screen), "Ms Priya awards it", "a grown-up awards it".
        return ctx.by ? `${ctx.by} ${ctx.by === "You" ? "award" : "awards"} it` : "a grown-up awards it";
      case "lesson":
        return `finish ${title(r.lesson)}`;
      case "mastery":
        return `master every card in ${title(r.lesson)}`;
      case "count": {
        const [s, p] = metricWords[r.metric] || ["thing", "things"];
        return `reach ${r.n} ${r.n === 1 ? s : p}`;
      }
      case "streak":
        return r.days === 1 ? "meet the daily goal on a day this week" : `meet the daily goal on ${r.days} days in a week`;
      case "assignment":
        return "finish everything assigned this week";
      case "combo": {
        const parts = r.all.map(one);
        const word = r.op === "and" ? " and " : " or ";
        return parts.length > 2 ? `${parts.slice(0, -1).join(", ")},${word}${parts.at(-1)}` : parts.join(word);
      }
      default:
        return "";
    }
  };
  const text = one(rule);
  if (rule.type === "manual") return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  return `Earned when they ${text}.`;
}

/**
 * Custom badges for the badge book, newest first, from each award's snapshot, so a badge a
 * grown-up deleted still shows. Hidden badges are left out (BDG-07).
 * @param {{ customAwards?: Record<string, any>, hiddenBadges?: string[] }} state derived state
 */
export function earnedCustom(state) {
  const hidden = new Set(state.hiddenBadges || []);
  return Object.entries(state.customAwards || {})
    .filter(([id]) => !hidden.has(id))
    .map(([id, a]) => ({ id, ...a }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
