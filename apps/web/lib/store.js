"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useMemo, useState } from "react";
import { ulid } from "@trailbuddies/sync";
import { seedFamily } from "./seed";
import { learnerView } from "./learner";
import { familyDb, loadEvents, saveEvents } from "./db";

const safeStorage = createJSONStorage(() => {
  try {
    const k = "__tb_probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
  }
});

export const DEFAULT_SETTINGS = {
  goal: 2,
  limit: 20,
  bedtime: { on: false, start: "19:30", end: "06:30" },
  voice: true,
  voice_rate: 1,
  sound: true,
};

const empty = () => ({
  /** @type {null | "demo" | "account"} */
  mode: null,
  /** @type {null | { id: string, email: string, name: string }} */
  user: null,
  /** @type {any} */
  family: null,
  settings: DEFAULT_SETTINGS,
  learners: /** @type {any[]} */ ([]),
  waiting: /** @type {any[]} */ ([]),
  activeId: /** @type {string | null} */ (null),
  /** Learners removed on this device that the server still has. */
  removed: /** @type {string[]} */ ([]),
});

/** Called after local changes so account mode can sync (set by lib/account.js). */
let afterChange = () => {};
export const onLocalChange = (fn) => {
  afterChange = fn;
};

const now = () => new Date().toISOString();
/** The IndexedDB name for the current mode. */
export const dbName = (s) => (s.mode === "demo" ? "demo" : s.family?.id || null);

/**
 * Local-first family store. Profiles, settings and the session's mode persist in
 * localStorage; the event log lives in IndexedDB (lib/db.js) and is loaded into memory.
 * Every profile or settings edit is stamped with `updated_at` and marked dirty until the
 * server has it (last edit wins).
 */
export const useFamily = create(
  persist(
    (set, get) => ({
      ...empty(),
      events: /** @type {any[]} */ ([]),
      eventsReady: false,
      sync: { state: "idle", at: null, pending: 0 },
      gateUntil: 0,

      /** Load the demo family into its own database (never uploaded). */
      startDemo: async () => {
        const seed = seedFamily();
        const db = familyDb("demo");
        await db.events.clear();
        await saveEvents(db, seed.events, 1);
        set({
          ...empty(),
          mode: "demo",
          family: { ...seed.family, id: "demo", role: "owner" },
          settings: { ...DEFAULT_SETTINGS, ...seed.settings },
          learners: seed.learners,
          waiting: seed.waiting,
          events: seed.events,
          eventsReady: true,
        });
      },
      /** Leave the demo or sign out on this device. */
      clear: () => set({ ...empty(), events: [], eventsReady: true, gateUntil: 0 }),
      /** @param {Partial<ReturnType<typeof empty>>} patch */
      patch: (patch) => set(patch),
      /** Load events for the current mode from IndexedDB. */
      loadEvents: async () => {
        const name = dbName(get());
        const events = name ? await loadEvents(familyDb(name)) : [];
        set({ events, eventsReady: true });
      },

      setActive: (id) => set({ activeId: id }),
      toggleVoice: () => get().setSettings({ voice: !get().settings.voice }),
      /** @param {Partial<typeof DEFAULT_SETTINGS>} patch */
      setSettings: (patch) => {
        set((s) => ({
          settings: { ...s.settings, ...patch },
          family: s.family ? { ...s.family, updated_at: now(), dirty: true } : s.family,
        }));
        afterChange();
      },
      /** @param {{ salt: string, hash: string, iterations: number } | null} pin */
      setPin: (pin) => {
        set((s) => ({ family: { ...s.family, pin, updated_at: now(), dirty: true } }));
        afterChange();
      },
      /** Add a learner profile; the id is made here so it works offline. */
      addLearner: (profile) => {
        const id = ulid();
        set((s) => ({
          learners: [
            ...s.learners,
            {
              id,
              buddy: null,
              outfit: {},
              interests: [],
              placement: {},
              difficulty: "auto",
              ...profile,
              updated_at: now(),
              dirty: true,
            },
          ],
        }));
        afterChange();
        return id;
      },
      /** @param {string} id @param {object} patch */
      updateLearner: (id, patch) => {
        set((s) => ({
          learners: s.learners.map((l) =>
            l.id === id ? { ...l, ...patch, updated_at: now(), dirty: true } : l,
          ),
        }));
        afterChange();
      },
      /** @param {string} id */
      removeLearner: (id) => {
        set((s) => ({
          learners: s.learners.filter((l) => l.id !== id),
          removed: s.mode === "account" ? [...s.removed, id] : s.removed,
          activeId: s.activeId === id ? null : s.activeId,
        }));
        afterChange();
      },
      /** @param {string} learnerId @param {"auto" | "1" | "2" | "3"} difficulty */
      setDifficulty: (learnerId, difficulty) => get().updateLearner(learnerId, { difficulty }),
      /** Append events (built with createEvent): memory now, IndexedDB and the outbox next. */
      record: (events) => {
        const s = get();
        set({ events: [...s.events, ...events] });
        const name = dbName(s);
        if (name) saveEvents(familyDb(name), events, s.mode === "demo" ? 1 : 0).then(() => afterChange());
      },
      /** The grown-up zone stays open for 10 minutes after the gate. */
      unlockGate: () => set({ gateUntil: Date.now() + 10 * 60_000 }),
      lockGate: () => set({ gateUntil: 0 }),
      active: () => get().learners.find((l) => l.id === get().activeId) || null,
    }),
    {
      name: "trailbuddies-family-v3",
      storage: safeStorage,
      version: 3,
      partialize: ({ mode, user, family, settings, learners, waiting, activeId, removed }) => ({
        removed,
        mode,
        user,
        family,
        settings,
        learners,
        waiting,
        activeId,
      }),
    },
  ),
);

/** True once the persisted store and the event log have loaded (avoids hydration mismatches). */
export function useHydrated() {
  const [ok, setOk] = useState(false);
  const eventsReady = useFamily((s) => s.eventsReady);
  useEffect(() => {
    const done = () => setOk(true);
    if (useFamily.persist.hasHydrated()) done();
    return useFamily.persist.onFinishHydration(done);
  }, []);
  return ok && eventsReady;
}

/**
 * A learner's profile plus everything derived from the event log.
 * @param {string | null | undefined} [id] defaults to the active learner
 */
export function useLearner(id) {
  const learnerId = useFamily((s) => id ?? s.activeId);
  const learner = useFamily((s) => s.learners.find((l) => l.id === learnerId));
  const events = useFamily((s) => s.events);
  return useMemo(() => (learner ? learnerView(learner, events) : null), [learner, events]);
}

/** Every learner with derived state (parent dashboard). */
export function useLearners() {
  const learners = useFamily((s) => s.learners);
  const events = useFamily((s) => s.events);
  return useMemo(() => learners.map((l) => learnerView(l, events)), [learners, events]);
}
