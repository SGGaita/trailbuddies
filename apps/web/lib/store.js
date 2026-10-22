"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useMemo, useState } from "react";
import { seedFamily } from "./seed";
import { learnerView } from "./learner";

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

/**
 * Local-first family store. Profiles and settings, plus an append-only event log
 * (ADR 0002). Everything a learner has done is derived from `events`; Sprint 2 adds
 * the outbox upload and replaces the seed with the API.
 */
export const useFamily = create(
  persist(
    (set, get) => ({
      ...seedFamily(),
      /** @param {string} id */
      setActive: (id) => set({ activeId: id }),
      toggleVoice: () => set((s) => ({ settings: { ...s.settings, voice: !s.settings.voice } })),
      /** @param {string} learnerId @param {"auto" | "1" | "2" | "3"} difficulty */
      setDifficulty: (learnerId, difficulty) =>
        set((s) => ({ learners: s.learners.map((l) => (l.id === learnerId ? { ...l, difficulty } : l)) })),
      /** Append events (already built with createEvent). */
      record: (events) => set((s) => ({ events: [...s.events, ...events] })),
      reset: () => set(seedFamily()),
      active: () => get().learners.find((l) => l.id === get().activeId) || null,
    }),
    { name: "trailbuddies-family-v2", storage: safeStorage, version: 2 },
  ),
);

/** True once the persisted store has loaded in the browser (avoids hydration mismatches). */
export function useHydrated() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const done = () => setOk(true);
    if (useFamily.persist.hasHydrated()) done();
    return useFamily.persist.onFinishHydration(done);
  }, []);
  return ok;
}

/**
 * A learner's profile plus everything derived from the event log.
 * @param {string | null | undefined} id defaults to the active learner
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
