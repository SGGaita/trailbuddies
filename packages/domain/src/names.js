/**
 * Children's names (ONB-07): a first name or nickname is enough, so only the first word
 * of what a grown-up types is kept.
 * @param {string} typed
 */
export function firstNameOnly(typed) {
  const words = String(typed || "").trim().split(/\s+/).filter(Boolean);
  return { name: words[0] || "", trimmed: words.length > 1 };
}
