/**
 * Games corner (GAM-01, GAM-03, GAM-05). Games take any set of items (built-in units now,
 * custom lessons later), so new content works in games without code changes.
 */
import { shuffle } from "./random.js";

export const GAMES = ["memory", "jigsaw"];

/** Memory flip: 6 cards for Seedlings, 8 for Sprouts, 12 for Explorers and up. */
export const memoryCards = (band) => (band === "seedling" ? 6 : band === "sprout" ? 8 : 12);

/** Jigsaw: 4 pieces for Seedlings (with a faint guide), 9 for Sprouts, 16 for Explorers and up. */
export const jigsawSide = (band) => (band === "seedling" ? 2 : band === "sprout" ? 3 : 4);

/**
 * A shuffled memory deck: pairs of the same picture. Uses as many different items as
 * the band's card count allows (fewer if the set is small).
 * @param {Array<{ id: string, label: string, emoji?: string, image?: string }>} items
 * @param {string} band
 * @param {() => number} r
 */
export function memoryDeck(items, band, r) {
  const pairs = Math.min(memoryCards(band) / 2, items.length);
  const chosen = shuffle(items, r).slice(0, pairs);
  return shuffle(
    chosen.flatMap((it) => [0, 1].map((k) => ({ key: `${it.id}-${k}`, pairId: it.id, item: it }))),
    r,
  );
}

/**
 * Jigsaw pieces in a shuffled tray. Each piece knows its home cell.
 * @param {number} side 2, 3 or 4
 * @param {() => number} r
 */
export function jigsawPieces(side, r) {
  const cells = Array.from({ length: side * side }, (_, i) => ({
    id: `p${i}`,
    row: Math.floor(i / side),
    col: i % side,
  }));
  return shuffle(cells, r);
}

/**
 * Game topics (GAM-04): every unit with content. A topic opens after its first lesson.
 * @param {Array<{ id: string, title: string, subject: string, items: any[], lessons: Array<{ id: string }> }>} units
 * @param {Record<string, number>} progress
 */
export function gameTopics(units, progress) {
  return units.map((u) => {
    const done = u.lessons.filter((l) => progress[l.id] > 0).length;
    return {
      unitId: u.id,
      title: u.title,
      subject: u.subject,
      open: done > 0,
      finished: (progress[`${u.id}-trophy`] || 0) > 0,
      unlock: u.lessons[0]?.id,
    };
  });
}
