/**
 * Content packs (CNT-02, OFF-02). Each subject's units ship as a versioned pack; the
 * manifest lists every pack with its hash and size. A device keeps the packs for its
 * children's active subjects so lessons work offline, downloading in the background on
 * Wi-Fi and skipping what won't fit.
 */

/**
 * @typedef {object} PackEntry
 * @property {string} subject
 * @property {string} hash     content hash; a new hash means a new version
 * @property {number} bytes
 * @property {string[]} units
 */
/**
 * @typedef {object} Manifest
 * @property {string} release  e.g. "2027.03.1"
 * @property {"production" | "preview"} channel
 * @property {PackEntry[]} packs
 */

/**
 * Subjects to keep on this device: every subject a child has started, plus their
 * favourites, in that order (most useful first when space is short).
 * @param {Array<{ interests?: string[], started?: string[] }>} learners
 */
export function activeSubjects(learners) {
  const out = [];
  const add = (s) => s && !out.includes(s) && out.push(s);
  learners.forEach((l) => (l.started || []).forEach(add));
  learners.forEach((l) => (l.interests || []).forEach(add));
  return out;
}

/**
 * What to download now.
 * @param {Manifest} manifest
 * @param {Record<string, string>} cached subject -> hash already on this device
 * @param {string[]} wanted subjects in priority order
 * @param {{ free?: number, wifi?: boolean, force?: boolean }} [opts] free bytes (Infinity if unknown);
 *   downloads wait for Wi-Fi unless `force` (a grown-up tapped "Download now")
 * @returns {{ download: PackEntry[], upToDate: string[], noRoom: PackEntry[], waiting: boolean }}
 */
export function packPlan(manifest, cached, wanted, { free = Infinity, wifi = true, force = false } = {}) {
  const bySubject = new Map(manifest.packs.map((p) => [p.subject, p]));
  const download = [];
  const noRoom = [];
  const upToDate = [];
  let room = free;
  for (const s of wanted) {
    const p = bySubject.get(s);
    if (!p) continue;
    if (cached[s] === p.hash) {
      upToDate.push(s);
      continue;
    }
    // Keep a little headroom so photos and progress still fit.
    if (p.bytes * 1.2 > room) noRoom.push(p);
    else {
      download.push(p);
      room -= p.bytes;
    }
  }
  const waiting = !wifi && !force && download.length > 0;
  return { download: waiting ? [] : download, upToDate, noRoom, waiting };
}

/**
 * Cached packs no child needs any more (safe to clear when space is short, BLD-16).
 * @param {Record<string, string>} cached @param {string[]} wanted
 */
export const unusedPacks = (cached, wanted) => Object.keys(cached).filter((s) => !wanted.includes(s));
