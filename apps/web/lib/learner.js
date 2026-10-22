import { deriveState, activity } from "@trailbuddies/sync";
import {
  ageFrom,
  bandForAge,
  effectiveLevel,
  foldMastery,
  dueForReview,
  isAdult,
} from "@trailbuddies/domain";
import { getReadyUnits } from "@trailbuddies/content";

/**
 * Compose a learner's view from their profile and the event log: progress, treasures,
 * mastery, today's goal, week minutes, band and the difficulty level per subject.
 * Pure (no React), so it can be tested and reused by the mobile app.
 * @param {any} learner profile
 * @param {any[]} events whole family event log
 * @param {Date} [now]
 */
export function learnerView(learner, events, now = new Date()) {
  const state = deriveState(events, learner.id);
  const act = activity(state.results, now);
  const mastery = foldMastery(state.answers);
  const age = ageFrom(learner.birth, now);
  const band = bandForAge(age);
  /** @param {string} subjectId */
  const levelFor = (subjectId) =>
    effectiveLevel(
      learner.difficulty,
      band,
      state.results.filter((r) => r.subjectId === subjectId && r.kind === "lesson").map((r) => r.stars),
    );
  /** Items in a subject that need review now. @param {string} subjectId */
  const reviewDue = (subjectId) =>
    dueForReview(
      mastery,
      now.getTime(),
      getReadyUnits(subjectId).flatMap((u) => u.items.map((i) => i.id)),
    );
  return {
    ...learner,
    ...state,
    mastery,
    age,
    band,
    adult: isAdult(age),
    today: act.lessonsToday,
    minutes: act.minutesToday,
    week: act.week,
    levelFor,
    reviewDue,
  };
}
