import { hashPin, checkPin } from "./pin.js";

// FAM-02: an optional picture password for a learner. The child taps 3 of 9 pictures in order.
// It keeps a younger sibling out of a profile (and its treasures); it is not real security,
// so the sequence is stored hashed with a salt, like the grown-up PIN, and can be reset by a parent.

/** The 9 pictures, drawn in code (apps/web/components/art/PictureIcon.js). */
export const PICTURES = ["apple", "banana", "cat", "dog", "fish", "star", "sun", "moon", "flower"];
export const PICTURE_COUNT = 3;
/** Wrong tries before the first picture is shown as a hint. */
export const HINT_AFTER = 3;

/** @param {string[]} seq */
export const validPictureSeq = (seq) =>
  Array.isArray(seq) && seq.length === PICTURE_COUNT && seq.every((p) => PICTURES.includes(p));

/** The string that gets hashed. @param {string[]} seq */
export const pictureKey = (seq) => `pics:${seq.join("-")}`;

/**
 * What the lock screen shows after a wrong try. The hint (the first picture) is kept in clear
 * on the lock as `hint`, next to the hashed sequence.
 * @param {number} wrongTries wrong attempts so far
 * @returns {{ hint: boolean }}
 */
export const afterWrongTry = (wrongTries) => ({ hint: wrongTries >= HINT_AFTER });

/** Few iterations: a picture password only keeps a sibling out, and a child shouldn't wait. */
export const PICTURE_ITERATIONS = 20_000;

/**
 * The lock a parent sets: the sequence hashed on the device, plus the first picture as the hint.
 * @param {string[]} seq
 */
export async function makePictureLock(seq) {
  if (!validPictureSeq(seq)) throw new Error("Choose 3 pictures");
  const h = await hashPin(pictureKey(seq), PICTURE_ITERATIONS);
  return { ...h, hint: seq[0] };
}

/** @param {string[]} seq @param {{ salt: string, hash: string, iterations: number }} lock */
export const checkPictureLock = (seq, lock) => validPictureSeq(seq) && checkPin(pictureKey(seq), lock);
