/**
 * Progress is an append-only event log (development plan §4.3). Events go to a
 * local outbox first and are sent in batches; derived state (stars, wallet) is
 * always recomputed from events, so every device agrees after a merge.
 */
import { ulid } from "./ulid.js";

export { ulid };

/** @typedef {"lesson_completed" | "item_answered" | "treasure_earned" | "treasure_spent" | "badge_awarded" | "game_finished" | "wish_requested" | "wish_approved" | "wish_declined" | "wish_delivered" | "reward_delivered" | "badge_hidden"} EventType */
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
  "game_finished",
  // Wishes (BST-07): asking holds treasures; "not now" returns them; delivered keeps them spent.
  "wish_requested",
  "wish_approved",
  "wish_declined",
  "wish_delivered",
  // A custom badge's real-world reward was handed over (BST-04).
  "reward_delivered",
  // A grown-up hid (or showed again) a badge in the badge book; badges are never taken away (BDG-07).
  "badge_hidden",
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
  const badgeTiers = Object.create(null);
  const tiers = ["bronze", "silver", "gold"];
  const paidBadges = new Map();
  /** @type {Array<{ itemId: string, firstTry: boolean, at: number }>} */
  const answers = [];
  /** @type {Array<{ lessonId: string, unitId?: string, subjectId?: string, kind: string, stars: number, hints: number, at: number, durationSec: number }>} */
  const results = [];
  /** @type {Array<{ amount: number, reason: string, at: number }>} */
  const earnings = [];
  /** Items bought and kept. @type {string[]} */
  const owned = [];
  /** Purchases undone because the wallet would go below zero after a merge (RWD-04). */
  const reversed = [];
  /** @type {Array<{ game: string, unitId: string, at: number }>} */
  const games = [];
  /** Custom badges earned, with the design they had when earned (BDG-07). @type {Record<string, any>} */
  const customAwards = Object.create(null);
  const hidden = new Set();
  /** Each wish's state: open (nothing held), asked, approved or delivered. @type {Record<string, any>} */
  const wishes = Object.create(null);
  /** Wish requests that couldn't hold their treasures after a merge. */
  const refusedWishes = [];
  const rewardsDelivered = new Set();
  // Events are processed in ULID (time) order, so every device reaches the same balance.
  const ordered = [...events].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const e of ordered) {
    if (e.learnerId !== learnerId) continue;
    const d = /** @type {any} */ (e.data);
    const at = Date.parse(e.at);
    if (e.type === "lesson_completed") {
      // Reviews are practice: they count for the day and for mastery, not for trail stars.
      if (d.kind !== "review") progress[d.lessonId] = Math.max(progress[d.lessonId] || 0, d.stars || 0);
      results.push({
        lessonId: d.lessonId,
        unitId: d.unitId,
        subjectId: d.subjectId,
        kind: d.kind || "lesson",
        stars: d.stars || 0,
        hints: d.hints || 0,
        at,
        durationSec: d.durationSec || 0,
      });
    } else if (e.type === "item_answered") answers.push({ itemId: d.itemId, firstTry: !!d.firstTry, at });
    else if (e.type === "treasure_earned") {
      let amount = d.amount || 0;
      // Pay only up to the highest total earned for a badge, even when devices sync out of order.
      if (d.reason === "badge" && d.badgeId) {
        const total = d.badgeTotal ?? amount;
        amount = total - (paidBadges.get(d.badgeId) || 0);
        if (amount <= 0) continue;
        paidBadges.set(d.badgeId, total);
      }
      treasures += amount;
      earnings.push({ amount, reason: d.reason || "lesson", at });
    } else if (e.type === "treasure_spent") {
      const amount = d.amount || 0;
      if (treasures - amount < 0) reversed.push({ id: e.id, itemId: d.itemId, amount, at });
      else {
        treasures -= amount;
        if (d.itemId && !owned.includes(d.itemId)) owned.push(d.itemId);
      }
    } else if (e.type === "badge_awarded") {
      if (d.custom && !badges.has(d.badgeId)) customAwards[d.badgeId] = { ...d.custom, manual: !!d.manual, at };
      badges.add(d.badgeId);
      if (tiers.indexOf(d.tier) > tiers.indexOf(badgeTiers[d.badgeId])) badgeTiers[d.badgeId] = d.tier;
    }
    else if (e.type === "game_finished") games.push({ game: d.game, unitId: d.unitId, at });
    else if (e.type === "badge_hidden") {
      if (d.hidden === false) hidden.delete(d.badgeId);
      else hidden.add(d.badgeId);
    } else if (e.type === "reward_delivered") rewardsDelivered.add(d.badgeId);
    else if (e.type.startsWith("wish_") && d.wishId) {
      const w = wishes[d.wishId];
      const live = w && (w.status === "asked" || w.status === "approved");
      const same = !d.requestId || d.requestId === w?.requestId;
      if (e.type === "wish_requested") {
        // Asked twice (two devices): the first request counts.
        if (live || w?.status === "delivered") continue;
        const amount = Math.max(0, d.amount || 0);
        if (treasures - amount < 0) {
          refusedWishes.push({ id: e.id, wishId: d.wishId, amount, at });
          continue;
        }
        treasures -= amount;
        wishes[d.wishId] = { status: "asked", held: amount, requestId: e.id, at };
      } else if (!live || !same) continue;
      else if (e.type === "wish_approved") w.status = "approved";
      else if (e.type === "wish_delivered") wishes[d.wishId] = { ...w, status: "delivered", deliveredAt: at };
      else if (e.type === "wish_declined") {
        treasures += w.held;
        wishes[d.wishId] = { status: "open", held: 0, declinedAt: at };
      }
    }
  }
  const stars = Object.values(progress).reduce((a, b) => a + b, 0);
  return {
    progress,
    stars,
    treasures,
    badges: [...badges],
    badgeTiers,
    answers,
    results,
    earnings,
    owned,
    reversed,
    games,
    customAwards,
    hiddenBadges: [...hidden],
    wishes,
    refusedWishes,
    rewardsDelivered: [...rewardsDelivered],
  };
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
