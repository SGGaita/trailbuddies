/**
 * Pictures for colour and shape items, drawn in code (CNT-04): an item with a `shape`
 * and/or `colour` is drawn as SVG in a 100 x 100 box. "circle:small" draws a small circle.
 * Everything else keeps its emoji until illustrations are approved.
 */

const STAR = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
};
const POLY = (n, cx, cy, r) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((2 * Math.PI) / n) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

/** Does this item have a drawn picture? */
export const hasArt = (it) => !!(it && (it.shape || it.colour) && !it.emoji && !it.photo);

/**
 * SVG markup (no outer <svg>) for an item, in a 0 0 100 100 view box.
 * @param {{ shape?: string, colour?: string }} it
 */
export function itemSvg(it) {
  const [name = "splash", size] = String(it.shape || "splash").split(":");
  const fill = it.colour || "#3fa6dc";
  const s = size === "small" ? 0.5 : 1;
  const r = 38 * s;
  const stroke = `stroke="#263322" stroke-width="${size === "small" ? 2.5 : 3.5}" stroke-linejoin="round"`;
  const c = 50;
  switch (name) {
    case "circle":
      return `<circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" ${stroke}/>`;
    case "square":
      return `<rect x="${c - r * 0.85}" y="${c - r * 0.85}" width="${r * 1.7}" height="${r * 1.7}" rx="3" fill="${fill}" ${stroke}/>`;
    case "rectangle":
      return `<rect x="${c - r}" y="${c - r * 0.6}" width="${r * 2}" height="${r * 1.2}" rx="3" fill="${fill}" ${stroke}/>`;
    case "triangle":
      return `<polygon points="${POLY(3, c, c + r * 0.12, r * 1.05)}" fill="${fill}" ${stroke}/>`;
    case "pentagon":
      return `<polygon points="${POLY(5, c, c + 2, r)}" fill="${fill}" ${stroke}/>`;
    case "hexagon":
      return `<polygon points="${POLY(6, c, c, r)}" fill="${fill}" ${stroke}/>`;
    case "diamond":
      return `<polygon points="${c},${c - r} ${c + r * 0.75},${c} ${c},${c + r} ${c - r * 0.75},${c}" fill="${fill}" ${stroke}/>`;
    case "oval":
      return `<ellipse cx="${c}" cy="${c}" rx="${r * 0.7}" ry="${r}" fill="${fill}" ${stroke}/>`;
    case "star":
      return `<polygon points="${STAR(c, c + 3, r * 1.1)}" fill="${fill}" ${stroke}/>`;
    case "heart":
      return `<path d="M50 ${50 + 30 * s} C ${50 - 45 * s} ${50 - 2 * s}, ${50 - 25 * s} ${50 - 38 * s}, 50 ${50 - 16 * s} C ${50 + 25 * s} ${50 - 38 * s}, ${50 + 45 * s} ${50 - 2 * s}, 50 ${50 + 30 * s} Z" fill="${fill}" ${stroke}/>`;
    case "ball":
      return `<circle cx="50" cy="52" r="34" fill="${fill}" ${stroke}/><path d="M28 40 Q50 30 72 40" fill="none" stroke="#fff" stroke-width="4" opacity=".6" stroke-linecap="round"/>`;
    case "hat":
      return `<path d="M30 66 Q32 30 50 28 Q68 30 70 66 Z" fill="${fill}" ${stroke}/><rect x="16" y="64" width="68" height="10" rx="5" fill="${fill}" ${stroke}/>`;
    default:
      // "splash": a blob of paint, for colour swatches.
      return `<path d="M50 14 C66 12 74 24 82 30 C92 38 88 52 86 60 C84 72 74 86 58 86 C44 88 34 84 24 78 C12 70 10 56 14 44 C18 30 34 16 50 14 Z" fill="${fill}" ${stroke}/><ellipse cx="38" cy="36" rx="9" ry="6" fill="#fff" opacity=".45"/>`;
  }
}
