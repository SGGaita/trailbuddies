/**
 * What the buddy says and how long it celebrates. Returns script events and values;
 * the words live in the content package's script table (BUD-08).
 */

/** Explorer age and up get quick celebrations (BUD-06). */
const QUICK = new Set(["explorer", "voyager", "trailblazer"]);

/**
 * @param {string} band
 * @returns {{ speak: boolean, ms: number }} whether the buddy speaks its praise, and how long before moving on
 */
export const celebrationFor = (band) => (QUICK.has(band) ? { speak: false, ms: 500 } : { speak: true, ms: 1100 });

/** Local calendar day, e.g. "2026-10-23". */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * The map greeting (BUD-03): the first visit of the day mentions the last lesson and
 * what's next; later visits get a short hello.
 * @param {{ name: string, lastTitle?: string | null, nextTitle?: string | null, greetedOn?: string | null, now?: Date }} p
 * @returns {{ event: string, vars: Record<string, string>, firstToday: boolean }}
 */
export function greetingFor({ name, lastTitle, nextTitle, greetedOn, now = new Date() }) {
  const firstToday = greetedOn !== dayKey(now);
  if (!lastTitle) return { event: "greet.today-new", vars: { name }, firstToday };
  if (!firstToday) return { event: "greet.again", vars: { name }, firstToday };
  return {
    event: "greet.today",
    vars: { name, last: lastTitle, next: nextTitle || lastTitle },
    firstToday,
  };
}

/**
 * Units that have opened since the learner last saw the trail (MAP-03), so they can
 * animate in. The first visit animates nothing.
 * @param {string[]} openNow
 * @param {string[] | null} seen ids open last time, or null on a first visit
 */
export const newlyOpened = (openNow, seen) => (seen ? openNow.filter((id) => !seen.includes(id)) : []);
