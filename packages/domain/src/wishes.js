/**
 * Wishes (BST-07) and real-world badge rewards (BST-04).
 *
 * A grown-up adds a wish for a child ("Bedtime story of your choice", 100 treasures). The child
 * saves up; with enough treasures they tap "Ask for it", which holds the treasures. The grown-up
 * approves ("coming soon") and marks it delivered, which keeps the treasures spent, or says
 * "not now", which gives them back and leaves the wish on the list. The states come from events
 * (deriveState in @trailbuddies/sync), so they work offline and agree across devices.
 *
 * A custom badge with a real-world reward ("Pick Friday's movie") puts that reward on the
 * child's wishes as earned and on the grown-up's "To deliver" list until it's handed over.
 */

export const WISH_TITLE_MAX = 60;
export const WISH_PRICE_MAX = 1000;
/** Quick prices on the grown-up's form; any whole number up to the maximum also works. */
export const WISH_PRICES = [50, 100, 150, 250];

/**
 * @typedef {{ id: string, learner_id: string, title: string, price: number, emoji?: string, updated_at?: string }} Wish
 * @typedef {{ status: "open" | "asked" | "approved" | "delivered", held?: number, requestId?: string, at?: number }} WishState
 */

/**
 * Problems with a wish before it's saved, as i18n keys.
 * @param {Wish} w
 * @param {string[]} learners the family's learner ids
 */
export function wishProblems(w, learners) {
  const out = [];
  const title = (w.title || "").trim();
  if (!title || title.length > WISH_TITLE_MAX) out.push("title");
  if (!Number.isInteger(w.price) || w.price < 1 || w.price > WISH_PRICE_MAX) out.push("price");
  if (!learners.includes(w.learner_id)) out.push("learner");
  return out;
}

/**
 * C21 My wishes: the child's wishes with their progress, then rewards earned with badges.
 * @param {Wish[]} wishes all the family's wishes
 * @param {{ treasures: number, wishes?: Record<string, WishState>, customAwards?: Record<string, any>, rewardsDelivered?: string[] }} state the learner's derived state
 * @param {string} learnerId
 */
export function wishCards(wishes, state, learnerId) {
  const states = state.wishes || {};
  const cards = wishes
    .filter((w) => w.learner_id === learnerId)
    .map((w) => {
      const st = states[w.id] || { status: "open" };
      const open = st.status === "open";
      return {
        kind: "wish",
        id: w.id,
        title: w.title,
        emoji: w.emoji || "🎁",
        price: w.price,
        status: st.status,
        requestId: st.requestId,
        // Progress while saving up; full once asked (the treasures are held).
        percent: open ? Math.min(100, Math.round((state.treasures / w.price) * 100)) : 100,
        toGo: open ? Math.max(0, w.price - state.treasures) : 0,
        canAsk: open && state.treasures >= w.price,
      };
    })
    // Waiting ones first, then the closest to being ready, delivered last.
    .sort((a, b) => rank(a) - rank(b) || a.toGo - b.toGo || a.title.localeCompare(b.title));
  const delivered = new Set(state.rewardsDelivered || []);
  const rewards = Object.entries(state.customAwards || {})
    .filter(([, a]) => a.reward)
    .map(([badgeId, a]) => ({ kind: "reward", id: badgeId, title: a.reward, badge: a.name, delivered: delivered.has(badgeId), at: a.at }))
    .sort((a, b) => Number(a.delivered) - Number(b.delivered) || b.at - a.at);
  return [...cards, ...rewards];
}

const rank = (c) => ({ approved: 0, asked: 1, open: 2, delivered: 3 })[c.status] ?? 2;

/**
 * P16 "Waiting for you": wishes to answer, approved wishes to deliver, and real-world rewards to
 * hand over, across the family's children.
 * @param {Wish[]} wishes
 * @param {{ id: string, name: string, state: any }[]} learners each with derived state
 */
export function grownUpQueue(wishes, learners) {
  const requests = [];
  const approved = [];
  const toDeliver = [];
  for (const l of learners) {
    const states = l.state.wishes || {};
    for (const w of wishes.filter((x) => x.learner_id === l.id)) {
      const st = states[w.id];
      const item = { wish: w, learnerId: l.id, name: l.name, held: st?.held || 0, requestId: st?.requestId, at: st?.at || 0 };
      if (st?.status === "asked") requests.push(item);
      else if (st?.status === "approved") approved.push(item);
    }
    const delivered = new Set(l.state.rewardsDelivered || []);
    for (const [badgeId, a] of Object.entries(l.state.customAwards || {}))
      if (a.reward && !delivered.has(badgeId))
        toDeliver.push({ badgeId, badge: a.name, reward: a.reward, learnerId: l.id, name: l.name, at: a.at });
  }
  const oldest = (a, b) => a.at - b.at;
  return { requests: requests.sort(oldest), approved: approved.sort(oldest), toDeliver: toDeliver.sort(oldest) };
}

/** How many things are waiting for a grown-up (the Rewards tab's count). */
export const waitingCount = (q) => q.requests.length + q.approved.length + q.toDeliver.length;
