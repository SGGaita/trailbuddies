// Positions are percentages of one illustrated section, following the path from the buddy dock.
export const MAP_STOPS = [
  ["numbers", 21, 68],
  ["language", 50, 76],
  ["family", 77, 66],
  ["animals", 79, 30],
  ["colours", 48, 23],
  ["shapes", 17, 28],
];
const MAIN_PATH =
  "M 1 98 C 10 98 12 68 21 68 S 38 80 50 76 S 66 64 77 66 S 93 42 79 30 S 62 38 48 23 S 26 24 17 28";
const EXTRA_STOPS = [
  [79, 28],
  [48, 23],
  [17, 29],
  [21, 70],
  [50, 75],
  [77, 68],
];

/** Keep the familiar first map and add full landscape sections as the catalogue grows. */
export function mapSections(subjects) {
  const known = new Set(MAP_STOPS.map(([id]) => id));
  const extra = subjects.filter(({ id }) => !known.has(id));
  const sections = [];
  for (let i = 0; i < extra.length; i += EXTRA_STOPS.length) {
    const stops = extra.slice(i, i + EXTRA_STOPS.length).map((subject, index) => ({
      subject,
      x: EXTRA_STOPS[index][0],
      y: EXTRA_STOPS[index][1],
    }));
    const points = [[97, 0], ...stops.map(({ x, y }) => [x, y])];
    if (i + stops.length < extra.length) points.push([97, 100]);
    const path = points.slice(1).reduce((line, [x, y], index) => {
      const [fromX, fromY] = points[index];
      const middleX = (fromX + x) / 2;
      return `${line} C ${middleX} ${fromY} ${middleX} ${y} ${x} ${y}`;
    }, "M 97 0");
    sections.push({ stops, path });
  }
  return {
    mainPath: extra.length ? `${MAIN_PATH} M 77 66 C 91 66 97 82 97 100` : MAIN_PATH,
    sections,
  };
}
