import { hasArt, itemSvg } from "./itemArt";
/**
 * Jigsaw pictures (GAM-01): a simple illustrated scene per topic, drawn from shapes and
 * the unit's own pictures, until illustrated art or a parent's photo is used (Sprint 5).
 * Returns SVG markup for a 600 x 600 view box.
 */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const SKY = { numbers: ["#bfe6ff", "#e9f6ff"], language: ["#cdeccf", "#f0faef"], animals: ["#bfe6ff", "#eef8ff"] };

/** @param {{ id: string, subject: string, title: string, items: any[], groups?: any[] }} unit */
export function sceneSvg(unit) {
  const [top, bottom] = SKY[unit.subject] || ["#ffe9b8", "#fff8e8"];
  const parts = [
    `<defs><linearGradient id="sky-${unit.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`,
    `<rect width="600" height="600" fill="url(#sky-${unit.id})"/>`,
    `<circle cx="500" cy="95" r="52" fill="#ffc93c"/><circle cx="500" cy="95" r="70" fill="#ffc93c" opacity=".25"/>`,
    `<path d="M70 120 q30 -30 60 0 q30 -26 60 0 z" fill="#fff" opacity=".9"/><path d="M260 70 q24 -24 48 0 q24 -20 48 0 z" fill="#fff" opacity=".8"/>`,
  ];
  if (unit.groups?.length) {
    // Animals: land, water and air, each with its own animals.
    parts.push(
      `<path d="M0 360 Q150 320 300 350 T600 340 V600 H0 Z" fill="#7cc77e"/>`,
      `<ellipse cx="420" cy="500" rx="190" ry="80" fill="#3fa6dc"/><ellipse cx="420" cy="490" rx="150" ry="50" fill="#7fc8ef" opacity=".6"/>`,
    );
    const spots = { air: [[120, 200], [260, 160], [380, 220]], land: [[90, 420], [200, 460], [110, 540]], water: [[360, 500], [460, 470], [520, 530]] };
    const used = {};
    for (const it of unit.items) {
      const g = (it.tags || []).find((x) => spots[x]);
      if (!g) continue;
      const i = (used[g] = (used[g] || 0) + 1) - 1;
      const [x, y] = spots[g][i % spots[g].length];
      parts.push(`<text x="${x}" y="${y}" font-size="78" text-anchor="middle" dominant-baseline="middle">${esc(it.emoji || "")}</text>`);
    }
  } else {
    // Numbers and letters: a hill or forest with the unit's pictures and labels.
    parts.push(
      unit.subject === "language"
        ? `<path d="M0 380 H600 V600 H0 Z" fill="#8bcf7e"/><path d="M60 380 l40 -120 l40 120 z M470 380 l50 -150 l50 150 z" fill="#2f9e5b"/><rect x="95" y="380" width="10" height="30" fill="#8f5f36"/><rect x="515" y="380" width="10" height="30" fill="#8f5f36"/>`
        : `<path d="M0 400 Q300 250 600 400 V600 H0 Z" fill="#7cc77e"/><path d="M0 470 Q300 380 600 470 V600 H0 Z" fill="#5fb46a"/>`,
    );
    const shown = unit.items.slice(0, 6);
    shown.forEach((it, i) => {
      const x = 90 + (i % 3) * 210;
      const y = i < 3 ? 300 : 490;
      parts.push(
        `<circle cx="${x}" cy="${y}" r="72" fill="#fff" opacity=".85"/>`,
        hasArt(it)
          ? `<g transform="translate(${x - 40} ${y - 52}) scale(.8)">${itemSvg(it)}</g>`
          : `<text x="${x}" y="${y - 12}" font-size="64" text-anchor="middle" dominant-baseline="middle">${esc(it.emoji || "")}</text>`,
        `<text x="${x}" y="${y + 46}" font-size="34" font-weight="800" font-family="sans-serif" fill="#263322" text-anchor="middle">${esc(it.label)}</text>`,
      );
    });
  }
  return parts.join("");
}
