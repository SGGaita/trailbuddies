import en from "./en.js";

const TABLES = { en };

/** @typedef {keyof typeof en} Key */

/**
 * Translate a key, filling {placeholders}. Unknown keys return the key itself
 * so missing strings are easy to spot.
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 * @param {string} [lang]
 */
export function t(key, vars = {}, lang = "en") {
  const table = TABLES[lang] || en;
  const s = table[key] ?? en[key];
  if (s == null) return key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Languages with a UI table. */
export const LANGUAGES = Object.keys(TABLES);
export { en };
