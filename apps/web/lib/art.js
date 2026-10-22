/**
 * Original buddy and island artwork, ported from the interactive prototype.
 * Functions return SVG markup strings built only from constants in this file
 * (no user input), which components render inside an <svg>.
 * Placeholder art until the commissioned buddy designs arrive (development plan §5).
 */
export const BUDDIES = {
  zip: {
    name: "Zip",
    kind: "robot",
    line: "Beep boop! I love counting!",
    color: "#3fa6dc",
    hatY: 38,
    eyeY: 78,
    neckY: 124,
    headW: 104,
  },
  tumi: {
    name: "Tumi",
    kind: "owl",
    line: "Hoo! Let’s look closer!",
    color: "#b9814f",
    hatY: 46,
    eyeY: 92,
    neckY: 146,
    headW: 110,
  },
  juma: {
    name: "Juma",
    kind: "elephant",
    line: "Hello! I never forget a word.",
    color: "#8e9cab",
    hatY: 42,
    eyeY: 90,
    neckY: 150,
    headW: 112,
  },
  kiki: {
    name: "Kiki",
    kind: "turtle",
    line: "Slow and steady, we’ll get there!",
    color: "#2f9e5b",
    hatY: 50,
    eyeY: 88,
    neckY: 128,
    headW: 84,
  },
};
function mouth(mood, y) {
  if (mood === "sleep")
    return `<path d="M88 ${y + 2} q12 6 24 0" stroke="#263322" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (mood === "cheer")
    return `<ellipse cx="100" cy="${y + 4}" rx="11" ry="9" fill="#7a2a1c"/><ellipse cx="100" cy="${y + 8}" rx="6" ry="3.5" fill="#e8664a"/>`;
  if (mood === "think")
    return `<path d="M90 ${y + 4} h20" stroke="#263322" stroke-width="4" stroke-linecap="round"/>`;
  return `<path d="M86 ${y} q14 14 28 0" stroke="#263322" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
}
function eyes(b, mood, xs, r, col = "#263322") {
  if (mood === "sleep")
    return xs
      .map(
        (x) =>
          `<path d="M${x - r} ${b.eyeY} q${r} ${r * 0.8} ${2 * r} 0" stroke="${col}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      )
      .join("");
  return xs
    .map(
      (x) =>
        `<g class="eye"><circle cx="${x}" cy="${b.eyeY}" r="${r}" fill="${col}"/><circle cx="${x + r * 0.35}" cy="${b.eyeY - r * 0.35}" r="${r * 0.32}" fill="#fff"/></g>`,
    )
    .join("");
}
export function buddyBody(id, mood) {
  const b = BUDDIES[id];
  if (id === "zip")
    return `
    <line x1="100" y1="38" x2="100" y2="18" stroke="#1d6b93" stroke-width="5"/><circle cx="100" cy="15" r="8" fill="#ffc93c" stroke="#1d6b93" stroke-width="3"/>
    <rect x="48" y="38" width="104" height="84" rx="26" fill="#3fa6dc" stroke="#1d6b93" stroke-width="4"/>
    <rect x="62" y="52" width="76" height="56" rx="16" fill="#163a4f"/>
    ${eyes(b, mood, [84, 116], 8, "#9ff0ff")}
    <g transform="translate(0,-2)">${mood === "sleep" ? "" : `<path d="M88 96 q12 10 24 0" stroke="#9ff0ff" stroke-width="4" fill="none" stroke-linecap="round"/>`}</g>
    <rect x="60" y="124" width="80" height="60" rx="20" fill="#2b86b8" stroke="#1d6b93" stroke-width="4"/>
    <circle cx="100" cy="150" r="10" fill="#ffc93c"/>
    <path d="M60 140 q-26 ${mood === "cheer" ? -40 : 10} -18 ${mood === "cheer" ? -54 : 30}" stroke="#2b86b8" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M140 140 q26 ${mood === "cheer" ? -40 : 10} 18 ${mood === "cheer" ? -54 : 30}" stroke="#2b86b8" stroke-width="12" fill="none" stroke-linecap="round"/>
    <rect x="66" y="184" width="24" height="22" rx="8" fill="#1d6b93"/><rect x="110" y="184" width="24" height="22" rx="8" fill="#1d6b93"/>`;
  if (id === "tumi")
    return `
    <path d="M52 64 L60 30 L78 54 Z" fill="#8f5f36"/><path d="M148 64 L140 30 L122 54 Z" fill="#8f5f36"/>
    <ellipse cx="100" cy="122" rx="64" ry="82" fill="#b9814f" stroke="#8f5f36" stroke-width="4"/>
    <ellipse cx="100" cy="150" rx="40" ry="46" fill="#f2d8b5"/>
    <path d="M78 140 q6 6 12 0 M110 140 q6 6 12 0 M94 158 q6 6 12 0" stroke="#d9b48a" stroke-width="3" fill="none"/>
    <circle cx="78" cy="92" r="24" fill="#fff" stroke="#8f5f36" stroke-width="3"/><circle cx="122" cy="92" r="24" fill="#fff" stroke="#8f5f36" stroke-width="3"/>
    ${eyes(b, mood, [78, 122], 10)}
    <path d="M92 108 L108 108 L100 122 Z" fill="#f0a020" stroke="#b86e00" stroke-width="2"/>
    <path d="M38 120 q-6 ${mood === "cheer" ? -50 : 30} 16 ${mood === "cheer" ? -60 : 50}" stroke="#8f5f36" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M162 120 q6 ${mood === "cheer" ? -50 : 30} -16 ${mood === "cheer" ? -60 : 50}" stroke="#8f5f36" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M80 202 l-6 10 M86 203 v10 M120 202 l6 10 M114 203 v10" stroke="#f0a020" stroke-width="5" stroke-linecap="round"/>`;
  if (id === "juma")
    return `
    <ellipse cx="100" cy="178" rx="52" ry="30" fill="#7d8b99"/>
    <circle cx="42" cy="98" r="40" fill="#b6c2cd" stroke="#6f7d8a" stroke-width="4"/><circle cx="158" cy="98" r="40" fill="#b6c2cd" stroke="#6f7d8a" stroke-width="4"/>
    <circle cx="42" cy="98" r="24" fill="#f2c5c0"/><circle cx="158" cy="98" r="24" fill="#f2c5c0"/>
    <circle cx="100" cy="100" r="58" fill="#8e9cab" stroke="#6f7d8a" stroke-width="4"/>
    ${eyes(b, mood, [80, 120], 7)}
    <circle cx="70" cy="112" r="7" fill="#f2a7a0" opacity=".7"/><circle cx="130" cy="112" r="7" fill="#f2a7a0" opacity=".7"/>
    <path d="M100 112 q-4 40 ${mood === "cheer" ? "30 30 q14 -4 10 -26" : "10 56 q4 10 14 4"}" stroke="#6f7d8a" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M100 112 q-4 40 ${mood === "cheer" ? "30 30 q14 -4 10 -26" : "10 56 q4 10 14 4"}" stroke="#8e9cab" stroke-width="13" fill="none" stroke-linecap="round"/>
    ${mood === "sleep" ? "" : `<path d="M84 128 q-6 8 -16 4" stroke="#263322" stroke-width="3" fill="none" stroke-linecap="round"/>`}`;
  return `
    <ellipse cx="100" cy="176" rx="76" ry="34" fill="#1f7a45" stroke="#14532e" stroke-width="4"/>
    <path d="M30 168 Q100 82 170 168 Z" fill="#2f9e5b" stroke="#14532e" stroke-width="4"/>
    <path d="M70 156 l14-26 h32 l14 26 M84 130 l-10 -14 M116 130 l10 -14 M58 160 l12 -6 M142 160 l-12 -6" stroke="#14532e" stroke-width="3" fill="none"/>
    <circle cx="100" cy="86" r="40" fill="#8cc63f" stroke="#4f7d1c" stroke-width="4"/>
    ${eyes(b, mood, [86, 114], 6)}
    ${mouth(mood, 100)}
    <ellipse cx="40" cy="194" rx="14" ry="9" fill="#8cc63f" stroke="#4f7d1c" stroke-width="3"/><ellipse cx="160" cy="194" rx="14" ry="9" fill="#8cc63f" stroke="#4f7d1c" stroke-width="3"/>`;
}
export const OUTFITS = {
  sunhat: {
    name: "Sun hat",
    slot: "hat",
    price: 20,
    svg: (b) =>
      `<ellipse cx="100" cy="${b.hatY + 4}" rx="${b.headW * 0.62}" ry="12" fill="#e9c46a" stroke="#b08a2c" stroke-width="3"/><path d="M${100 - b.headW * 0.32} ${b.hatY + 2} q${b.headW * 0.32} -44 ${b.headW * 0.64} 0z" fill="#f4d58d" stroke="#b08a2c" stroke-width="3"/><path d="M${100 - b.headW * 0.3} ${b.hatY - 4} h${b.headW * 0.6}" stroke="#e8664a" stroke-width="6"/>`,
  },
  party: {
    name: "Party hat",
    slot: "hat",
    price: 40,
    svg: (b) =>
      `<path d="M${100 - 24} ${b.hatY + 6} L100 ${b.hatY - 56} L${100 + 24} ${b.hatY + 6} Z" fill="#e8664a" stroke="#a63d26" stroke-width="3"/><path d="M${88} ${b.hatY - 20} l24 6 M${84} ${b.hatY - 4} l32 6" stroke="#ffc93c" stroke-width="5"/><circle cx="100" cy="${b.hatY - 58}" r="8" fill="#ffc93c"/>`,
  },
  explorer: {
    name: "Explorer hat",
    slot: "hat",
    price: 80,
    svg: (b) =>
      `<ellipse cx="100" cy="${b.hatY + 4}" rx="${b.headW * 0.6}" ry="11" fill="#c9b27c" stroke="#7d6a3c" stroke-width="3"/><path d="M${100 - b.headW * 0.38} ${b.hatY + 2} a${b.headW * 0.38} ${b.headW * 0.34} 0 0 1 ${b.headW * 0.76} 0z" fill="#dcc794" stroke="#7d6a3c" stroke-width="3"/><path d="M${100 - b.headW * 0.36} ${b.hatY - 6} h${b.headW * 0.72}" stroke="#2f9e5b" stroke-width="6"/>`,
  },
  crown: {
    name: "Crown",
    slot: "hat",
    price: 250,
    svg: (b) =>
      `<path d="M${100 - 34} ${b.hatY + 6} v-34 l17 16 l17 -26 l17 26 l17 -16 v34 z" fill="#ffc93c" stroke="#b07d00" stroke-width="3"/><circle cx="100" cy="${b.hatY - 10}" r="5" fill="#e8664a"/><circle cx="${100 - 20}" cy="${b.hatY - 6}" r="4" fill="#3fa6dc"/><circle cx="${100 + 20}" cy="${b.hatY - 6}" r="4" fill="#2f9e5b"/>`,
  },
  astronaut: {
    name: "Space helmet",
    slot: "hat",
    price: 150,
    svg: (b) =>
      `<circle cx="100" cy="${b.eyeY}" r="${b.headW * 0.66}" fill="rgba(190,225,250,.28)" stroke="#e8f4fb" stroke-width="7"/><path d="M${100 - b.headW * 0.36} ${b.eyeY - b.headW * 0.36} q10 -16 30 -18" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  },
  flower: {
    name: "Flower crown",
    slot: "hat",
    price: 60,
    svg: (b) =>
      [-36, -18, 0, 18, 36]
        .map(
          (dx, i) =>
            `<circle cx="${100 + dx}" cy="${b.hatY + Math.abs(dx) / 6}" r="10" fill="${["#e8664a", "#ffc93c", "#b5487a", "#ffc93c", "#e8664a"][i]}" stroke="#fff" stroke-width="3"/>`,
        )
        .join(""),
  },
  cap: {
    name: "Football cap",
    slot: "hat",
    price: 50,
    svg: (b) =>
      `<path d="M${100 - b.headW * 0.36} ${b.hatY + 6} a${b.headW * 0.36} ${b.headW * 0.3} 0 0 1 ${b.headW * 0.72} 0z" fill="#2f9e5b" stroke="#14532e" stroke-width="3"/><path d="M${100 + b.headW * 0.2} ${b.hatY + 6} h${b.headW * 0.44} q4 6 -6 8 h-${b.headW * 0.4}z" fill="#1f7a45" stroke="#14532e" stroke-width="3"/>`,
  },
  specs: {
    name: "Round glasses",
    slot: "eyes",
    price: 45,
    svg: (b) =>
      `<g fill="none" stroke="#263322" stroke-width="4"><circle cx="${100 - b.headW * 0.2}" cy="${b.eyeY}" r="15"/><circle cx="${100 + b.headW * 0.2}" cy="${b.eyeY}" r="15"/><path d="M${100 - b.headW * 0.2 + 15} ${b.eyeY} h${b.headW * 0.4 - 30}"/></g>`,
  },
  shades: {
    name: "Sunglasses",
    slot: "eyes",
    price: 70,
    svg: (b) =>
      `<g fill="#1c1f26" stroke="#1c1f26" stroke-width="3"><rect x="${100 - b.headW * 0.2 - 17}" y="${b.eyeY - 11}" width="34" height="22" rx="9"/><rect x="${100 + b.headW * 0.2 - 17}" y="${b.eyeY - 11}" width="34" height="22" rx="9"/><path d="M${100 - b.headW * 0.2 + 17} ${b.eyeY - 3} h${b.headW * 0.4 - 34}" fill="none"/></g>`,
  },
  scarf: {
    name: "Stripy scarf",
    slot: "neck",
    price: 55,
    svg: (b) =>
      `<rect x="${100 - 44}" y="${b.neckY - 8}" width="88" height="18" rx="9" fill="#e8664a" stroke="#a63d26" stroke-width="3"/><rect x="118" y="${b.neckY + 4}" width="16" height="36" rx="6" fill="#e8664a" stroke="#a63d26" stroke-width="3"/><path d="M70 ${b.neckY - 8} v18 M90 ${b.neckY - 8} v18 M110 ${b.neckY - 8} v18 M118 ${b.neckY + 20} h16" stroke="#ffc93c" stroke-width="4"/>`,
  },
  bow: {
    name: "Bow tie",
    slot: "neck",
    price: 35,
    svg: (b) =>
      `<path d="M100 ${b.neckY} l-22 -12 v24 z M100 ${b.neckY} l22 -12 v24 z" fill="#b5487a" stroke="#7d2d52" stroke-width="3"/><circle cx="100" cy="${b.neckY}" r="6" fill="#7d2d52"/>`,
  },
};

export const ISL = {
  numbers:
    '<path d="M8 74 L38 20 L58 52 L72 32 L104 74 Z" fill="#7cc0e4" stroke="#1d6b93" stroke-width="3"/><path d="M30 34 L38 20 L46 34 Z" fill="#fff"/><text x="56" y="70" font-family="Baloo 2,sans-serif" font-weight="800" font-size="22" fill="#163a4f" text-anchor="middle">123</text>',
  language:
    '<g stroke="#a63d26" stroke-width="3"><path d="M24 74 V46"/><path d="M60 74 V40"/><path d="M92 74 V50"/></g><circle cx="24" cy="38" r="16" fill="#f29a84"/><circle cx="60" cy="30" r="20" fill="#e8664a"/><circle cx="92" cy="42" r="14" fill="#f29a84"/><text x="60" y="37" font-family="Baloo 2,sans-serif" font-weight="800" font-size="16" fill="#fff" text-anchor="middle">abc</text>',
  animals:
    '<path d="M14 40 q40 -24 80 0" stroke="#1f7a45" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M54 30 V74" stroke="#7d5a32" stroke-width="7"/><circle cx="96" cy="16" r="10" fill="#ffc93c"/><path d="M16 74 q8 -16 16 0 M78 74 q10 -20 20 0" stroke="#2f9e5b" stroke-width="4" fill="none"/>',
  colours:
    '<g stroke="#2f9e5b" stroke-width="3"><path d="M26 74 V46M56 74 V38M86 74 V48"/></g><circle cx="26" cy="40" r="11" fill="#e8664a"/><circle cx="56" cy="30" r="13" fill="#ffc93c"/><circle cx="86" cy="42" r="11" fill="#b5487a"/><circle cx="40" cy="58" r="8" fill="#3fa6dc"/><circle cx="72" cy="60" r="8" fill="#2f9e5b"/>',
  shapes:
    '<rect x="12" y="40" width="30" height="34" fill="#ffc93c" stroke="#b07d00" stroke-width="3"/><path d="M48 74 L66 30 L84 74 Z" fill="#e8664a" stroke="#a63d26" stroke-width="3"/><circle cx="98" cy="58" r="15" fill="#3fa6dc" stroke="#1d6b93" stroke-width="3"/>',
  time: '<circle cx="56" cy="44" r="28" fill="#fff" stroke="#263322" stroke-width="4"/><path d="M56 44 V26 M56 44 L70 52" stroke="#263322" stroke-width="4" stroke-linecap="round"/>',
  space:
    '<circle cx="56" cy="44" r="22" fill="#b5487a"/><ellipse cx="56" cy="44" rx="38" ry="9" fill="none" stroke="#ffc93c" stroke-width="4"/><circle cx="16" cy="16" r="3" fill="#fff"/><circle cx="100" cy="24" r="3" fill="#fff"/>',
  weather:
    '<circle cx="40" cy="34" r="16" fill="#ffc93c"/><path d="M40 58 h44 a14 14 0 0 0 -6 -26 a18 18 0 0 0 -34 6 a10 10 0 0 0 -4 20z" fill="#fff" stroke="#9aa7b4" stroke-width="3"/>',
  family:
    '<path d="M24 74 V42 L56 18 L88 42 V74 Z" fill="#fff1c7" stroke="#b07d00" stroke-width="3"/><path d="M56 62 s-14 -8 -14 -17 a7 7 0 0 1 14 -3 a7 7 0 0 1 14 3 c0 9 -14 17 -14 17z" fill="#e8664a"/>',
  class:
    '<rect x="20" y="36" width="72" height="38" fill="#e1f2fb" stroke="#1d6b93" stroke-width="3"/><path d="M12 38 L56 12 L100 38 Z" fill="#3fa6dc" stroke="#1d6b93" stroke-width="3"/><rect x="48" y="52" width="16" height="22" fill="#1d6b93"/><path d="M56 12 V2 h12 v6 h-12" fill="#e8664a" stroke="#a63d26" stroke-width="2"/>',
};
