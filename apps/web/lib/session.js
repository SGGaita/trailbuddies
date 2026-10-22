import { getUnit, getReadyUnits } from "@trailbuddies/content";
import { buildLesson, buildTrophy, buildReview, canPlay, rng } from "@trailbuddies/domain";
import { createEvent } from "@trailbuddies/sync";
import { trailUnits } from "./trail";

/**
 * Plan what the player should run. Returns `{ lesson }` or `{ blocked }` with the trail to go back to.
 * @param {{ kind: "lesson" | "trophy" | "review", unitId?: string, step?: string, subjectId?: string }} where
 * @param {any} learner learnerView
 * @param {number} seed
 */
export function planLesson(where, learner, seed) {
  const r = rng(seed);
  if (where.kind === "review") {
    const units = getReadyUnits(where.subjectId);
    const lesson = buildReview(units, learner.reviewDue(where.subjectId), {
      level: learner.levelFor(where.subjectId),
      band: learner.band,
      r,
    });
    return lesson ? { lesson } : { blocked: `/play/trail/${where.subjectId}` };
  }
  const unit = getUnit(where.unitId);
  if (!unit) return { blocked: "/play/map" };
  const back = `/play/trail/${unit.subject}`;
  const step = where.step === "trophy" ? "trophy" : Number(where.step);
  if (!canPlay(trailUnits(unit.subject), unit.id, step, learner.progress, learner.placement?.[unit.subject]))
    return { blocked: back };
  const opts = { level: learner.levelFor(unit.subject), band: learner.band, r };
  const lesson = step === "trophy" ? buildTrophy(unit, opts) : buildLesson(unit, step - 1, opts);
  return { lesson, back };
}

/**
 * Events for a finished (or left-early) lesson. Answers are always kept; the lesson only
 * counts, and treasures are only earned, when every question was answered.
 * @param {string} learnerId
 * @param {import("@trailbuddies/domain").Lesson} lesson
 * @param {ReturnType<typeof import("@trailbuddies/domain").lessonOutcome>} outcome
 * @param {{ durationSec: number, now?: Date }} opts
 */
export function completionEvents(learnerId, lesson, outcome, { durationSec, now = new Date() }) {
  const base = { lessonId: lesson.id, unitId: lesson.unitId, subjectId: lesson.subjectId };
  const events = outcome.answers.map((a) =>
    createEvent(
      "item_answered",
      learnerId,
      { ...base, itemId: a.itemId, stepId: a.stepId, firstTry: a.firstTry },
      now,
    ),
  );
  if (!outcome.complete) return events;
  events.push(
    createEvent(
      "lesson_completed",
      learnerId,
      {
        ...base,
        kind: lesson.kind,
        stars: outcome.stars,
        firstTry: outcome.firstTry,
        total: outcome.total,
        hints: outcome.hints,
        level: lesson.level,
        durationSec,
      },
      now,
    ),
    createEvent(
      "treasure_earned",
      learnerId,
      { amount: outcome.treasures, reason: lesson.kind, lessonId: lesson.id },
      now,
    ),
  );
  return events;
}
