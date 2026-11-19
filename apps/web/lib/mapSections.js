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

/** Lay out the stops in rows and route one path through the whole valley. */
export function mapSections(subjects) {
  const known = new Set(MAP_STOPS.map(([id]) => id));
  const extra = subjects.filter(({ id }) => !known.has(id));
  const sections = [];
  let path = extra.length ? `${MAIN_PATH} C 15 77 15 91 19 100` : MAIN_PATH;
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
  return { path, sections };
}
