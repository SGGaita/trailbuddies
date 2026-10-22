"use client";
import { useEffect, useEffectEvent, useState } from "react";
import { speak } from "./speech";
import { useFamily } from "./store";

/** Seedlings and Sprouts can't read yet: instructions are spoken for them (LES-17). */
export const isNonReader = (band) => band === "seedling" || band === "sprout";

/** Say `text` once when the screen opens, for non-readers. */
export function useSpokenPrompt(text, band) {
  const voice = useFamily((s) => s.settings.voice);
  const say = useEffectEvent(() => speak(text, { band, enabled: voice }));
  const on = !!text && isNonReader(band);
  useEffect(() => {
    if (on) say();
  }, [on]);
}

/**
 * Places on the map (MAP-01): for non-readers the first tap says the place's name and
 * the second opens it; readers go straight in.
 * @returns {(id: string, name: string) => (e: React.MouseEvent) => void}
 */
export function useTapToHear(band) {
  const voice = useFamily((s) => s.settings.voice);
  const [armed, setArmed] = useState(null);
  return (id, name) => (e) => {
    if (!isNonReader(band) || armed === id) return;
    e.preventDefault();
    setArmed(id);
    speak(name, { band, enabled: voice });
  };
}
