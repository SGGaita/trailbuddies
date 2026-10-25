// MAP-05: which trail stones to mount. Only stones near the viewport exist in the page, so a
// subject with 100+ stones scrolls smoothly on a budget tablet.

/**
 * @param {{ count: number, itemSize: number, start: number, viewport: number, offset?: number, overscan?: number }} o
 *   start: scroll position along the trail (px); offset: where the first stone sits (px);
 *   overscan: extra stones mounted on each side.
 * @returns {{ from: number, to: number }} indexes [from, to) to mount
 */
export function visibleRange({ count, itemSize, start, viewport, offset = 0, overscan = 4 }) {
  if (count <= 0 || itemSize <= 0) return { from: 0, to: 0 };
  const first = Math.floor((start - offset) / itemSize);
  const last = Math.ceil((start - offset + viewport) / itemSize);
  return {
    from: Math.max(0, Math.min(count, first - overscan)),
    to: Math.max(0, Math.min(count, last + overscan)),
  };
}

/**
 * Trail stones positioned by `y` (layout units): keep those within `margin` of the visible
 * window, plus any ids that must stay mounted (the next stone, a trophy the buddy points at).
 * @template {{ id: string, y: number }} N
 * @param {N[]} nodes
 * @param {{ top: number, bottom: number, margin?: number, keep?: string[] }} win in layout units
 * @returns {N[]}
 */
export function nodesNear(nodes, { top, bottom, margin = 300, keep = [] }) {
  return nodes.filter((n) => keep.includes(n.id) || (n.y >= top - margin && n.y <= bottom + margin));
}
