/**
 * The hint ladder (concept report §5.1). There is never a buzzer:
 *   1st miss: the buddy repeats the question.
 *   2nd miss: one wrong choice disappears and the right one glows.
 *   3rd miss: the buddy shows the answer; the child taps it to go on, and the item comes back in review.
 * A grown-up can make a custom lesson's hints lighter (BLD-06):
 *   "light": the buddy repeats the question but takes no choices away; the answer shows on the 3rd miss.
 *   "none":  only "try again" until the 4th miss, then the answer shows so nobody gets stuck.
 */

/** @typedef {"correct" | "repeat" | "eliminate" | "reveal" | "ignore"} HintEffect */
/**
 * @typedef {object} LadderState
 * @property {number} misses
 * @property {boolean} revealed
 * @property {boolean} done
 * @property {string[]} removed option ids taken away by the "eliminate" step
 */

/** @returns {LadderState} */
export const startLadder = () => ({ misses: 0, revealed: false, done: false, removed: [] });

/**
 * Apply one answer.
 * @param {LadderState} state
 * @param {boolean} correct
 * @param {{ wrongOptionIds?: string[], chosenId?: string, hints?: "full" | "light" | "none" }} [ctx]
 *   remaining wrong options (for "eliminate") and how much help to give
 * @returns {{ state: LadderState, effect: HintEffect, firstTry: boolean, removeId?: string }}
 */
export function answer(state, correct, ctx = {}) {
  if (state.done) return { state, effect: "ignore", firstTry: false };
  if (correct) {
    return { state: { ...state, done: true }, effect: "correct", firstTry: state.misses === 0 };
  }
  if (state.revealed) return { state, effect: "reveal", firstTry: false };
  const misses = state.misses + 1;
  const hints = ctx.hints || "full";
  if (hints !== "full") {
    const revealAt = hints === "none" ? 4 : 3;
    if (misses < revealAt) return { state: { ...state, misses }, effect: "repeat", firstTry: false };
    return { state: { ...state, misses, revealed: true }, effect: "reveal", firstTry: false };
  }
  if (misses === 1) return { state: { ...state, misses }, effect: "repeat", firstTry: false };
  if (misses === 2) {
    const candidates = (ctx.wrongOptionIds || []).filter((id) => !state.removed.includes(id));
    const removeId = candidates.find((id) => id !== ctx.chosenId) ?? candidates[0];
    if (removeId) {
      return {
        state: { ...state, misses, removed: [...state.removed, removeId] },
        effect: "eliminate",
        firstTry: false,
        removeId,
      };
    }
  }
  return { state: { ...state, misses, revealed: true }, effect: "reveal", firstTry: false };
}

/** Total hints a lesson used (each miss is one rung of the ladder). */
export const hintsUsed = (/** @type {LadderState[]} */ states) => states.reduce((n, s) => n + s.misses, 0);
