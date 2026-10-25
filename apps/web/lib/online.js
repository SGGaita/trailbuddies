"use client";
import { useSyncExternalStore } from "react";

const subscribe = (fn) => {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
};

/** True while the device says it's online (always true while rendering on the server). */
export const useOnline = () =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine !== false,
    () => true,
  );
