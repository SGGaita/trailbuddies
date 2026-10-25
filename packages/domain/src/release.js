// "What's new" for grown-ups after an update (OFF-06). Notes are i18n keys, newest first.

/** @type {{ version: string, date: string, notes: string[] }[]} */
export const RELEASES = [
  {
    version: "0.7.0",
    date: "2026-11-02",
    notes: ["whatsNew.s7.privacy", "whatsNew.s7.learners", "whatsNew.s7.calm", "whatsNew.s7.voice"],
  },
];

/** "0.10.1" > "0.9.9". @param {string} a @param {string} b */
export function compareVersions(a, b) {
  const pa = String(a || "0")
    .split(".")
    .map(Number);
  const pb = String(b || "0")
    .split(".")
    .map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

/**
 * Releases a grown-up hasn't seen yet. A first-ever visit shows nothing (no "what's new" on day one).
 * @param {string | null | undefined} lastSeen
 * @param {string} current
 */
export function unseenReleases(lastSeen, current, releases = RELEASES) {
  if (!lastSeen) return [];
  return releases.filter(
    (r) => compareVersions(r.version, lastSeen) > 0 && compareVersions(r.version, current) <= 0,
  );
}
