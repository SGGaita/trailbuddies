// Joint and foot positions in the Feelings Trail portraits, in image percentages.
const LIMBS = {
  zip: [
    [[66, 53], [94, 38], 16, -1],
    [[34, 58], [7, 73], 15, 1],
    [[43, 70], [29, 93], 15, -1, true],
    [[56, 72], [64, 93], 15, 1, true],
  ],
  tumi: [
    [[46, 54], [13, 24], 22, 1],
    [[82, 56], [93, 78], 13, -1],
    [[50, 83], [48, 96], 12, -1, true],
    [[65, 83], [78, 94], 10, 1, true],
  ],
  jumbo: [
    [[72, 62], [84, 80], 15, -1, true],
    [[52, 68], [54, 95], 13, 1, true],
    [[23, 72], [15, 92], 12, -1, true],
    [[41, 78], [36, 91], 10, 1, true],
    [[69, 38], [95, 8], 14, 1],
  ],
  kiki: [
    [[80, 58], [91, 83], 13, -1, true],
    [[48, 61], [46, 93], 15, 1, true],
    [[13, 65], [9, 79], 11, -1, true],
  ],
};

const FACES = {
  zip: {
    mouth: [50.8, 35.8, 5.3, 3.9],
    eyes: [
      [38.5, 30, 6, 7],
      [59.5, 24, 5.5, 7],
    ],
    wave: [[0, -1]],
  },
  tumi: {
    mouth: [66.5, 39.8, 4.6, 5.2],
    eyes: [
      [60, 26, 5.7, 6.5],
      [78, 31, 5.3, 6.5],
    ],
    wave: [[0, 1]],
  },
  jumbo: {
    mouth: [59.9, 46.7, 7, 6.1],
    eyes: [
      [49.8, 30, 4.8, 6],
      [70, 25, 4.1, 5.8],
    ],
    wave: [
      [0, -1],
      [4, -0.65],
    ],
  },
  kiki: {
    mouth: [73, 39.1, 12.9, 6.1],
    eyes: [
      [61.1, 17, 6, 7.2],
      [92.1, 25, 5, 6.6],
    ],
    wave: [[0, -1]],
  },
};

const SIZE = 256;
const PAD = 26;
const SCALE = (SIZE - 2 * PAD) / 100;
const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (n) => {
  const x = clamp(n);
  return x * x * (3 - 2 * x);
};

function limbWeight(x, y, { joint, tip, radius }) {
  const dx = x - joint[0];
  const dy = y - joint[1];
  const vx = tip[0] - joint[0];
  const vy = tip[1] - joint[1];
  const along = (dx * vx + dy * vy) / (vx * vx + vy * vy);
  if (along <= 0) return 0;
  const distance = Math.hypot(dx - vx * clamp(along), dy - vy * clamp(along));
  return ease(along / 0.88) * (1 - ease((distance / radius - 0.53) / 0.47));
}

// Map a compressed or stretched part back to the source with a continuous edge.
function resample(distance, inner, scale) {
  const length = Math.abs(distance);
  const outer = inner * 2.2;
  const edge = inner * scale;
  const original =
    length < edge ? length / scale : inner + ((length - edge) * (outer - inner)) / (outer - edge);
  return Math.sign(distance) * original - distance;
}

/** Deform painted limbs, mouths and eyelids while leaving the rest of the portrait intact. */
export function buddyGait(image, id) {
  const limbs = LIMBS[id].map(([joint, tip, radius, side, foot = false]) => ({
    joint,
    tip,
    radius,
    side,
    foot,
  }));
  const surface = document.createElement("canvas");
  surface.width = surface.height = SIZE;
  const ctx = surface.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, PAD, PAD, SIZE - 2 * PAD, SIZE - 2 * PAD);
  const frame = ctx.getImageData(0, 0, SIZE, SIZE);
  const source = frame.data.slice();
  const joints = [];
  const face = FACES[id];
  const faceRegions = [face.mouth, ...face.eyes];
  const waveSides = new Map(face.wave);
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const x = (col - PAD) / SCALE;
      const y = (row - PAD) / SCALE;
      const weights = limbs.flatMap((limb, i) => {
        const weight = limbWeight(x, y, limb);
        return weight ? [{ i, weight, dx: x - limb.joint[0], dy: y - limb.joint[1] }] : [];
      });
      const features = faceRegions.flatMap(([cx, cy, halfWidth, halfHeight], i) => {
        const dy = y - cy;
        const blend = 1 - ease((Math.abs(x - cx) / halfWidth - 0.65) / 0.8);
        return blend && Math.abs(dy) < halfHeight * 2.2 ? [{ i, dy, halfHeight, blend }] : [];
      });
      if (weights.length || features.length)
        joints.push({ x, y, weights, features, index: (row * SIZE + col) * 4 });
    }
  }

  return (target, { walk = 0, wave = 0, mouth = 1, blink = 0, stage = false }) => {
    const gait = Math.sin(walk * Math.PI * 8) * ease(walk * 8) * ease((1 - walk) * 8);
    const waving = Math.sin(wave * Math.PI) * (0.32 + Math.sin(wave * Math.PI * 7) * 0.16);
    const turns = limbs.map(({ side, foot }, i) => {
      const phase = gait * side;
      const angle = -phase * (foot ? 0.25 : 0.13) - waving * (waveSides.get(i) || 0);
      return { cos: Math.cos(angle) - 1, sin: Math.sin(angle), lift: foot ? Math.max(0, phase) * 4 : 0 };
    });
    for (const cell of joints) {
      let { x, y } = cell;
      for (const { i, weight, dx, dy } of cell.weights) {
        const { cos, sin, lift } = turns[i];
        x += weight * (dx * cos - dy * sin);
        y += weight * (dx * sin + dy * cos + lift);
      }
      for (const { i, dy, halfHeight, blend } of cell.features) {
        const scale = 1 + ((i === 0 ? mouth : 1 - blink * 0.86) - 1) * blend;
        if (scale !== 1) y += resample(dy, halfHeight, scale);
      }
      const col = Math.round(x * SCALE + PAD);
      const row = Math.round(y * SCALE + PAD);
      const start = col >= 0 && col < SIZE && row >= 0 && row < SIZE ? (row * SIZE + col) * 4 : source.length;
      for (let c = 0; c < 4; c++) frame.data[cell.index + c] = source[start + c] || 0;
    }
    ctx.putImageData(frame, 0, 0);
    const { width, height } = target.canvas;
    const ratio = image.naturalWidth / image.naturalHeight;
    const fit = Math.min(height * (stage ? 0.88 : 1), (width * (stage ? 0.76 : 1)) / ratio);
    const artHeight = (fit * SIZE) / (SIZE - 2 * PAD);
    const artWidth = (artHeight * image.naturalWidth) / image.naturalHeight;
    const x = width * (0.5 + walk * 0.12) - artWidth / 2;
    const y = (height - artHeight) / 2 - Math.abs(gait) * height * 0.016;
    target.clearRect(0, 0, width, height);
    target.drawImage(surface, x, y, artWidth, artHeight);
  };
}
