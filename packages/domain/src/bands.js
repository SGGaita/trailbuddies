/**
 * Age bands (concept report §6.2). Age sets the starting band and the look;
 * learners can later sit at different bands per subject.
 */

/** @typedef {"seedling" | "sprout" | "explorer" | "voyager" | "trailblazer"} Band */

export const BANDS = /** @type {const} */ ([
  { id: "seedling", name: "Seedling", minAge: 3, choices: 3 },
  { id: "sprout", name: "Sprout", minAge: 5, choices: 3 },
  { id: "explorer", name: "Explorer", minAge: 7, choices: 4 },
  { id: "voyager", name: "Voyager", minAge: 9, choices: 4 },
  { id: "trailblazer", name: "Trailblazer", minAge: 13, choices: 4 },
]);

/** Youngest age the app is for. */
export const MIN_AGE = 3;

/**
 * Whole years between a birth month/year and a date.
 * @param {{ year: number, month: number }} birth month is 1–12
 * @param {Date} [on]
 */
export function ageFrom(birth, on = new Date()) {
  let age = on.getFullYear() - birth.year;
  if (on.getMonth() + 1 < birth.month) age -= 1;
  return age;
}

/**
 * Starting band for an age. Under 3 is not allowed.
 * @param {number} age
 * @returns {Band}
 */
export function bandForAge(age) {
  if (!Number.isFinite(age) || age < MIN_AGE)
    throw new RangeError(`Trailbuddies is for ages ${MIN_AGE} and up`);
  let band = BANDS[0].id;
  for (const b of BANDS) if (age >= b.minAge) band = b.id;
  return band;
}

/** @param {number} age */
export const isAdult = (age) => age >= 18;

/** A PIN replaces the arithmetic gate once any learner on the account is 8 or older. */
export const needsPin = (/** @type {number[]} */ ages) => ages.some((a) => a >= 8);
