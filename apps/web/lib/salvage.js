// OFF-07: when something breaks mid-lesson, keep the answers given so far. The lesson player
// registers how to save them; the error screen calls it once.
let keep = null;

/** @param {(() => void) | null} fn */
export const setSalvage = (fn) => {
  keep = fn;
};

/** Clear later (after an error screen has had its chance), and only if it's still `fn`. */
export const clearSalvageSoon = (fn) =>
  setTimeout(() => {
    if (keep === fn) keep = null;
  }, 0);

export function salvage() {
  const fn = keep;
  keep = null;
  try {
    fn?.();
  } catch {
    /* saving must never make things worse */
  }
}
