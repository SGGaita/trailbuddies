/**
 * Daily goal and the gentle streak (RWD-08): a day counts when the daily goal is met.
 * Missed days use up to `restDays` rest days per week (Monday to Sunday) without breaking
 * the streak, and nothing earned is ever taken away.
 */
import { dayKey } from "./buddy.js";

const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Monday of the week a day is in, as a key. */
const weekOf = (d) => dayKey(new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY));

/**
 * Lessons finished per day.
 * @param {Array<{ at: number }>} results
 * @returns {Record<string, number>}
 */
export function lessonsByDay(results) {
  const out = {};
  for (const r of results) {
    const k = dayKey(new Date(r.at));
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

/**
 * @param {Record<string, number>} byDay lessons per day
 * @param {{ goal: number, restDays?: number, now?: Date }} opts
 * @returns {{ days: number, goalDays: number, week: Array<{ day: string, status: "goal" | "rest" | "missed" | "today" }> }}
 */
export function streakInfo(byDay, { goal, restDays = 2, now = new Date() }) {
  const today = startOfDay(now);
  const met = (d) => (byDay[dayKey(d)] || 0) >= goal;
  const restUsed = {};
  const status = {};
  const order = [];
  let days = 0;
  let oldestGoal = -1;
  // Walk back from today. Today only counts once it's met; it never breaks the streak.
  for (let i = 0; i < 400; i++) {
    const d = new Date(today.getTime() - i * DAY);
    const k = dayKey(d);
    order.push(k);
    if (met(d)) {
      days++;
      oldestGoal = i;
      status[k] = "goal";
    } else if (i === 0) status[k] = "today";
    else if ((restUsed[weekOf(d)] || 0) < restDays) {
      restUsed[weekOf(d)] = (restUsed[weekOf(d)] || 0) + 1;
      status[k] = "rest";
    } else break;
  }
  // Rest days only count inside a streak: older than its first goal day they were just missed.
  order.forEach((k, i) => {
    if (status[k] === "rest" && i > oldestGoal) status[k] = "missed";
  });
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * DAY);
    const k = dayKey(d);
    return { day: k, status: status[k] || (met(d) ? "goal" : i === 6 ? "today" : "missed") };
  });
  const goalDays = Object.values(byDay).filter((n) => n >= goal).length;
  return { days, goalDays, week };
}

/** Days in the last `window` days (including today) that met the goal. */
export function goalDaysWithin(byDay, { goal, window, now = new Date() }) {
  const today = startOfDay(now);
  let n = 0;
  for (let i = 0; i < window; i++) if ((byDay[dayKey(new Date(today.getTime() - i * DAY))] || 0) >= goal) n++;
  return n;
}
