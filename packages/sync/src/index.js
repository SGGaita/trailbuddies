/**
 * Progress is an append-only event log (development plan §4.3). Events go to a
 * local outbox first and are sent in batches; derived state (stars, wallet) is
 * always recomputed from events, so every device agrees after a merge.
 */
import { ulid } from "./ulid.js";

export { ulid };

/** @typedef {"lesson_completed" | "item_answered" | "treasure_earned" | "treasure_spent" | "badge_awarded"} EventType */
/**
 * @typedef {object} ProgressEvent
 * @property {string} id ULID
 * @property {EventType} type
 * @property {string} learnerId
 * @property {string} at ISO time
 * @property {Record<string, unknown>} data
 */

export const EVENT_TYPES = [
  "lesson_completed",
  "item_answered",
  "treasure_earned",
  "treasure_spent",
  "badge_awarded",
];

/**
 * @param {EventType} type
 * @param {string} learnerId
 * @param {Record<string, unknown>} [data]
 * @param {Date} [now]
 * @returns {ProgressEvent}
 */
export function createEvent(type, learnerId, data = {}, now = new Date()) {
  if (!EVENT_TYPES.includes(type)) throw new Error(`Unknown event type: ${type}`);
  if (!learnerId) throw new Error("learnerId is required");
  return { id: ulid(now.getTime()), type, learnerId, at: now.toISOString(), data };
}

/**
 * Storage adapters (Dexie on web, op-sqlite on mobile) implement this interface.
 * @typedef {object} OutboxAdapter
 * @property {(e: ProgressEvent) => Promise<void>} put
 * @property {(limit: number) => Promise<ProgressEvent[]>} pending
 * @property {(ids: string[]) => Promise<void>} markSent
 */

/** In-memory adapter for tests and server-side rendering. @returns {OutboxAdapter & { all: () => ProgressEvent[] }} */
export function memoryOutbox() {
  const events = new Map();
  const sent = new Set();
  return {
    async put(e) {
      events.set(e.id, e);
    },
    async pending(limit) {
      return [...events.values()]
        .filter((e) => !sent.has(e.id))
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .slice(0, limit);
    },
    async markSent(ids) {
      ids.forEach((id) => sent.add(id));
    },
    all: () => [...events.values()],
  };
}

/**
 * Merge event lists from several devices: de-duplicated by id, ordered by id (time).
 * @param {...ProgressEvent[]} lists
 */
export function mergeEvents(...lists) {
  const byId = new Map();
  for (const list of lists) for (const e of list) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

/**
 * Derived state for one learner from their events.
 * - progress: best stars per lesson id (trophies use "<unit>-trophy")
 * - treasures: earned minus spent, never below zero
 * - answers: every item answer (for mastery and spaced review)
 * - results: every completed lesson in order (for difficulty, daily goal and minutes)
 * @param {ProgressEvent[]} events
 * @param {string} learnerId
 */
export function deriveState(events, learnerId) {
  /** @type {Record<string, number>} */
  const progress = {};
  let treasures = 0;
  const badges = new Set();
  /** @type {Array<{ itemId: string, firstTry: boolean, at: number }>} */
  const answers = [];
  /** @type {Array<{ lessonId: string, unitId?: string, subjectId?: string, kind: string, stars: number, at: number, durationSec: number }>} */
  const results = [];
  const ordered = [...events].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const e of ordered) {
    if (e.learnerId !== learnerId) continue;
    const d = /** @type {any} */ (e.data);
    const at = Date.parse(e.at);
    if (e.type === "lesson_completed") {
      // Reviews are practice: they count for the day and for mastery, not for trail stars.
      if (d.kind !== "review") progress[d.lessonId] = Math.max(progress[d.lessonId] || 0, d.stars || 0);
      results.push({ lessonId: d.lessonId, unitId: d.unitId, subjectId: d.subjectId, kind: d.kind || "lesson", stars: d.stars || 0, at, durationSec: d.durationSec || 0 });
    } else if (e.type === "item_answered") answers.push({ itemId: d.itemId, firstTry: !!d.firstTry, at });
    else if (e.type === "treasure_earned") treasures += d.amount || 0;
    else if (e.type === "treasure_spent") treasures -= d.amount || 0;
    else if (e.type === "badge_awarded") badges.add(d.badgeId);
  }
  const stars = Object.values(progress).reduce((a, b) => a + b, 0);
  return { progress, stars, treasures: Math.max(0, treasures), badges: [...badges], answers, results };
}

/**
 * Lessons and minutes for a calendar day, and minutes for each of the last 7 days (oldest first).
 * @param {Array<{ at: number, durationSec: number }>} results
 * @param {Date} now
 */
export function activity(results, now = new Date()) {
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = dayStart(now);
  const DAY = 86400000;
  const week = Array.from({ length: 7 }, (_, i) => {
    const from = today - (6 - i) * DAY;
    const mins = results.filter((r) => r.at >= from && r.at < from + DAY).reduce((n, r) => n + r.durationSec, 0) / 60;
    return Math.round(mins);
  });
  const todays = results.filter((r) => r.at >= today);
  return { lessonsToday: todays.length, minutesToday: Math.round(todays.reduce((n, r) => n + r.durationSec, 0) / 60), week };
}

export { createSyncer, newer } from "./client.js";
