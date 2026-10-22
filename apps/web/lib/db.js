"use client";
import Dexie from "dexie";

/**
 * On-device storage (IndexedDB via Dexie): the event log and its outbox, plus sync
 * metadata. One database per family, and a separate one for the demo family, so demo
 * events can never be uploaded. Profiles and settings are small and live in the store.
 */

/** @typedef {import("@trailbuddies/sync").ProgressEvent & { sent: 0 | 1 }} StoredEvent */

const open = new Map();

/** @param {string} name "demo" or a family id */
export function familyDb(name) {
  if (!open.has(name)) {
    const db = new Dexie(`trailbuddies-${name}`);
    db.version(1).stores({ events: "id, sent", meta: "key" });
    open.set(name, db);
  }
  return open.get(name);
}

const strip = ({ sent: _sent, seq: _seq, ...e }) => e;

/** Every event, oldest first. @param {Dexie} db */
export async function loadEvents(db) {
  return (await db.events.orderBy("id").toArray()).map(strip);
}

/**
 * @param {Dexie} db
 * @param {any[]} events
 * @param {0 | 1} sent 0 = waiting to upload, 1 = already on the server (or never to be uploaded)
 */
export async function saveEvents(db, events, sent) {
  await db.events.bulkPut(events.map((e) => ({ ...strip(e), sent })));
}

/** The outbox the sync client works through. @param {Dexie} db */
export function outbox(db) {
  return {
    async put(e) {
      await saveEvents(db, [e], 0);
    },
    async pending(limit) {
      return (await db.events.where("sent").equals(0).sortBy("id")).slice(0, limit).map(strip);
    },
    async markSent(ids) {
      await db.events.bulkUpdate(ids.map((id) => ({ key: id, changes: { sent: 1 } })));
    },
  };
}

/** @param {Dexie} db */
export const cursor = (db) => ({
  get: async () => (await db.meta.get("cursor"))?.value || 0,
  set: (n) => db.meta.put({ key: "cursor", value: n }),
});

/** @param {Dexie} db */
export const pendingCount = (db) => db.events.where("sent").equals(0).count();

/** Remove a family's local data (signing out on a shared device). @param {string} name */
export async function forget(name) {
  const db = familyDb(name);
  db.close();
  open.delete(name);
  await Dexie.delete(`trailbuddies-${name}`);
}
