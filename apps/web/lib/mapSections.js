// Positions are percentages within each section of the scrollable map.
export const MAP_STOPS = [
  ["numbers", 21, 68],
  ["language", 50, 76],
  ["family", 77, 66],
  ["animals", 77, 30],
  ["colours", 48, 23],
  ["shapes", 17, 28],
];
const MAIN_PATH =
  "M 17 28 C 26 24 36 18 48 23 S 68 34 77 30 C 83 42 83 59 77 66 S 64 73 50 76 S 32 68 21 68";
const EXTRA_STOPS = [
  [21, 28],
  [48, 23],
  [74, 29],
  [74, 68],
  [50, 75],
  [21, 70],
];

/** Valley spots for trails, in path order (the family island keeps its own spot). */
export const TRAIL_SPOTS = MAP_STOPS.filter(([id]) => id !== "family").map(([, x, y]) => [x, y]);

/**
 * Lay out the stops in map order (CMS-05): the first trails take the valley's spots, the rest
 * go in rows below, and one path runs through the whole valley. With the built-in order every
 * trail keeps the spot its art was drawn for.
 * @param {any[]} subjects trails in map order
 */
export function mapSections(subjects) {
  const main = subjects.slice(0, TRAIL_SPOTS.length).map((subject, i) => ({ subject, x: TRAIL_SPOTS[i][0], y: TRAIL_SPOTS[i][1] }));
  const extra = subjects.slice(TRAIL_SPOTS.length);
  const sections = [];
  let path = extra.length ? `${MAIN_PATH} C 15 77 19 91 19 100` : MAIN_PATH;
  let previous = { x: 19, y: 100 };
  for (let i = 0; i < extra.length; i += EXTRA_STOPS.length) {
    const offset = (sections.length + 1) * 100;
    const stops = extra.slice(i, i + EXTRA_STOPS.length).map((subject, index) => {
      const [x, y] = EXTRA_STOPS[index];
      const endY = offset + y;
      const midX = (previous.x + x) / 2;
      const midY = (previous.y + endY) / 2;
      path += Math.abs(endY - previous.y) > Math.abs(x - previous.x)
        ? ` C ${previous.x} ${midY} ${x} ${midY} ${x} ${endY}`
        : ` C ${midX} ${previous.y} ${midX} ${endY} ${x} ${endY}`;
      previous = { x, y: endY };
      return { subject, x, y };
    });
    sections.push(stops);
  }
  return { main, path, sections };
}
