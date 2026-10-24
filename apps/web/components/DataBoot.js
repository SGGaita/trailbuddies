"use client";
import { useEffect } from "react";
import { useFamily } from "@/lib/store";
import { refreshAccount, syncNow } from "@/lib/account";
import { installStoredPacks, syncPacks } from "@/lib/packs";

const EVERY_MS = 60_000;

/**
 * Loads the event log from IndexedDB once the store has hydrated and, for a signed-in
 * family, refreshes the account and keeps syncing: every minute while visible, when the
 * device comes back online, and shortly after any local change (lib/account.js).
 */
export default function DataBoot() {
  useEffect(() => {
    let timer = null;
    const boot = async () => {
      // Downloaded content packs first, so every screen renders with them (OFF-02).
      await installStoredPacks();
      const s = useFamily.getState();
      if (s.mode) await s.loadEvents();
      else useFamily.setState({ eventsReady: true });
      if (useFamily.getState().mode === "account") {
        await refreshAccount();
        syncNow();
      }
      syncPacks();
      timer = setInterval(() => document.visibilityState === "visible" && syncNow(), EVERY_MS);
    };
    if (useFamily.persist.hasHydrated()) boot();
    const unsub = useFamily.persist.onFinishHydration(boot);
    const online = () => {
      syncNow();
      syncPacks();
    };
    window.addEventListener("online", online);
    return () => {
      unsub();
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, []);
  return null;
}
