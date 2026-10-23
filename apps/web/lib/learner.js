import { deriveState, activity } from "@trailbuddies/sync";
import {
  ageFrom,
  bandForAge,
  effectiveLevel,
  foldMastery,
  dueForReview,
  isAdult,
  lessonsByDay,
  streakInfo,
} from "@trailbuddies/domain";
import { getReadyUnits, economy } from "@trailbuddies/content";

/** Earning reasons that count toward the daily cap. */
const CAPPED = new Set(["lesson", "trophy", "review", "game", "custom"]);

/**
 * Compose a learner's view from their profile and the event log: progress, treasures,
 * mastery, today's goal, week minutes, band and the difficulty level per subject.
 * Pure (no React), so it can be tested and reused by the mobile app.
 * @param {any} learner profile
 * @param {any[]} events whole family event log
 * @param {Date} [now]
 */
export function learnerView(learner, events, now = new Date(), { goal = 2 } = {}) {
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
  const byDay = lessonsByDay(state.results);
  const streak = streakInfo(byDay, { goal, restDays: economy.restDaysPerWeek, now });
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Earnings that count toward the daily cap (badges and grown-up gifts don't).
  const earnedToday = state.earnings
    .filter((e) => e.at >= todayStart && CAPPED.has(e.reason))
    .reduce((n, e) => n + e.amount, 0);
  // Only items the learner still owns are worn (a reversed purchase comes off).
  const outfit = Object.fromEntries(
    Object.entries(learner.outfit || {}).filter(([, id]) => state.owned.includes(id)),
  );
  return {
    ...learner,
    ...state,
    outfit,
    outfitChosen: learner.outfit || {},
    byDay,
    streak,
    goal,
    earnedToday,
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
