/**
 * The parent gate (concept report §9): a sum young children can't do, before anything in
 * the grown-up zone. A PIN is offered too, and suggested once a learner is 8 or older
 * (needsPin in bands.js), because older children can do the sum.
 */
import { rng } from "./random.js";

/**
 * A two-digit by one-digit multiplication, e.g. "What is 14 × 6?".
 * @param {number} [seed]
 * @returns {{ text: string, say: string, answer: number }}
 */
export function gateQuestion(seed = Date.now()) {
  const r = rng(seed);
  const a = 12 + Math.floor(r() * 38); // 12–49
  const b = 3 + Math.floor(r() * 7); // 3–9
  return { text: `What is ${a} × ${b}?`, say: `What is ${a} times ${b}?`, answer: a * b };
}

/** @param {{ answer: number }} q @param {string} input */
export const gatePasses = (q, input) => String(input).trim() !== "" && Number(input) === q.answer;

/**
 * A PIN is 4 digits and not too easy to guess.
 * @param {string} pin
 * @returns {null | "length" | "easy"} the problem, or null when it's fine
 */
export function pinProblem(pin) {
  if (!/^\d{4}$/.test(pin)) return "length";
  if (/^(\d)\1{3}$/.test(pin)) return "easy";
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((x, i) => x - d[i]);
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return "easy";
  return null;
}

/** Locked out for a while after this many wrong PINs or sums in a row. */
export const GATE_MAX_TRIES = 5;
export const GATE_LOCK_MS = 60_000;
