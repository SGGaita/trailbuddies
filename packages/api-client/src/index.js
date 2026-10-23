/**
 * Fetch client for the Trailbuddies API (services/api). The web app calls it through its
 * own /api proxy, so the session cookie is first-party; mobile passes the API URL.
 */

export class ApiError extends Error {
  /** @param {number} status @param {string} message @param {string} [code] */
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
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
      let code;
      try {
        const body = await res.json();
        if (typeof body.detail === "string") message = body.detail;
        else if (body.detail?.message) {
          message = body.detail.message;
          code = body.detail.code;
        }
      } catch {
        /* not JSON */
      }
      throw new ApiError(res.status, message, code);
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
    /** Sign out of every device. */
    logoutAll: () => post("/auth/logout-all"),
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
    /** Custom lessons (Lesson Builder). @param {string} familyId */
    lessons: (familyId) => request(`${fam(familyId)}/lessons`),
    /** @param {string} familyId @param {string} lessonId @param {object} body */
    putLesson: (familyId, lessonId, body) =>
      request(`${fam(familyId)}/lessons/${encodeURIComponent(lessonId)}`, { method: "PUT", json: body }),
    /** @param {string} familyId @param {string} lessonId */
    deleteLesson: (familyId, lessonId) =>
      request(`${fam(familyId)}/lessons/${encodeURIComponent(lessonId)}`, { method: "DELETE" }),
    /** Reserve an upload. @param {string} familyId @param {{ id: string, kind: "photo" | "voice", content_type: string, bytes: number }} body */
    startMedia: (familyId, body) => request(`${fam(familyId)}/media`, { method: "POST", json: body }),
    /** Ask the server to check an uploaded file. @param {string} familyId @param {string} mediaId */
    completeMedia: (familyId, mediaId) =>
      request(`${fam(familyId)}/media/${encodeURIComponent(mediaId)}/complete`, { method: "POST" }),
    /** Where the browser can fetch a family member's media (redirects to a short-lived link). */
    mediaUrl: (familyId, mediaId) => `${base}${fam(familyId)}/media/${encodeURIComponent(mediaId)}`,
    /** @param {string} id */
    members: (id) => request(`${fam(id)}/members`),
    /** @param {string} id @param {{ email: string, role: "parent" | "viewer" }} body */
    invite: (id, body) => post(`${fam(id)}/invites`, body),
    /** @param {string} id @param {number} inviteId */
    cancelInvite: (id, inviteId) => request(`${fam(id)}/invites/${inviteId}`, { method: "DELETE" }),
    /** @param {string} id @param {string} userId */
    removeMember: (id, userId) =>
      request(`${fam(id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    /** @param {string} token */
    acceptInvite: (token) => post("/invites/accept", { token }),
    /** @param {string} familyId @param {object[]} events */
    pushEvents: (familyId, events) => post("/sync/events", { family_id: familyId, events }),
    /** @param {string} familyId @param {number} after */
    pullEvents: (familyId, after = 0) =>
      request(`/sync/events?family_id=${encodeURIComponent(familyId)}&after=${after}`),
  };
}
