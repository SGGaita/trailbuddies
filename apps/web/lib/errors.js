"use client";
import { scrubText, scrubPath, scrubEvent, scrubCrumb } from "@trailbuddies/domain";
import { api } from "./account";
import { useFamily } from "./store";
import { RELEASE } from "./version";

/**
 * Error reports without child data (SAF-07). Two switchable backends:
 * - "sentry" (when NEXT_PUBLIC_SENTRY_DSN is set): errors only, no Session Replay, no
 *   performance tracing, no PII, no DOM or console breadcrumbs, everything scrubbed;
 * - "own": a scrubbed report POSTed to our API (/errors), kept 30 days.
 * NEXT_PUBLIC_TB_ERRORS=sentry | own | off overrides the choice.
 */
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";
const CHOICE = process.env.NEXT_PUBLIC_TB_ERRORS || "";
export const ERROR_BACKEND = ["sentry", "own", "off"].includes(CHOICE) ? CHOICE : DSN ? "sentry" : "own";

/** Learner names on this device: replaced with [child] in every report. */
const names = () => {
  const s = useFamily.getState();
  return [...(s.learners || []), ...(s.removing || [])].map((l) => l.name).filter(Boolean);
};

let sentry = null;
let started = false;
let sent = 0;
const seen = new Set();
const MAX_PER_PAGE = 10;

async function own(error, screen) {
  if (sent >= MAX_PER_PAGE) return;
  const message = scrubText(error?.message || String(error), names(), 500) || "Error";
  const key = message + screen;
  if (seen.has(key)) return;
  seen.add(key);
  sent++;
  try {
    await api.reportError({
      source: "web",
      release: RELEASE.slice(0, 32),
      screen: scrubPath(screen),
      message,
      stack: scrubText(error?.stack || "", names(), 4000),
    });
  } catch {
    /* offline or the API is down: drop it */
  }
}

/** Start catching uncaught errors (once). */
export async function startErrorReports() {
  if (started || typeof window === "undefined" || ERROR_BACKEND === "off") return;
  started = true;
  if (ERROR_BACKEND === "sentry" && DSN) {
    const S = await import("@sentry/browser");
    S.init({
      dsn: DSN,
      release: RELEASE,
      environment: process.env.NEXT_PUBLIC_TB_CHANNEL || "development",
      sendDefaultPii: false,
      defaultIntegrations: false,
      integrations: [S.globalHandlersIntegration(), S.linkedErrorsIntegration(), S.dedupeIntegration()],
      tracesSampleRate: 0,
      maxBreadcrumbs: 20,
      beforeBreadcrumb: (crumb) => scrubCrumb(crumb, names()),
      beforeSend: (event) => scrubEvent(event, names()),
    });
    sentry = S;
    return;
  }
  window.addEventListener("error", (e) => own(e.error || e.message, location.pathname));
  window.addEventListener("unhandledrejection", (e) => own(e.reason, location.pathname));
}

/** Report an error a screen caught (error boundaries). @param {unknown} error */
export function reportError(error) {
  if (ERROR_BACKEND === "off" || typeof window === "undefined") return;
  if (sentry) sentry.captureException(error);
  else own(error, location.pathname);
}
