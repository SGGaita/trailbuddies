/**
 * ASN-05 Badge wall: the class's badges this week, projected for everyone to celebrate.
 *
 * - Every child is on the wall, sorted by name and never by count. A child with no new badge
 *   gets a "keep going" tile, not a gap.
 * - First names only. When two children share a first name, both get their initial.
 * - The week starts on Monday at midnight in the school's own time zone.
 * - The API sends each child's newly earned badges (class play, plus home play when the
 *   parent shares all progress); these functions turn that into tiles, pages and a total.
 */

export const WALL_PAGE_MS = 12_000;
export const WALL_REFRESH_MS = 30_000;
/** The smallest tile that still reads from the back of a classroom, in CSS px. */
export const WALL_TILE = { minWidth: 260, height: 168, gap: 16 };

const DAY = 86_400_000;

/** @param {string} timeZone */
function zoneOrUtc(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** Local wall-clock parts of an instant in a time zone. */
function partsIn(ms, timeZone) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(ms).map((x) => [x.type, x.value]));
  return {
    y: +p.year,
    m: +p.month,
    d: +p.day,
    h: +p.hour,
    min: +p.minute,
    s: +p.second,
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday),
  };
}

/** How far the zone is ahead of UTC at this instant, in ms. */
function offsetAt(ms, timeZone) {
  const p = partsIn(ms, timeZone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}

/** The instant of local midnight on a calendar date in a zone (correct across DST changes). */
function localMidnight(y, m, d, timeZone) {
  const guess = Date.UTC(y, m - 1, d);
  let at = guess - offsetAt(guess, timeZone);
  at = guess - offsetAt(at, timeZone);
  return at;
}

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * The badge wall's week: Monday 00:00 to the next Monday 00:00 in the school's time zone.
 * @param {Date | number} now
 * @param {string} timeZone IANA name, e.g. "Africa/Nairobi"; an unknown name falls back to UTC
 * @param {number} [back] 0 = this week, 1 = last week
 * @returns {{ from: string, to: string, monday: string, sunday: string, timeZone: string }}
 *   `from`/`to` are UTC instants; `monday`/`sunday` are the local calendar dates
 */
export function wallWeek(now, timeZone, back = 0) {
  const zone = zoneOrUtc(timeZone || "UTC");
  const p = partsIn(+now, zone);
  // Calendar arithmetic on a UTC date that stands for the local date.
  const today = Date.UTC(p.y, p.m - 1, p.d);
  const monday = today - (p.weekday + 7 * back) * DAY;
  const nextMonday = monday + 7 * DAY;
  const [y1, m1, d1] = isoDay(monday).split("-").map(Number);
  const [y2, m2, d2] = isoDay(nextMonday).split("-").map(Number);
  return {
    from: new Date(localMidnight(y1, m1, d1, zone)).toISOString(),
    to: new Date(localMidnight(y2, m2, d2, zone)).toISOString(),
    monday: isoDay(monday),
    sunday: isoDay(nextMonday - DAY),
    timeZone: zone,
  };
}

/**
 * Names for the wall: first name only, plus the initial for children who share a first name
 * with someone else in the class ("Amani A.", "Amani K.").
 * @param {{ id: string, first_name: string, initial?: string | null }[]} students
 * @returns {Map<string, string>}
 */
export function wallNames(students) {
  const key = (s) => s.first_name.trim().toLocaleLowerCase();
  const count = new Map();
  for (const s of students) count.set(key(s), (count.get(key(s)) || 0) + 1);
  return new Map(
    students.map((s) => [
      s.id,
      count.get(key(s)) > 1 && s.initial ? `${s.first_name.trim()} ${s.initial}.` : s.first_name.trim(),
    ]),
  );
}

/**
 * @typedef {{ badge_id: string, tier?: string | null, at: string, where?: "class" | "home" }} WallAward
 * @typedef {{ id: string, first_name: string, initial?: string | null, avatar_color?: string, badges: WallAward[] }} WallStudent
 * @typedef {{ id: string, name: string, icon?: string, tier?: string }} CatalogueBadge
 * @typedef {{ id: string, name: string, letter: string, colour: string,
 *   badges: (CatalogueBadge & { tier: string, at: string, where: string, key: string })[] }} WallTile
 */

/**
 * Tiles for every child, sorted by name. Badges the catalogue doesn't know (a custom badge
 * from a newer app) are left out rather than shown blank.
 * @param {WallStudent[]} students
 * @param {CatalogueBadge[]} catalogue
 * @returns {{ tiles: WallTile[], total: number, earners: number }}
 */
export function badgeWall(students, catalogue) {
  const byId = new Map(catalogue.map((b) => [b.id, b]));
  const names = wallNames(students);
  const tiles = students
    .map((s) => {
      const seen = new Set();
      const badges = [...(s.badges || [])]
        .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
        .filter((a) => byId.has(a.badge_id) && !seen.has(a.badge_id) && seen.add(a.badge_id))
        .map((a) => {
          const b = byId.get(a.badge_id);
          return {
            ...b,
            tier: ["bronze", "silver", "gold"].includes(a.tier) ? a.tier : b.tier || "bronze",
            at: a.at,
            where: a.where || "class",
            key: `${s.id}:${b.id}`,
          };
        });
      const name = names.get(s.id);
      return { id: s.id, name, letter: name.slice(0, 1).toLocaleUpperCase(), colour: s.avatar_color || "leaf", badges };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || a.id.localeCompare(b.id));
  const total = tiles.reduce((n, t) => n + t.badges.length, 0);
  return { tiles, total, earners: tiles.filter((t) => t.badges.length).length };
}

/**
 * How big tiles are drawn: 1 in the teacher's page; bigger when the wall is full screen, so a
 * projected wall reads from the back of the room.
 * @param {{ width: number }} area
 * @param {boolean} fullScreen
 */
export function wallScale({ width }, fullScreen) {
  if (!fullScreen) return 1;
  return width >= 1200 ? 1.5 : width >= 800 ? 1.25 : 1;
}

/**
 * How many tiles fit on one screen without scrolling.
 * @param {{ width: number, height: number }} area the wall's free area in CSS px
 * @param {number} [scale] from `wallScale`
 * @returns {{ cols: number, rows: number, perPage: number, scale: number }}
 */
export function wallLayout({ width, height }, scale = 1) {
  const { minWidth, height: tileH, gap } = WALL_TILE;
  const cols = Math.max(1, Math.floor((width + gap) / (minWidth * scale + gap)));
  const rows = Math.max(1, Math.floor((height + gap) / (tileH * scale + gap)));
  return { cols, rows, perPage: cols * rows, scale };
}

/**
 * Split the tiles into screens. Pages are balanced so the last one isn't a lonely tile or two.
 * @template T
 * @param {T[]} tiles
 * @param {number} perPage
 * @returns {T[][]}
 */
export function wallPages(tiles, perPage) {
  const size = Math.max(1, perPage);
  if (tiles.length <= size) return [tiles];
  const pages = Math.ceil(tiles.length / size);
  const even = Math.ceil(tiles.length / pages);
  const out = [];
  for (let i = 0; i < tiles.length; i += even) out.push(tiles.slice(i, i + even));
  return out;
}

/**
 * Badges that arrived since the last refresh, so the wall can make a small moment of them.
 * Nothing is "new" on the first load.
 * @param {{ tiles: WallTile[] } | null} before
 * @param {{ tiles: WallTile[] }} after
 * @returns {Set<string>} badge keys (`studentId:badgeId`)
 */
export function newOnWall(before, after) {
  if (!before) return new Set();
  const had = new Set(before.tiles.flatMap((t) => t.badges.map((b) => b.key)));
  return new Set(after.tiles.flatMap((t) => t.badges.map((b) => b.key)).filter((k) => !had.has(k)));
}

/** Which page shows a child's tile, so a new badge can be brought into view. */
export function pageOf(pages, studentId) {
  return pages.findIndex((p) => p.some((t) => t.id === studentId));
}
