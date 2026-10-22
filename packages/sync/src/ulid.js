// ULID: 48-bit time + 80-bit randomness, Crockford base32, sortable by creation time.
// Generated on the device so offline-created records never collide (development plan §4.3).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** @param {() => number} [rand] @param {number} [now] */
export function ulid(now = Date.now(), rand = defaultRandom) {
  let t = now;
  let time = "";
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[t % 32] + time;
    t = Math.floor(t / 32);
  }
  let r = "";
  for (let i = 0; i < 16; i++) r += ALPHABET[Math.floor(rand() * 32) % 32];
  return time + r;
}

function defaultRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const b = new Uint8Array(1);
    globalThis.crypto.getRandomValues(b);
    return b[0] / 256;
  }
  return Math.random();
}
