"use client";
import { useEffect } from "react";

/**
 * Registers the offline service worker in production builds only (in `next dev` it would
 * cache stale development bundles).
 *
 * OFF-06: a new version never interrupts a lesson. The new worker downloads in the background
 * and waits; it takes over the next time the app starts (this component mounting on a fresh
 * page load), with one quick reload before anyone is mid-lesson. Grown-ups then see
 * "What's new" on their home screen.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
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
