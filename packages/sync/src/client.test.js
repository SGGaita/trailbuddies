import { createSyncer, newer, memoryOutbox, createEvent } from "./index.js";

function fakeServer() {
  const stored = [];
  return {
    stored,
    fail: false,
    async pushEvents(familyId, events) {
      if (this.fail) throw new Error("offline");
      const accepted = [];
      const rejected = [];
      for (const e of events) {
        if (e.learnerId === "ghost") rejected.push({ id: e.id, reason: "unknown learner" });
        else {
          if (!stored.some((s) => s.id === e.id)) stored.push({ ...e, seq: stored.length + 1 });
          accepted.push(e.id);
        }
      }
      return { accepted, rejected };
    },
    async pullEvents(familyId, after) {
      if (this.fail) throw new Error("offline");
      const rest = stored.filter((e) => e.seq > after);
      const page = rest.slice(0, 2);
      return { events: page, cursor: page.length ? page.at(-1).seq : after, more: rest.length > 2 };
    },
  };
}

test("pushes the outbox in batches, pulls pages, and saves the cursor", async () => {
  const api = fakeServer();
  const outbox = memoryOutbox();
  for (let i = 0; i < 5; i++) await outbox.put(createEvent("item_answered", "k", { i }, new Date(1e12 + i)));
  let cur = 0;
  const pulled = [];
  const s = createSyncer({
    api,
    familyId: "f",
    outbox,
    cursor: { get: () => cur, set: (n) => (cur = n) },
    onPulled: (ev) => pulled.push(...ev),
    batch: 2,
  });
  expect(await s.syncOnce()).toEqual({ pushed: 5, pulled: 5 });
  expect(await outbox.pending(10)).toEqual([]);
  expect(cur).toBe(5);
  expect(await s.syncOnce()).toEqual({ pushed: 0, pulled: 0 });
});

test("offline: nothing is lost and the next run catches up", async () => {
  const api = fakeServer();
  const outbox = memoryOutbox();
  await outbox.put(createEvent("item_answered", "k"));
  let cur = 0;
  const s = createSyncer({ api, familyId: "f", outbox, cursor: { get: () => cur, set: (n) => (cur = n) }, onPulled: () => {} });
  api.fail = true;
  await expect(s.syncOnce()).rejects.toThrow("offline");
  expect(await outbox.pending(10)).toHaveLength(1);
  api.fail = false;
  expect((await s.syncOnce()).pushed).toBe(1);
});

test("rejected events are not retried forever; overlapping runs share one", async () => {
  const api = fakeServer();
  const outbox = memoryOutbox();
  await outbox.put(createEvent("item_answered", "ghost"));
  let cur = 0;
  const s = createSyncer({ api, familyId: "f", outbox, cursor: { get: () => cur, set: (n) => (cur = n) }, onPulled: () => {} });
  const [a, b] = [s.syncOnce(), s.syncOnce()];
  expect(a).toBe(b);
  await a;
  expect(await outbox.pending(10)).toEqual([]);
});

test("newer() keeps the latest edit", () => {
  const a = { updated_at: "2026-10-01T10:00:00Z", name: "a" };
  const b = { updated_at: "2026-10-01T11:00:00Z", name: "b" };
  expect(newer(a, b).name).toBe("b");
  expect(newer(b, a).name).toBe("b");
  expect(newer(undefined, a)).toBe(a);
});
