"use client";
/**
 * Small per-device memories (localStorage, light conveniences only): the day a learner
 * was last greeted, which trail units they've already seen open and which returned
 * purchases they've been told about, and when each learner last had a stretch break. Losing them only
 * means a greeting or unlock animation plays again.
 */
const KEY = "tb_memory_v1";

/** @returns {{ greeted: Record<string, string>, open: Record<string, string[]>, returned: Record<string, string[]>, breaks: Record<string, number> }} */
export function readMemory() {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { greeted: m.greeted || {}, open: m.open || {}, returned: m.returned || {}, breaks: m.breaks || {} };
  } catch {
    return { greeted: {}, open: {}, returned: {}, breaks: {} };
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
