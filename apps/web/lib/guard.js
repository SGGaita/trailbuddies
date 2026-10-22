"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFamily, useHydrated } from "./store";
import { setupStep } from "./account";

/**
 * Sends people who haven't finished setting up to the right onboarding step.
 * Returns true once the page may render.
 * @param {{ allow?: string }} [opts] the step this page itself is, so it isn't redirected away
 */
export function useSetupGuard({ allow } = {}) {
  const ready = useHydrated();
  const router = useRouter();
  const state = useFamily();
  const step = ready ? setupStep(state) : undefined;
  const go = ready && step && step !== allow ? step : null;
  useEffect(() => {
    if (go) router.replace(go);
  }, [go, router]);
  return ready && !go;
}
