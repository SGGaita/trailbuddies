/**
 * Lays out a subject's winding trail: a banner per unit, a stone per lesson in a
 * zig-zag, and a trophy at the end of each unit. Coordinates are in a virtual
 * canvas `width` wide so the same layout scales from phone to desktop.
 */
import { unitOpen, unitProgress, trophyId } from "./progress.js";

/** @typedef {import("./progress.js").TrailUnit} TrailUnit */
/** @typedef {"done" | "next" | "open" | "locked" | "planned"} NodeState */
/**
 * @typedef {object} TrailNode
 * @property {"banner" | "lesson" | "trophy" | "review"} kind
 * @property {string} id
 * @property {string} unitId
 * @property {number} x
 * @property {number} y
 * @property {NodeState} state
 * @property {number} [n] lesson number within the unit (1-based)
 * @property {number} [stars]
 * @property {string} [title]
 * @property {boolean} [bronze] skipped by placement: shown done with a bronze star
 */

const COLUMNS = [0.28, 0.55, 0.78, 0.55]; // zig-zag positions as fractions of width

/**
 * @param {TrailUnit[]} units in trail order
 * @param {Record<string, number>} progress
 * @param {{ width?: number, top?: number, bannerGap?: number, stoneGap?: number, trophyGap?: number, review?: boolean }} [opts]
 *   review: add a review stone (items due for practice) just before the next stone
 * @returns {{ width: number, height: number, nodes: TrailNode[], path: Array<[number, number]>, next: TrailNode | null }}
 */
export function layoutTrail(units, progress, opts = {}) {
  const { width = 600, top = 60, bannerGap = 80, stoneGap = 100, trophyGap = 120, review = false, start = null } = opts;
  const nodes = [];
  const path = [];
  let y = top;
  let next = null;
  let col = 0;
  // With a placement start, "next" is in the starting unit or later.
  const startIndex = start ? Math.max(0, units.findIndex((u) => u.id === start)) : 0;

  units.forEach((u, ui) => {
    const open = unitOpen(units, ui, progress, start);
    const planned = u.status === "planned";
    const p = unitProgress(u, progress);
    nodes.push({
      kind: "banner",
      id: `${u.id}-banner`,
      unitId: u.id,
      x: width / 2,
      y,
      state: planned ? "planned" : open ? "open" : "locked",
      title: u.title,
    });
    y += bannerGap;

    u.lessonIds.forEach((id, li) => {
      const x = Math.round(width * COLUMNS[col++ % COLUMNS.length]);
      const stars = progress[id] || 0;
      /** @type {NodeState} */
      let state = planned ? "planned" : !open ? "locked" : stars > 0 ? "done" : "open";
      // ADP-05 / ONB-09: units before the placement start show as done with a bronze star.
      const bronze = !planned && ui < startIndex && stars === 0;
      if (bronze) state = "done";
      const node = { kind: /** @type {const} */ ("lesson"), id, unitId: u.id, n: li + 1, x, y, state, stars: bronze ? 1 : stars, ...(bronze ? { bronze } : {}) };
      if (state === "open" && !next && ui >= startIndex) {
        node.state = "next";
        next = node;
      }
      nodes.push(node);
      path.push([x, y]);
      y += stoneGap;
    });

    const tx = Math.round(width / 2);
    const tStars = progress[trophyId(u.id)] || 0;
    /** @type {NodeState} */
    let tState = planned
      ? "planned"
      : !open
        ? "locked"
        : tStars > 0
          ? "done"
          : p.lessonsDone
            ? "open"
            : "locked";
    const trophy = {
      kind: /** @type {const} */ ("trophy"),
      id: trophyId(u.id),
      unitId: u.id,
      x: tx,
      y,
      state: tState,
      stars: tStars,
    };
    if (!planned && ui < startIndex && tStars === 0) Object.assign(trophy, { state: "done", stars: 1, bronze: true });
    if (tState === "open" && !next && ui >= startIndex) {
      trophy.state = "next";
      next = trophy;
    }
    nodes.push(trophy);
    path.push([tx, y]);
    y += trophyGap;
  });

  if (review && next) {
    // Slot a review stone in before the next stone, shifting everything below it down.
    const at = nodes.indexOf(next);
    const shift = stoneGap;
    for (let i = at; i < nodes.length; i++) nodes[i] = { ...nodes[i], y: nodes[i].y + shift };
    const reviewNode = { kind: /** @type {const} */ ("review"), id: "review", unitId: next.unitId, x: Math.round(width * 0.3), y: next.y, state: /** @type {NodeState} */ ("open") };
    nodes.splice(at, 0, reviewNode);
    const pi = path.findIndex(([px, py]) => px === next.x && py === next.y);
    for (let i = pi; i < path.length; i++) path[i] = [path[i][0], path[i][1] + shift];
    path.splice(pi, 0, [reviewNode.x, reviewNode.y]);
    next = nodes[at + 1];
    y += shift;
  }
  return { width, height: y, nodes, path, next };
}

/**
 * SVG path data through the trail points.
 * @param {Array<[number, number]>} points
 */
export const pathData = (points) => points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
