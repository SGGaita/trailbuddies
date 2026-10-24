/**
 * Devices (FAM-08). A family can be signed in on a few devices at once: Free 2, Family 6.
 * Signing in on one more still works, and the grown-up is asked to sign out an old one.
 */

export const DEVICE_LIMITS = { free: 2, family: 6 };

/** @param {string} plan */
export const deviceLimit = (plan) => DEVICE_LIMITS[plan] ?? DEVICE_LIMITS.free;

/**
 * @param {Array<{ id: string, last_seen_at: string }>} devices
 * @param {string} plan
 * @returns {{ over: number, oldest: string[] }} how many too many, and which to suggest signing out
 */
export function deviceCheck(devices, plan) {
  const over = Math.max(0, devices.length - deviceLimit(plan));
  const oldest = [...devices]
    .sort((a, b) => Date.parse(a.last_seen_at) - Date.parse(b.last_seen_at))
    .slice(0, over)
    .map((d) => d.id);
  return { over, oldest };
}

/**
 * A short, human name for a device from its browser's user agent ("Chrome on Android").
 * Only the browser and system names are kept; nothing that identifies the person.
 * @param {string} ua
 */
export function deviceName(ua = "") {
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPad/i.test(ua)
      ? "iPad"
      : /iPhone/i.test(ua)
        ? "iPhone"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/i.test(ua)
            ? "Mac"
            : /CrOS/i.test(ua)
              ? "Chromebook"
              : /Linux/i.test(ua)
                ? "Linux"
                : "a device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  return `${browser} on ${os}`;
}
