/**
 * Screen-time limit and bedtime lock (concept report §4.3 step 6). The trail rests when
 * today's minutes reach the limit, or during bedtime. Pure, so web and mobile agree.
 */

const toMin = (/** @type {string} */ hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * @param {{ limit?: number, bedtime?: { on: boolean, start: string, end: string } }} settings
 * @param {number} minutesToday
 * @param {Date} [now]
 * @returns {null | "limit" | "bedtime"}
 */
export function restReason(settings, minutesToday, now = new Date()) {
  const b = settings.bedtime;
  if (b?.on) {
    const t = now.getHours() * 60 + now.getMinutes();
    const start = toMin(b.start);
    const end = toMin(b.end);
    // Overnight windows (19:30 → 06:30) wrap past midnight.
    const inside = start <= end ? t >= start && t < end : t >= start || t < end;
    if (inside) return "bedtime";
  }
  if (settings.limit && minutesToday >= settings.limit) return "limit";
  return null;
}
