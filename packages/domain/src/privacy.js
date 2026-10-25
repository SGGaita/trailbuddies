// Privacy rules shared by the screens (FAM-03, SAF-04, ONB-06b). Mirrors services/api.

/** Days a removed learner or a deleted family can still be brought back. */
export const UNDO_DAYS = 7;
const DAY = 86_400_000;

/**
 * When a learner removed at `removingAt` is deleted for good.
 * @param {string | null | undefined} removingAt ISO time
 * @returns {Date | null}
 */
export function purgeDate(removingAt) {
  if (!removingAt) return null;
  return new Date(new Date(removingAt).getTime() + UNDO_DAYS * DAY);
}

/** Whole days left to undo (0 on the last day). @param {string} removingAt @param {Date} [now] */
export function undoDaysLeft(removingAt, now = new Date()) {
  const end = purgeDate(removingAt);
  return end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY)) : 0;
}

/** Learners whose undo window has ended. @param {{ removing_at?: string | null }[]} list @param {Date} [now] */
export function overdueRemovals(list, now = new Date()) {
  return list.filter((l) => l.removing_at && purgeDate(l.removing_at).getTime() <= now.getTime());
}

/** Regions where a checkbox isn't enough: a signed form is reviewed by a person (COPPA). */
export const SIGNED_FORM_REGIONS = ["us-coppa"];

/** @param {string | null | undefined} region */
export const needsSignedForm = (region) => SIGNED_FORM_REGIONS.includes(region || "");

const norm = (v) =>
  String(v || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

/**
 * Check the signed form before sending. Returns the problems, empty when it's fine.
 * @param {{ parent_name?: string, signature?: string, relationship?: string }} form
 * @returns {("name" | "signature" | "relationship")[]}
 */
export function signedFormProblems(form) {
  const out = [];
  if (norm(form.parent_name).length < 3 || !norm(form.parent_name).includes(" ")) out.push("name");
  if (!norm(form.signature) || norm(form.signature) !== norm(form.parent_name)) out.push("signature");
  if (!["parent", "guardian"].includes(form.relationship || "")) out.push("relationship");
  return out;
}

/**
 * Where consent stands: none, pending (a signed form waiting for review), rejected or approved.
 * @param {{ status?: string } | null | undefined} consent
 */
export function consentState(consent) {
  if (!consent) return "none";
  return consent.status === "pending" || consent.status === "rejected" ? consent.status : "approved";
}
