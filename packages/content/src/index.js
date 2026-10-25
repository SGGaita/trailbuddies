/**
 * Built-in content packs. JSON files are the source of truth; this module
 * gives apps a small read API over them. A new unit needs a JSON file, a catalogue entry
 * and `pnpm --filter @trailbuddies/content units:index` (the validator checks all three).
 */
import catalogue from "./catalogue.json" with { type: "json" };
import { ALL_UNITS, ALL_ASSETS } from "./units/all.js";
import buddyEn from "./buddy/en.json" with { type: "json" };
import zipEn from "./buddy/en.zip.json" with { type: "json" };
import tumiEn from "./buddy/en.tumi.json" with { type: "json" };
import jumaEn from "./buddy/en.juma.json" with { type: "json" };
import kikiEn from "./buddy/en.kiki.json" with { type: "json" };
import builtInBadges from "./badges/built-in.json" with { type: "json" };
import economy from "./economy.json" with { type: "json" };

/** Units with full content, by id. */
export const UNITS = Object.fromEntries(ALL_UNITS.map((u) => [u.id, u]));
/** Units shipped inside this build (they have their own pages); others come from packs. */
export const BUILT_IN_UNIT_IDS = new Set(ALL_UNITS.map((u) => u.id));
export { ALL_ASSETS };

export { catalogue, builtInBadges };

/** @returns {typeof catalogue.subjects} */
export const getSubjects = () => catalogue.subjects;

/** @param {string} id */
export const getSubject = (id) => catalogue.subjects.find((s) => s.id === id) || null;

/**
 * Draft units (written but not yet approved, CNT-04) play in development and previews only.
 * A production build sets NEXT_PUBLIC_TB_CHANNEL=production and hides them from children.
 */
export const SHOW_DRAFTS =
  typeof process === "undefined" || process.env.NEXT_PUBLIC_TB_CHANNEL !== "production";

/**
 * Playable units for a subject, in trail order.
 * @param {string} subjectId
 * @param {{ drafts?: boolean }} [opts]
 */
export const playableUnits = (subjectId, { drafts = SHOW_DRAFTS } = {}) =>
  (getSubject(subjectId)?.units || [])
    .map((u) => UNITS[u.id])
    .filter((u) => u && (u.status === "ready" || (drafts && u.status === "draft")));

/** Where the web app serves unit illustrations (apps/web/public/art/units/<asset path>). */
export const ART_BASE = "/art/units/";

/**
 * Which illustrations show (CNT-03): approved ones everywhere; in development and previews
 * also ones still in review, so a grown-up can check them on screen before approving.
 * @param {{ review_status: string }} asset
 * @param {{ drafts?: boolean }} [opts]
 */
export const assetShows = (asset, { drafts = SHOW_DRAFTS } = {}) =>
  !!asset && (asset.review_status === "approved" || (drafts && asset.review_status === "reviewed"));

/**
 * Give each item whose illustration may show an `imageSrc` (the emoji stays as the fallback).
 * @param {any} unit @param {any} manifest
 */
export function attachImages(unit, manifest, opts) {
  const byId = new Map((manifest?.assets || []).map((a) => [a.id, a]));
  for (const it of unit.items) {
    const asset = it.image && byId.get(it.image);
    if (assetShows(asset, opts)) it.imageSrc = ART_BASE + asset.path;
    else delete it.imageSrc;
  }
  return unit;
}
ALL_UNITS.forEach((u) => attachImages(u, ALL_ASSETS[u.id]));

/** Units with content a child can play here, in trail order. @param {string} subjectId */
export const getReadyUnits = (subjectId) => playableUnits(subjectId);

/**
 * Full unit content, or null if the unit is only planned.
 * @param {string} id
 */
export const getUnit = (id) => {
  const u = UNITS[id];
  return u && (u.status === "ready" || (SHOW_DRAFTS && u.status === "draft")) ? u : null;
};

/**
 * Install a downloaded content pack (CNT-02, OFF-02): its units replace the built-in copies
 * and its catalogue entries are merged into the subject (new units are added at the end).
 * Called before the app first renders, so a new pack takes effect on the next launch.
 * @param {any} pack a "pack/1" document from the content API
 * @returns {boolean} false if it isn't a pack for a subject this app knows
 */
export function installPack(pack) {
  if (pack?.schema !== "pack/1") return false;
  const subject = catalogue.subjects.find((s) => s.id === pack.subject?.id);
  if (!subject || !Array.isArray(pack.units)) return false;
  for (const u of pack.units)
    if (u?.schema === "unit/1" && u.subject === subject.id)
      UNITS[u.id] = attachImages(u, pack.assets?.[u.id] || ALL_ASSETS[u.id]);
  for (const entry of pack.subject.units || []) {
    const i = subject.units.findIndex((e) => e.id === entry.id);
    if (i >= 0) subject.units[i] = { ...subject.units[i], ...entry };
    else subject.units.push(entry);
  }
  return true;
}

/**
 * Lesson ids for a unit, from content if available, otherwise numbered from the catalogue.
 * @param {{ id: string, lessons?: number }} entry catalogue unit entry
 * @returns {string[]}
 */
export function lessonIds(entry) {
  const unit = UNITS[entry.id];
  if (unit) return unit.lessons.map((l) => l.id);
  return Array.from({ length: entry.lessons || 6 }, (_, i) => `${entry.id}-${i + 1}`);
}

/** Buddy script table (BUD-08): lines by language, buddy and event. Writers add lines in JSON. */
const SCRIPTS = { en: { all: buddyEn, zip: zipEn, tumi: tumiEn, juma: jumaEn, kiki: kikiEn } };

/** Warnings for missing lines, in development only. */
const warn = (msg) => {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") console.warn(msg);
};

/**
 * Every line for an event: the buddy's own lines first, then the shared ones, then the
 * generic fallback (with a development warning).
 * @param {string} event
 * @param {{ buddy?: string | null, lang?: string }} [opts]
 * @returns {string[]}
 */
export function linesFor(event, { buddy, lang = "en" } = {}) {
  const table = SCRIPTS[lang] || SCRIPTS.en;
  const own = buddy && table[buddy]?.events[event];
  if (own?.length) return own;
  const shared = table.all.events[event];
  if (shared?.length) return shared;
  warn(`[buddy] no line for "${event}"${buddy ? ` (${buddy})` : ""}; using the fallback`);
  return table.all.events.fallback;
}

const fill = (line, vars) => line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/**
 * A buddy line for an event, with {name}-style placeholders filled.
 * @param {string} event e.g. "greet.back"
 * @param {Record<string, string | number>} [vars]
 * @param {number} [pick] which variant (wraps around); defaults to the first
 * @param {string | null} [buddy]
 */
export function buddyLine(event, vars = {}, pick = 0, buddy = null) {
  const lines = linesFor(event, { buddy });
  return fill(lines[pick % lines.length], vars);
}

/**
 * Variety rule (BUD-06): a random line for the event, never the same as `last`.
 * @param {string} event
 * @param {{ buddy?: string | null, vars?: Record<string, string | number>, last?: string | null, r?: () => number }} [opts]
 */
export function buddySays(event, { buddy = null, vars = {}, last = null, r = Math.random } = {}) {
  const lines = linesFor(event, { buddy }).map((l) => fill(l, vars));
  const pool = lines.length > 1 ? lines.filter((l) => l !== last) : lines;
  return pool[Math.floor(r() * pool.length)];
}

/** The reward economy (RWD-09): earning amounts, the daily cap, badge payouts and shop prices. */
export { economy };

import library from "./library.json" with { type: "json" };

/**
 * The built-in picture library for the Lesson Builder (BLD-02): a curated set plus every
 * picture the content units use, each with a name and tags to search.
 * @returns {Array<{ emoji: string, name: string, tags: string[] }>}
 */
export function libraryPictures() {
  const out = [...library.pictures];
  const seen = new Set(out.map((p) => p.emoji));
  for (const u of Object.values(UNITS))
    for (const it of u.items)
      if (it.emoji && !seen.has(it.emoji) && !/^\d/.test(it.label)) {
        seen.add(it.emoji);
        out.push({ emoji: it.emoji, name: it.label.toLowerCase(), tags: [u.subject] });
      }
  return out;
}

/**
 * Search the picture library: names first, then tags. Empty query → everything.
 * @param {string} query
 */
export function searchLibrary(query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  const all = libraryPictures();
  if (!q) return all;
  const byName = all.filter((p) => p.name.includes(q));
  const byTag = all.filter((p) => !byName.includes(p) && p.tags.some((t) => t.startsWith(q)));
  return [...byName, ...byTag];
}
export { LEGAL } from "./legal/en.js";
