"use client";
import { useEffect } from "react";
import { useFamily } from "@/lib/store";
import { refreshAccount, syncNow } from "@/lib/account";
import { installStoredPacks, syncPacks } from "@/lib/packs";
import { startErrorReports } from "@/lib/errors";
import { APP_VERSION } from "@/lib/version";

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
      startErrorReports();
      const st = useFamily.getState();
      // OFF-06: a family that used an earlier version sees "What's new"; a new one doesn't.
      if (!st.seenVersion) st.markSeen(st.mode ? "0.6.0" : APP_VERSION);
      st.dropOverdue();
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
