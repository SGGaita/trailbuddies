/**
 * PIN hashing with PBKDF2-SHA256 (Web Crypto, available in browsers, React Native with
 * a polyfill, and Node 20+). The PIN never leaves the device: only { salt, hash,
 * iterations } is stored and synced, and every device checks the PIN locally.
 */

const ITERATIONS = 150_000;

const b64 = (/** @type {Uint8Array} */ bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** @param {string} pin @param {string} salt @param {number} iterations */
async function derive(pin, salt, iterations) {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations },
    key,
    256,
  );
  return b64(new Uint8Array(bits));
}

/**
 * @param {string} pin
 * @returns {Promise<{ salt: string, hash: string, iterations: number }>}
 */
export async function hashPin(pin) {
  const salt = b64(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await derive(pin, salt, ITERATIONS), iterations: ITERATIONS };
}

/**
 * @param {string} pin
 * @param {{ salt: string, hash: string, iterations: number }} stored
 */
export async function checkPin(pin, stored) {
  if (!stored) return false;
  return (await derive(pin, stored.salt, stored.iterations)) === stored.hash;
}
