/**
 * Difficulty within a band (ported from Chipuka's Auto/1/2/3 control).
 * Level 1 = 2 choices, 2 = 3 choices, 3 = 4 choices. "auto" starts from the band
 * and adapts: two 3-star lessons in a row raise the level, two 1-star lessons lower it.
 * A grown-up can lock a level instead.
 */

/** @typedef {"auto" | "1" | "2" | "3"} DifficultySetting */
/** @typedef {1 | 2 | 3} Level */

export const DIFFICULTY_SETTINGS = /** @type {const} */ (["auto", "1", "2", "3"]);

const CHOICES = { 1: 2, 2: 3, 3: 4 };

/** Starting level for each band when the setting is "auto". */
export const BAND_START_LEVEL = { seedling: 2, sprout: 2, explorer: 3, voyager: 3, trailblazer: 3 };

/** @param {Level} level */
export const choicesFor = (level) => CHOICES[level] ?? 3;

const clamp = (n) => /** @type {Level} */ (Math.max(1, Math.min(3, n)));

/**
 * The auto level after a run of lesson results (stars, oldest first).
 * @param {string} band
 * @param {number[]} results
 * @returns {Level}
 */
export function autoLevel(band, results) {
  let level = clamp(BAND_START_LEVEL[band] ?? 2);
  let high = 0;
  let low = 0;
  for (const stars of results) {
    if (stars >= 3) {
      high += 1;
      low = 0;
    } else if (stars <= 1) {
      low += 1;
      high = 0;
    } else {
      high = 0;
      low = 0;
    }
    if (high === 2) {
      level = clamp(level + 1);
      high = 0;
    }
    if (low === 2) {
      level = clamp(level - 1);
      low = 0;
    }
  }
  return level;
}

/**
 * The level to use: a locked setting wins over auto.
 * @param {DifficultySetting | undefined} setting
 * @param {string} band
 * @param {number[]} results
 * @returns {Level}
 */
export function effectiveLevel(setting, band, results) {
  if (setting && setting !== "auto" && CHOICES[Number(setting)])
    return /** @type {Level} */ (Number(setting));
  return autoLevel(band, results);
}

/** Text for grown-ups, e.g. "Level 2 · 3 choices". */
export const describeLevel = (/** @type {Level} */ level) => `Level ${level} · ${choicesFor(level)} choices`;

/** Words for each setting in the grown-up zone (ADP-02). */
export const SETTING_NAMES = {
  auto: "Auto",
  1: "Locked: easier",
  2: "Locked: just right",
  3: "Locked: harder",
};

/**
 * A learner's setting for one subject (ADP-02): a per-subject lock wins over the learner-wide
 * setting, which wins over auto.
 * @param {{ difficulty?: DifficultySetting, levels?: Record<string, DifficultySetting> }} learner
 * @param {string} subjectId
 * @returns {DifficultySetting}
 */
export function settingFor(learner, subjectId) {
  const own = learner.levels?.[subjectId];
  if (own && DIFFICULTY_SETTINGS.includes(own) && own !== "auto") return own;
  return DIFFICULTY_SETTINGS.includes(learner.difficulty) ? learner.difficulty : "auto";
}
