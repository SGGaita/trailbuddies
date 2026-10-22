/**
 * Fetch client for the Trailbuddies API (services/api). Grows endpoint by endpoint;
 * Sprint 0 has the health check only.
 */

export class ApiError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {{ baseUrl: string, fetch?: typeof fetch, token?: () => string | null }} opts
 */
export function createClient({ baseUrl, fetch: f = globalThis.fetch, token }) {
  const base = baseUrl.replace(/\/$/, "");
  /** @param {string} path @param {RequestInit} [init] */
  async function request(path, init = {}) {
    const headers = { Accept: "application/json", ...(init.headers || {}) };
    const tk = token?.();
    if (tk) headers.Authorization = `Bearer ${tk}`;
    const res = await f(`${base}${path}`, { ...init, headers });
    if (!res.ok) throw new ApiError(res.status, `${init.method || "GET"} ${path} failed with ${res.status}`);
    return res.status === 204 ? null : res.json();
  }
  return {
    /** @returns {Promise<{ status: string, version: string, database: string }>} */
    health: () => request("/health"),
    request,
  };
}
