/**
 * What a finished lesson adds up to: stars, treasures, the daily goal, "kept going"
 * praise and one answer per practised item for mastery. Pure, so the web and mobile
 * players share it.
 */
import { starsFor, treasuresFor, keptGoing } from "./scoring.js";

/**
 * @typedef {object} StepResult
 * @property {boolean} firstTry
 * @property {number} misses hint-ladder rungs used
 */

/**
 * @param {import("./lesson.js").Lesson} lesson
 * @param {Record<string, StepResult>} results by step id (question steps only)
 * @param {{ lessonsToday: number, goal: number }} day lessons finished today before this one
 */
export function lessonOutcome(lesson, results, { lessonsToday, goal }) {
  const questions = lesson.steps.filter((s) => s.type !== "intro");
  const answered = questions.filter((s) => results[s.id]);
  const firstTry = answered.filter((s) => results[s.id].firstTry).length;
  const total = answered.length;
  const hints = answered.reduce((n, s) => n + results[s.id].misses, 0);
  const stars = starsFor(firstTry, total);
  const perfect = total > 0 && firstTry === total;
  const reachedGoal = lessonsToday < goal && lessonsToday + 1 >= goal;
  const treasures = treasuresFor({ stars, perfect, reachedGoal, kind: lesson.kind });
  /** @type {Array<{ itemId: string, firstTry: boolean, stepId: string }>} */
  const answers = answered.flatMap((s) =>
    s.itemIds.map((itemId) => ({ itemId, firstTry: results[s.id].firstTry, stepId: s.id })),
  );
  return {
    stars,
    firstTry,
    total,
    hints,
    perfect,
    reachedGoal,
    treasures,
    keptGoing: keptGoing(hints),
    answers,
    complete: total === questions.length,
  };
}
