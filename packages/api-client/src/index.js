/**
 * Fetch client for the Trailbuddies API (services/api). The web app calls it through its
 * own /api proxy, so the session cookie is first-party; mobile passes the API URL.
 */

export class ApiError extends Error {
  /** @param {number} status @param {string} message @param {string} [code] */
  constructor(status, message, code, problems) {
    super(message);
    this.status = status;
    this.code = code;
    /** Field problems from the content admin's checks (CMS-03). @type {string[]} */
    this.problems = problems || [];
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
      let problems;
      try {
        const body = await res.json();
        if (typeof body.detail === "string") message = body.detail;
        else if (body.detail?.message) {
          message = body.detail.message;
          code = body.detail.code;
          problems = body.detail.problems;
        }
      } catch {
        /* not JSON */
      }
      throw new ApiError(res.status, message, code, problems);
    }
    return res.status === 204 ? null : res.json();
  }
  const post = (path, json) => request(path, { method: "POST", json });
  const fam = (id) => `/families/${encodeURIComponent(id)}`;
  const shareOwner = (o) => (o.classId ? `/classes/${encodeURIComponent(o.classId)}` : fam(o.familyId));
  return {
    request,
    /** @returns {Promise<{ status: string, version: string, database: string }>} */
    health: () => request("/health"),
    authConfig: () => request("/auth/config"),
    /** @param {string} email */
    /** @param {string} email @param {"parent" | "teacher"} [role] teacher: the link opens teacher set-up anywhere */
    magicLink: (email, role) => post("/auth/magic-link", role ? { email, role } : { email }),
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
    /** Badge Studio (BST-01…06): the family's own badges. */
    badges: (familyId) => request(`${fam(familyId)}/badges`),
    putBadge: (familyId, badgeId, body) =>
      request(`${fam(familyId)}/badges/${encodeURIComponent(badgeId)}`, { method: "PUT", json: body }),
    deleteBadge: (familyId, badgeId) =>
      request(`${fam(familyId)}/badges/${encodeURIComponent(badgeId)}`, { method: "DELETE" }),
    /** Wishes (BST-07): real-world rewards a child saves treasures for. */
    wishes: (familyId) => request(`${fam(familyId)}/wishes`),
    putWish: (familyId, wishId, body) =>
      request(`${fam(familyId)}/wishes/${encodeURIComponent(wishId)}`, { method: "PUT", json: body }),
    deleteWish: (familyId, wishId) =>
      request(`${fam(familyId)}/wishes/${encodeURIComponent(wishId)}`, { method: "DELETE" }),
    startMedia: (familyId, body) => request(`${fam(familyId)}/media`, { method: "POST", json: body }),
    /** Ask the server to check an uploaded file. @param {string} familyId @param {string} mediaId */
    completeMedia: (familyId, mediaId, scan) =>
      request(`${fam(familyId)}/media/${encodeURIComponent(mediaId)}/complete`, {
        method: "POST",
        ...(scan ? { json: { scan } } : {}),
      }),
    /** SAF-08, MOD-02: the family's photos that are hidden (flagged by the check, or by the safety team). */
    hiddenMedia: (familyId) => request(`${fam(familyId)}/media-hidden`),
    /** Share codes (SHR-01…05). owner: { familyId } or { classId }. */
    shares: (owner) => request(`${shareOwner(owner)}/shares`),
    createShare: (owner, body) => post(`${shareOwner(owner)}/shares`, body),
    revokeShare: (owner, shareId) =>
      request(`${shareOwner(owner)}/shares/${encodeURIComponent(shareId)}`, { method: "DELETE" }),
    sharePreview: (code) => request(`/shares/${encodeURIComponent(code)}`),
    shareMediaUrl: (code, mediaId) => `${base}/shares/${encodeURIComponent(code)}/media/${encodeURIComponent(mediaId)}`,
    importShare: (code, target) =>
      post(`/shares/${encodeURIComponent(code)}/import`, target.classId ? { class_id: target.classId } : { family_id: target.familyId }),
    reportShare: (shareId, familyId, reason, note) =>
      post(`/shares/${encodeURIComponent(shareId)}/reports`, { family_id: familyId, reason, ...(note ? { note } : {}) }),
    /** The safety team's queue (MOD-01…03): admins and moderators. */
    moderation: () => request("/admin/moderation"),
    moderate: (itemId, body) => post(`/admin/moderation/${encodeURIComponent(itemId)}`, body),
    /** The staff area (CMS-01…04). */
    staffMe: () => request("/admin/me"),
    staff: () => request("/admin/staff"),
    addStaff: (body) => post("/admin/staff", body),
    changeStaffRole: (email, role) => request(`/admin/staff/${encodeURIComponent(email)}`, { method: "PATCH", json: { role } }),
    removeStaff: (email) => request(`/admin/staff/${encodeURIComponent(email)}`, { method: "DELETE" }),
    content: () => request("/admin/content"),
    importContent: (body) => post("/admin/content/import", body),
    contentUnit: (id) => request(`/admin/content/units/${encodeURIComponent(id)}`),
    saveContentUnit: (id, unit, assets) =>
      request(`/admin/content/units/${encodeURIComponent(id)}`, { method: "PUT", json: assets ? { unit, assets } : { unit } }),
    discardDraft: () => request("/admin/content/draft", { method: "DELETE" }),
    publishContent: (note) => post("/admin/content/publish", { note }),
    /** CMS-06 review, CMS-07 roll back. */
    submitContent: (note) => post("/admin/content/submit", { note }),
    reviewContent: (approve, comment) => post("/admin/content/review", { approve, ...(comment ? { comment } : {}) }),
    contentReview: () => request("/admin/content/review"),
    contentVersions: () => request("/admin/content/versions"),
    rollbackContent: (version, note) => post("/admin/content/rollback", { version, note }),
    /** CMS-05 map & trails. */
    addTrail: (body) => post("/admin/content/trails", body),
    changeTrail: (id, patch) => request(`/admin/content/trails/${encodeURIComponent(id)}`, { method: "PATCH", json: patch }),
    reorderContent: (subjects, units = {}) => request("/admin/content/order", { method: "PUT", json: { subjects, units } }),
    addUnit: (subject, body) => post(`/admin/content/trails/${encodeURIComponent(subject)}/units`, body),
    /** CMS-08 badges. */
    contentBadges: () => request("/admin/content/badges"),
    saveBadge: (badge) => request(`/admin/content/badges/${encodeURIComponent(badge.id)}`, { method: "PUT", json: { badge } }),
    contentAssets: () => request("/admin/content/assets"),
    startContentAsset: (body) => post("/admin/content/assets", body),
    completeContentAsset: (id, scan) =>
      request(`/admin/content/assets/${encodeURIComponent(id)}/complete`, { method: "POST", ...(scan ? { json: { scan } } : {}) }),
    decideContentAsset: (id, approve, reason) =>
      post(`/admin/content/assets/${encodeURIComponent(id)}/decision`, { approve, ...(reason ? { reason } : {}) }),
    contentAssetUrl: (id) => `${base}/admin/content/assets/${encodeURIComponent(id)}/file`,
    adminMediaUrl: (mediaId) => `${base}/admin/media/${encodeURIComponent(mediaId)}`,
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
    /** Signed-in devices of the family (FAM-08). @param {string} familyId */
    devices: (familyId) => request(`${fam(familyId)}/devices`),
    /** @param {string} familyId @param {string} sessionId */
    signOutDevice: (familyId, sessionId) =>
      request(`${fam(familyId)}/devices/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
    /** Published content (CNT-02): no sign-in needed. @param {"production" | "preview"} channel */
    contentManifest: (channel) => request(`/content/manifest?channel=${encodeURIComponent(channel)}`),
    /** @param {string} file a pack's file name from the manifest */
    contentPack: (file) => request(`/content/packs/${encodeURIComponent(file)}`),
    /** SAF-03: exports still downloadable. @param {string} familyId */
    exports: (familyId) => request(`${fam(familyId)}/exports`),
    /** SAF-03: build the ZIP and email the link. @param {string} familyId */
    requestExport: (familyId) => post(`${fam(familyId)}/exports`),
    /** SAF-04: email the owner a link to confirm. @param {string} familyId */
    requestDeletion: (familyId) => post(`${fam(familyId)}/deletion`),
    /** SAF-04: the emailed link. @param {string} token */
    confirmDeletion: (token) => post("/families/deletion/confirm", { token }),
    /** SAF-04: keep the family after all. @param {string} familyId */
    undoDeletion: (familyId) => post(`${fam(familyId)}/deletion/undo`),
    /** OPS-06 @param {string} familyId */
    flags: (familyId) => request(`${fam(familyId)}/flags`),
    /** Closed beta: join with an invite code. @param {string} familyId @param {string} code */
    joinBeta: (familyId, code) => post(`${fam(familyId)}/beta`, { code }),
    /**
     * Grown-ups' feedback (beta). @param {string} familyId
     * @param {{ kind: "idea" | "problem" | "praise", message: string, screen?: string, version?: string }} body
     */
    sendFeedback: (familyId, body) => post(`${fam(familyId)}/feedback`, body),
    /** FAM-05: a fresh link for an invitation. @param {string} familyId @param {number} inviteId */
    resendInvite: (familyId, inviteId) => post(`${fam(familyId)}/invites/${inviteId}/resend`),
    /** LES-19 @param {string} familyId */
    sounds: (familyId) => request(`${fam(familyId)}/sounds`),
    /** LES-19: link a recorded clip to a sound, or null for the device voice. */
    putSound: (familyId, sound, mediaId) =>
      request(`${fam(familyId)}/sounds/${encodeURIComponent(sound)}`, { method: "PUT", json: { media_id: mediaId } }),
    /** HLP-02 @param {{ topic?: string, subject: string, message: string, diagnostics?: object | null }} body */
    contactSupport: (body) => post("/support", body),
    // --- Teachers and classes (Sprint 9) ---
    /** ONB-13 @param {{ school_name: string, join_school?: string }} body */
    becomeTeacher: (body) => post("/teacher", body),
    teacher: () => request("/teacher"),
    /** HLP-03 @param {Record<string, boolean>} tips */
    teacherTips: (tips) => request("/teacher/tips", { method: "PATCH", json: tips }),
    /** CLS-06 @param {string} schoolId @param {{ name: string, role: string }} body */
    schoolConsent: (schoolId, body) => post(`/schools/${encodeURIComponent(schoolId)}/consent`, { ...body, agreed: true }),
    /** CLS-01 @param {{ name: string, year_group?: string, band: string }} body */
    createClass: (body) => post("/classes", body),
    /** @param {string} classId */
    getClass: (classId) => request(`/classes/${encodeURIComponent(classId)}`),
    newJoinCode: (classId) => post(`/classes/${encodeURIComponent(classId)}/code`),
    /** CLS-02 @param {string} classId @param {{ first_name: string, initial?: string | null }[]} students */
    addStudents: (classId, students) => post(`/classes/${encodeURIComponent(classId)}/students`, { students }),
    editStudent: (classId, studentId, body) =>
      request(`/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`, { method: "PATCH", json: body }),
    removeStudent: (classId, studentId) =>
      request(`/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`, { method: "DELETE" }),
    /** CLS-05 */
    studentProgress: (classId, studentId) =>
      request(`/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/progress`),
    /** Class play sync: the same shapes as pushEvents/pullEvents, keyed by class. */
    pushClassEvents: (classId, events) => post(`/classes/${encodeURIComponent(classId)}/events`, { events }),
    pullClassEvents: (classId, after = 0) => request(`/classes/${encodeURIComponent(classId)}/events?after=${after}`),
    /** CLS-04 @param {string} code */
    joinPreview: (code) => request(`/join/${encodeURIComponent(code)}`),
    links: (familyId) => request(`${fam(familyId)}/links`),
    /** @param {string} familyId @param {{ code: string, student_id: string, learner_id: string, scope?: "class" | "all" }} body */
    link: (familyId, body) => post(`${fam(familyId)}/links`, body),
    setLinkScope: (familyId, studentId, scope) =>
      request(`${fam(familyId)}/links/${encodeURIComponent(studentId)}`, { method: "PATCH", json: { scope } }),
    unlink: (familyId, studentId) => request(`${fam(familyId)}/links/${encodeURIComponent(studentId)}`, { method: "DELETE" }),
    // --- Sprint 10: groups, assignments, class progress, classroom devices ---
    /** CLS-07 @param {string} classId @param {{ name: string, student_ids?: string[] }} body */
    createGroup: (classId, body) => post(`/classes/${encodeURIComponent(classId)}/groups`, body),
    editGroup: (classId, groupId, body) =>
      request(`/classes/${encodeURIComponent(classId)}/groups/${encodeURIComponent(groupId)}`, { method: "PATCH", json: body }),
    deleteGroup: (classId, groupId) =>
      request(`/classes/${encodeURIComponent(classId)}/groups/${encodeURIComponent(groupId)}`, { method: "DELETE" }),
    /** ASN-01 */
    assignments: (classId) => request(`/classes/${encodeURIComponent(classId)}/assignments`),
    /** @param {string} classId @param {{ kind: "unit" | "custom", unit_id?: string, title?: string, lesson_id?: string, target: object, due_on?: string | null }} body */
    assign: (classId, body) => post(`/classes/${encodeURIComponent(classId)}/assignments`, body),
    unassign: (classId, assignmentId) =>
      request(`/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}`, { method: "DELETE" }),
    /** ASN-02..04: assignments, groups and the play that counts towards them. */
    classProgress: (classId) => request(`/classes/${encodeURIComponent(classId)}/assignments/progress`),
    /**
     * ASN-05: every child with the badges they first earned in the week.
     * @param {string} classId @param {{ from: string, to: string }} [week] UTC instants (domain `wallWeek`)
     */
    /** T05 class badges: made and awarded by the teacher. */
    classBadges: (classId) => request(`/classes/${encodeURIComponent(classId)}/badges`),
    putClassBadge: (classId, badgeId, body) =>
      request(`/classes/${encodeURIComponent(classId)}/badges/${encodeURIComponent(badgeId)}`, {
        method: "PUT",
        json: body,
      }),
    deleteClassBadge: (classId, badgeId) =>
      request(`/classes/${encodeURIComponent(classId)}/badges/${encodeURIComponent(badgeId)}`, { method: "DELETE" }),
    /** @param {string} classId @param {string} badgeId @param {string[]} studentIds */
    awardClassBadge: (classId, badgeId, studentIds) =>
      request(`/classes/${encodeURIComponent(classId)}/badges/${encodeURIComponent(badgeId)}/award`, {
        method: "POST",
        json: { student_ids: studentIds },
      }),
    classBadgeWall: (classId, week) =>
      request(
        `/classes/${encodeURIComponent(classId)}/badge-wall` +
          (week ? `?${new URLSearchParams({ from: week.from, to: week.to })}` : ""),
      ),
    /** MAP-06b: work from the children's teachers, for Class Island at home. */
    familyAssignments: (familyId) => request(`${fam(familyId)}/assignments`),
    /** CRM-01 @param {string} classId @param {{ id: string, label: string }} body */
    addDevice: (classId, body) => post(`/classes/${encodeURIComponent(classId)}/devices`, body),
    checkDevice: (classId, deviceId) =>
      request(`/classes/${encodeURIComponent(classId)}/devices/${encodeURIComponent(deviceId)}`),
    removeDevice: (classId, deviceId) =>
      request(`/classes/${encodeURIComponent(classId)}/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE" }),
    /** CRM-02: 'Ask my teacher' from a class tablet. */
    askTeacher: (classId, studentId) =>
      post(`/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/help`),
    /** SAF-07 option 2: a scrubbed error report. @param {object} report */
    reportError: (report) => post("/errors", report),
    /** @param {string} familyId @param {number} after */
    pullEvents: (familyId, after = 0) =>
      request(`/sync/events?family_id=${encodeURIComponent(familyId)}&after=${after}`),
  };
}
