"use client";
import { useEffect } from "react";

/**
 * Registers the offline service worker in production builds only (in `next dev` it would
 * cache stale development bundles), and removes a leftover one in development.
 *
 * OFF-06: a new version never interrupts a lesson. The new worker downloads in the background
 * and waits; it takes over the next time the app starts (this component mounting on a fresh
 * page load), with one quick reload before anyone is mid-lesson. Grown-ups then see
 * "What's new" on their home screen.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // A worker left behind by a production run on this address (pnpm start, e2e) would keep
      // serving old bundles to `next dev`, e.g. after a Next.js upgrade. Remove it and its caches.
      navigator.serviceWorker
        ?.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then((removed) => {
          if (!removed?.some(Boolean)) return;
          return caches?.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
        })
        .then((cleared) => cleared && location.reload())
        .catch(() => {});
      return;
    }
    if (!("serviceWorker" in navigator)) return;
    let reloading = false;
    const onChange = () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    };
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // A version downloaded last time is waiting: this is the next start, so apply it now.
        if (reg.waiting && navigator.serviceWorker.controller) {
          navigator.serviceWorker.addEventListener("controllerchange", onChange);
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      })
      .catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);
  return null;
}
