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
 * Stars keep the best result per lesson; the wallet is the sum of earn/spend.
 * @param {ProgressEvent[]} events
 * @param {string} learnerId
 */
export function deriveState(events, learnerId) {
  /** @type {Record<string, number>} */
  const progress = {};
  let treasures = 0;
  const badges = new Set();
  for (const e of events) {
    if (e.learnerId !== learnerId) continue;
    const d = /** @type {any} */ (e.data);
    if (e.type === "lesson_completed")
      progress[d.lessonId] = Math.max(progress[d.lessonId] || 0, d.stars || 0);
    else if (e.type === "treasure_earned") treasures += d.amount || 0;
    else if (e.type === "treasure_spent") treasures -= d.amount || 0;
    else if (e.type === "badge_awarded") badges.add(d.badgeId);
  }
  const stars = Object.values(progress).reduce((a, b) => a + b, 0);
  return { progress, stars, treasures: Math.max(0, treasures), badges: [...badges] };
}
