"use client";
import { useEffect } from "react";

// Registers the offline service worker in production builds only
// (in `next dev` it would cache stale development bundles).
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
