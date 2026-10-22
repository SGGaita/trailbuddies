"use client";
/**
 * Small per-device memories (localStorage, light conveniences only): the day a learner
 * was last greeted and which trail units they've already seen open. Losing them only
 * means a greeting or unlock animation plays again.
 */
const KEY = "tb_memory_v1";

/** @returns {{ greeted: Record<string, string>, open: Record<string, string[]> }} */
export function readMemory() {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { greeted: m.greeted || {}, open: m.open || {} };
  } catch {
    return { greeted: {}, open: {} };
  }
}

/** @param {(m: ReturnType<typeof readMemory>) => void} change */
export function writeMemory(change) {
  try {
    const m = readMemory();
    change(m);
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage blocked: nothing to remember */
  }
}
