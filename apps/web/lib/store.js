"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import { seedFamily } from "./seed";

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
 * Local-first family store (Sprint 0). Sprint 2 swaps the seed for the API and
 * moves progress to the sync event log; screens keep reading the same shape.
 */
export const useFamily = create(
  persist(
    (set, get) => ({
      ...seedFamily(),
      /** @param {string} id */
      setActive: (id) => set({ activeId: id }),
      toggleVoice: () => set((s) => ({ settings: { ...s.settings, voice: !s.settings.voice } })),
      reset: () => set(seedFamily()),
      active: () => get().learners.find((l) => l.id === get().activeId) || null,
    }),
    { name: "trailbuddies-family-v1", storage: safeStorage, version: 1 },
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
