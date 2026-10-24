/**
 * Break reminders (PAR-04). Off unless a grown-up picks an interval. When that much play
 * has passed since the last break, the buddy leads a 30-second stretch after the current
 * lesson (never in the middle of one).
 */

export const BREAK_CHOICES = [0, 10, 15, 20, 30];
export const STRETCH_SECONDS = 30;

/** The buddy's three moves, 10 seconds each. */
export const STRETCH_MOVES = [
  { id: "reach", say: "Reach up high, like a giraffe!", seconds: 10 },
  { id: "wiggle", say: "Wiggle your fingers and your toes!", seconds: 10 },
  { id: "breathe", say: "Now a big slow breath in, and out.", seconds: 10 },
];

/**
 * Minutes of play since the last break (or since the first lesson today).
 * @param {Array<{ at: number, durationSec?: number }>} results today's results, any order
 * @param {number | null} lastBreakAt ms timestamp of the last stretch today
 */
export function minutesSinceBreak(results, lastBreakAt) {
  const secs = results
    .filter((r) => !lastBreakAt || r.at > lastBreakAt)
    .reduce((n, r) => n + (r.durationSec || 0), 0);
  return Math.floor(secs / 60);
}

/**
 * Is a stretch due after this lesson?
 * @param {{ breaks?: number }} settings
 * @param {number} minutes minutes of play since the last break
 */
export const breakDue = (settings, minutes) => {
  const every = Number(settings?.breaks) || 0;
  return every > 0 && minutes >= every;
};
