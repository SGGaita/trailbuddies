/**
 * Fetch client for the Trailbuddies API (services/api). The web app calls it through its
 * own /api proxy, so the session cookie is first-party; mobile passes the API URL.
 */

export class ApiError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {{ baseUrl: string, fetch?: typeof fetch }} opts
 */
export function createClient({ baseUrl, fetch: f = (...a) => globalThis.fetch(...a) }) {
  const base = baseUrl.replace(/\/$/, "");
  /** @param {string} path @param {RequestInit & { json?: unknown }} [init] */
  async function request(path, init = {}) {
    const { json, ...rest } = init;
    const headers = { Accept: "application/json", ...(rest.headers || {}) };
    if (json !== undefined) headers["Content-Type"] = "application/json";
    const res = await f(`${base}${path}`, {
      credentials: "include",
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    if (!res.ok) {
      let message = `${rest.method || "GET"} ${path} failed with ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body.detail === "string") message = body.detail;
      } catch {
        /* not JSON */
      }
      throw new ApiError(res.status, message);
    }
    return res.status === 204 ? null : res.json();
  }
  const post = (path, json) => request(path, { method: "POST", json });
  const fam = (id) => `/families/${encodeURIComponent(id)}`;
  return {
    request,
    /** @returns {Promise<{ status: string, version: string, database: string }>} */
    health: () => request("/health"),
    authConfig: () => request("/auth/config"),
    /** @param {string} email */
    magicLink: (email) => post("/auth/magic-link", { email }),
    /** @param {string} token */
    verify: (token) => post("/auth/verify", { token }),
    logout: () => post("/auth/logout"),
    me: () => request("/me"),
    /** @param {string} name */
    updateMe: (name) => request("/me", { method: "PATCH", json: { name } }),
    policy: () => request("/policy"),
    /** @param {{ name: string, country: string }} body */
    createFamily: (body) => post("/families", body),
    /** @param {string} id @param {object} body */
    patchFamily: (id, body) => request(fam(id), { method: "PATCH", json: body }),
    /** @param {string} id @param {{ policy_version: string, scopes: Record<string, boolean> }} body */
    giveConsent: (id, body) => post(`${fam(id)}/consents`, { ...body, agreed: true }),
    /** @param {string} familyId @param {string} learnerId @param {object} body */
    putLearner: (familyId, learnerId, body) =>
      request(`${fam(familyId)}/learners/${encodeURIComponent(learnerId)}`, { method: "PUT", json: body }),
    /** @param {string} familyId @param {string} learnerId */
    deleteLearner: (familyId, learnerId) =>
      request(`${fam(familyId)}/learners/${encodeURIComponent(learnerId)}`, { method: "DELETE" }),
    /** @param {string} familyId @param {object[]} events */
    pushEvents: (familyId, events) => post("/sync/events", { family_id: familyId, events }),
    /** @param {string} familyId @param {number} after */
    pullEvents: (familyId, after = 0) =>
      request(`/sync/events?family_id=${encodeURIComponent(familyId)}&after=${after}`),
  };
}
