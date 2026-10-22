/**
 * Two-way event sync for one family (ADR 0002). Push: send pending outbox events in
 * batches; accepted and rejected ids are both marked sent (a rejected event would never
 * be accepted on retry). Pull: fetch events after the saved cursor, page by page.
 * Network failures leave everything as it was, so the next run carries on.
 */

/**
 * @param {object} deps
 * @param {{ pushEvents: (familyId: string, events: any[]) => Promise<{ accepted: string[], rejected: Array<{ id: string }> }>, pullEvents: (familyId: string, after: number) => Promise<{ events: any[], cursor: number, more: boolean }> }} deps.api
 * @param {string} deps.familyId
 * @param {import("./index.js").OutboxAdapter} deps.outbox
 * @param {{ get: () => Promise<number> | number, set: (n: number) => Promise<void> | void }} deps.cursor
 * @param {(events: any[]) => Promise<void> | void} deps.onPulled
 * @param {number} [deps.batch]
 */
export function createSyncer({ api, familyId, outbox, cursor, onPulled, batch = 200 }) {
  let running = null;

  async function push() {
    let pushed = 0;
    for (;;) {
      const pending = await outbox.pending(batch);
      if (!pending.length) break;
      const res = await api.pushEvents(familyId, pending.map(({ seq: _seq, ...e }) => e));
      await outbox.markSent([...res.accepted, ...res.rejected.map((r) => r.id)]);
      pushed += res.accepted.length;
      if (pending.length < batch) break;
    }
    return pushed;
  }

  async function pull() {
    let after = (await cursor.get()) || 0;
    let pulled = 0;
    for (;;) {
      const page = await api.pullEvents(familyId, after);
      if (page.events.length) await onPulled(page.events);
      pulled += page.events.length;
      after = page.cursor;
      await cursor.set(after);
      if (!page.more) break;
    }
    return pulled;
  }

  /** Push then pull. Overlapping calls share one run. */
  function syncOnce() {
    if (!running) {
      running = (async () => {
        try {
          const pushed = await push();
          const pulled = await pull();
          return { pushed, pulled };
        } finally {
          running = null;
        }
      })();
    }
    return running;
  }

  return { syncOnce, push, pull };
}

/**
 * Last edit wins for profiles and settings: the record with the later `updated_at`.
 * @template {{ updated_at: string }} T
 * @param {T | undefined} a
 * @param {T | undefined} b
 * @returns {T | undefined}
 */
export function newer(a, b) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b.updated_at) > Date.parse(a.updated_at) ? b : a;
}
