// Feature flags (OPS-06): the server decides; the app keeps the last answer for offline use.
// Unknown or missing flags are off. Demo mode has no server, so it uses DEMO_FLAGS.

/** Flags the apps know about. */
export const FLAGS = ["beta-feedback", "beta-faq"];

/** The demo family shows the beta tools so they can be tried without an account. */
export const DEMO_FLAGS = { "beta-feedback": true, "beta-faq": true };

/** @param {Record<string, boolean> | null | undefined} flags @param {string} key */
export const flagOn = (flags, key) => Boolean(flags && flags[key] === true);
