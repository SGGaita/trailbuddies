// A small in-memory stand-in for services/api, served through Playwright's request
// routing on /api/*. It follows the real API's contract (see services/api/tests) so the
// web app's sign-in, onboarding and sync can be tested at every screen size.

import { validate } from "@trailbuddies/content-schema";
import { buildPacks } from "../../../packages/content/scripts/packs.js";
import {
  REPORT_THRESHOLD,
  ROLE_CAN,
  diffUnit,
  newId,
  newUnit,
  syncEntry,
  uploadedMediaId,
  countryRules,
  deviceLimit,
  deviceName,
  formatShareCode,
  normaliseShareCode,
  packageMedia,
  sharePackage,
} from "@trailbuddies/domain";

export const POLICY = "2026-10";
const LIMITS = { free: 1, family: 6 };

export function newServer() {
  return {
    users: {},
    families: {},
    members: [], // { family, user, role }
    invites: {}, // token -> { id, family, email, role, accepted }
    sessions: {}, // session id -> user id (one per signed-in device)
    learners: {},
    events: [],
    consents: {},
    lessons: {}, // id -> lesson (with family_id)
    badges: {}, // S11 Badge Studio: id -> badge (with family_id or class_id)
    wishes: {}, // S11: id -> wish (with family_id)
    media: {}, // id -> { family, kind, type, bytes: Buffer | null, status }
    tokens: {},
    sent: [],
    offline: false,
    devices: {}, // session id -> { name, last_seen_at }
    manifest: {}, // channel -> published manifest (CNT-02)
    packs: {}, // file -> pack
    exports: [], // SAF-03
    deletions: {}, // family -> { token, purge_after }
    flags: {}, // family -> { key: bool } (OPS-06)
    feedback: [],
    errors: [], // SAF-07 own log
    teachers: {}, // user id -> { school_id, tips } (S9)
    schools: {},
    classes: {},
    students: {}, // roster entries
    classEvents: [],
    groups: {}, // S10: id -> { id, class_id, name, student_ids }
    assignments: {}, // S10
    classDevices: {}, // S10: id -> { id, class_id, label, removed }
    shares: {}, // S11b: id -> share (code, family_id or class_id, package, status…)
    reports: [], // S11b: { share_id, family_id, reason }
    modItems: {}, // S11b: id -> { kind, share_id, media_id, reason, status, created_at }
    modLog: [], // S11b: the audit log
    admins: ["steve@trailbuddies.africa"], // TB_ADMIN_EMAILS
    staff: {}, // S12 CMS-01: email -> { role, invited_by, seen_at }
    cms: { live: null, draft: null, log: [], versions: [] }, // S12 CMS-02: { version, catalogue, units, assets, by }
    contentAssets: {}, // S12 CMS-03: id -> { status, approval, uploaded_by, label }
    seq: 0,
  };
}

const staffRole = (srv, email) => (srv.admins.includes(email) ? "admin" : srv.staff[email]?.role || null);
const cmsCan = (srv, email, action) => Boolean(ROLE_CAN[staffRole(srv, email)]?.includes(action));
const cmsCurrent = (srv) => {
  const { live, draft } = srv.cms;
  return draft
    ? { ...live, catalogue: draft.catalogue || live.catalogue, units: { ...live.units, ...draft.units }, assets: { ...live.assets, ...draft.assets }, badges: draft.badges || live.badges }
    : live;
};
const clone = (x) => JSON.parse(JSON.stringify(x));
/** The draft to change (S13: an edit after review sends it back to draft). */
function draftFor(srv, email) {
  const d = (srv.cms.draft ||= { version: Math.max(...srv.cms.versions.map((v) => v.version)) + 1, units: {}, assets: {}, by: {}, authors: [], created_by: email, catalogue: null, badges: null, status: "draft" });
  if (d.status !== "draft") {
    cmsLog(srv, email, "draft_reopened", `v${d.version}`, { was: d.status });
    Object.assign(d, { status: "draft", approved_by: null });
  }
  if (!d.authors.includes(email)) d.authors.push(email);
  return d;
}
function cmsChanges(srv) {
  const { live, draft } = srv.cms;
  if (!draft) return [];
  const units = Object.entries(draft.units)
    .map(([id, u]) => ({ kind: "unit", unit: id, title: u.title, changes: diffUnit(live.units[id] || null, u), by: draft.by[id] }))
    .filter((c) => c.changes.length);
  const map = [];
  if (draft.catalogue) {
    const was = Object.fromEntries(live.catalogue.subjects.map((x) => [x.id, x]));
    for (const x of draft.catalogue.subjects) {
      const b = was[x.id];
      if (!b) map.push(`new trail “${x.name}”`);
      else if (!!b.archived !== !!x.archived) map.push(`${x.archived ? "archived" : "restored"} “${x.name}”`);
    }
    const common = live.catalogue.subjects.map((x) => x.id).filter((i) => draft.catalogue.subjects.some((y) => y.id === i));
    if (draft.catalogue.subjects.map((x) => x.id).filter((i) => common.includes(i)).join() !== common.join()) map.push("trails reordered on the map");
  }
  const badges = [];
  if (draft.badges) {
    const was = Object.fromEntries((live.badges || []).map((b) => [b.id, b]));
    for (const b of draft.badges) {
      if (!was[b.id]) badges.push(`new badge “${b.name}”`);
      else if (!!was[b.id].retired !== !!b.retired) badges.push(`${b.retired ? "retired" : "brought back"} “${b.name}”`);
      else if (JSON.stringify(was[b.id]) !== JSON.stringify(b)) badges.push(`edited “${b.name}”`);
    }
  }
  return [
    ...(badges.length ? [{ kind: "badges", unit: "built-in", title: "Badges", changes: badges, by: draft.created_by }] : []),
    ...(map.length ? [{ kind: "catalogue", unit: "catalogue", title: "Map & trails", changes: map, by: draft.created_by }] : []),
    ...units,
  ];
}
function cmsSummary(srv) {
  const { live, draft } = srv.cms;
  if (!live) return { imported: false, live: null, draft: null, subjects: [], assets_waiting: 0 };
  const cur = cmsCurrent(srv);
  const changes = cmsChanges(srv);
  return {
    imported: true,
    has_badges: !!cur.badges,
    live: { version: live.version, published_at: live.at, by: live.by, note: live.note },
    draft: draft
      ? { version: draft.version, status: draft.status, note: draft.note || null, changes, created_by: draft.created_by, authors: draft.authors, submitted_by: draft.submitted_by || null, approved_by: draft.approved_by || null, review_note: draft.review_note || null }
      : null,
    subjects: cur.catalogue.subjects.map((sub) => ({
      id: sub.id,
      name: sub.name,
      place: sub.place,
      island: sub.island,
      art: sub.art || null,
      archived: !!sub.archived,
      units: sub.units.map((e) => ({ id: e.id, title: e.title, band: e.band, status: e.status, has_content: !!cur.units[e.id], items: cur.units[e.id]?.items.length || 0, edited: !!draft?.units[e.id] })),
    })),
    assets_waiting: Object.values(srv.contentAssets).filter((a) => a.approval === "waiting").length,
  };
}
const cmsLog = (srv, who, action, target, detail = null) => srv.cms.log.unshift({ id: `L${++srv.seq}`, who, action, target, detail, at: new Date().toISOString() });

/** S12: the staff area (CMS-01…04), following services/api/app/routes/staff.py. */
function staffRoutes(srv, route, { path, method, body, user }) {
  const email = user.email;
  const role = staffRole(srv, email);
  if (!role) return json(route, 403, { detail: "Only Trailbuddies staff can open this" });
  const need = (a) => (cmsCan(srv, email, a) ? null : json(route, 403, { detail: { code: "role", message: "Your role can't do that." } }));
  let m;
  if (path === "/admin/me") return json(route, 200, { email, role, can: [...ROLE_CAN[role]].sort() });
  if (path === "/admin/staff" && method === "GET")
    return (
      need("roles") ||
      json(route, 200, {
        staff: [...srv.admins.map((e) => ({ email: e, role: "admin", bootstrap: true })), ...Object.entries(srv.staff).map(([e, x]) => ({ email: e, role: x.role, invited_by: x.invited_by, seen_at: null, bootstrap: false }))],
        log: srv.cms.log.slice(0, 50),
      })
    );
  if (path === "/admin/staff" && method === "POST") {
    const no = need("roles");
    if (no) return no;
    const e = body.email.toLowerCase();
    if (srv.staff[e] || srv.admins.includes(e)) return json(route, 409, { detail: { code: "exists", message: "That person is already staff." } });
    srv.staff[e] = { role: body.role, invited_by: email };
    cmsLog(srv, email, "staff_add", e, { role: body.role });
    return json(route, 201, { email: e, role: body.role });
  }
  m = path.match(/^\/admin\/staff\/([^/]+)$/);
  if (m) {
    const no = need("roles");
    if (no) return no;
    const e = decodeURIComponent(m[1]);
    if (!srv.staff[e]) return json(route, 404, { detail: "Not staff" });
    if (method === "PATCH") {
      cmsLog(srv, email, "staff_role", e, { from: srv.staff[e].role, to: body.role });
      srv.staff[e].role = body.role;
      return json(route, 200, { email: e, role: body.role });
    }
    cmsLog(srv, email, "staff_remove", e, { role: srv.staff[e].role });
    delete srv.staff[e];
    return json(route, 204);
  }
  const canSee = cmsCan(srv, email, "edit") || cmsCan(srv, email, "approve-asset");
  if (path === "/admin/content" && method === "GET") return canSee ? json(route, 200, cmsSummary(srv)) : need("edit");
  if (path === "/admin/content/import" && method === "POST") {
    const no = need("publish");
    if (no) return no;
    if (srv.cms.live) {
      if (body.badges && !srv.cms.live.badges) {
        srv.cms.live.badges = body.badges;
        srv.cms.versions[srv.cms.versions.length - 1].snapshot.badges = body.badges;
        cmsLog(srv, email, "badges_import", "v1");
        return json(route, 201, cmsSummary(srv));
      }
      return json(route, 409, { detail: { code: "imported", message: "The content is already imported." } });
    }
    const problems = body.units.flatMap((u) => validate("unit", u).errors.map((e) => `${u.id}: ${e}`));
    if (problems.length) return json(route, 422, { detail: { code: "invalid", message: "The content didn't pass the checks.", problems } });
    srv.cms.live = { version: 1, catalogue: body.catalogue, units: Object.fromEntries(body.units.map((u) => [u.id, u])), assets: body.assets, badges: body.badges || null, by: email, at: new Date().toISOString(), note: "Imported" };
    srv.cms.versions = [{ version: 1, status: "published", note: "Imported from the content files in the code", created_by: email, authors: [email], published_by: email, published_at: srv.cms.live.at, snapshot: clone(srv.cms.live) }];
    cmsLog(srv, email, "content_import", "v1", { units: body.units.length });
    return json(route, 201, cmsSummary(srv));
  }
  if (path === "/admin/content/export") {
    const no = need("publish");
    if (no) return no;
    const l = srv.cms.live;
    return json(route, 200, { schema: "content-export/1", version: l.version, catalogue: l.catalogue, units: Object.values(l.units), assets: l.assets });
  }
  m = path.match(/^\/admin\/content\/units\/([^/]+)$/);
  if (m) {
    if (!canSee) return need("edit");
    const id = m[1];
    const cur = cmsCurrent(srv);
    const unitOut = () => {
      const c = cmsCurrent(srv);
      const ups = (c.assets[id]?.assets || []).map(uploadedMediaId).filter(Boolean);
      return {
        unit: c.units[id],
        assets: c.assets[id] || { schema: "assets/1", assets: [] },
        published: srv.cms.live.units[id] || null,
        changes: srv.cms.draft?.units[id] ? diffUnit(srv.cms.live.units[id] || null, c.units[id]) : [],
        uploads: Object.fromEntries(ups.filter((u) => srv.contentAssets[u]).map((u) => [u, srv.contentAssets[u].approval])),
      };
    };
    if (!cur?.units[id]) return json(route, 404, { detail: "No content for that unit" });
    if (method === "GET") return json(route, 200, unitOut());
    const no = need("edit");
    if (no) return no;
    const unit = body.unit;
    if (unit.status !== cur.units[id].status && !cmsCan(srv, email, "publish"))
      return json(route, 403, { detail: { code: "role", message: "Only an admin can mark a unit ready or back to draft." } });
    const problems = validate("unit", unit).errors;
    for (const a of body.assets?.assets || []) {
      const up = uploadedMediaId(a);
      if (up && ["flagged", "refused"].includes(srv.contentAssets[up]?.approval)) problems.push(`assets picture "${a.id}" can't be used`);
    }
    if (problems.length) return json(route, 422, { detail: { code: "invalid", message: "Fix these before saving.", problems } });
    const d = draftFor(srv, email);
    d.units[id] = unit;
    d.by[id] = email;
    if (body.assets) d.assets[id] = body.assets;
    const cat = cur.catalogue;
    d.catalogue = { ...cat, subjects: cat.subjects.map((sub) => ({ ...sub, units: sub.units.map((e) => (e.id === id ? syncEntry(e, unit) : e)) })) };
    cmsLog(srv, email, "unit_save", id, { version: d.version });
    return json(route, 200, unitOut());
  }
  if (path === "/admin/content/draft" && method === "DELETE") {
    const no = need("edit");
    if (no) return no;
    srv.cms.draft = null;
    cmsLog(srv, email, "draft_discard", "draft");
    return json(route, 204);
  }
  const assetsBlocked = (cur) => {
    const blocked = [];
    const ok = (id) => srv.contentAssets[id]?.approval === "approved";
    for (const [uid, u] of Object.entries(cur.units)) {
      if (u.status !== "ready") continue;
      const used = new Set(u.items.map((i) => i.image).filter(Boolean));
      for (const a of cur.assets[uid]?.assets || []) {
        const up = uploadedMediaId(a);
        if (up && used.has(a.id) && !ok(up)) blocked.push(`${uid}: uploaded picture "${a.id}" isn't approved yet`);
      }
    }
    for (const sub of cur.catalogue.subjects)
      if (sub.art && !sub.archived && sub.units.some((e) => cur.units[e.id]?.status === "ready") && !ok(sub.art)) blocked.push(`${sub.id}: the island art for “${sub.name}” isn't approved yet`);
    for (const b of cur.badges || []) if (b.art && !b.retired && !ok(b.art)) blocked.push(`badge ${b.id}: the art for “${b.name}” isn't approved yet`);
    return blocked;
  };
  const goLive = (cur, version, note, extra = {}) => {
    srv.cms.live = { ...clone(cur), version, by: email, at: new Date().toISOString(), note };
    srv.cms.versions.unshift({ version, status: "published", note, published_by: email, published_at: srv.cms.live.at, snapshot: clone(srv.cms.live), ...extra });
    // Like app/cms.py publish_packs: the preview packs devices in these tests download.
    const live = srv.cms.live;
    const content = {
      catalogue: live.catalogue,
      badges: live.badges,
      subjects: live.catalogue.subjects.map((subject) => ({
        subject,
        units: subject.units.filter((e) => live.units[e.id]).map((entry) => ({ entry, unit: live.units[entry.id], assets: live.assets[entry.id] || { schema: "assets/1", assets: [] } })),
      })),
    };
    const { manifest, files } = buildPacks(content, { channel: "preview", release: `2026.11.cms${version}` });
    for (const f of files) if (!f.name.startsWith("manifest-")) srv.packs[f.name] = JSON.parse(f.body);
    srv.manifest.preview = manifest;
  };
  if (path === "/admin/content/submit" && method === "POST") {
    const no = need("edit");
    if (no) return no;
    const d = srv.cms.draft;
    if (!d || d.status !== "draft") return json(route, 409, { detail: { code: "state", message: "It's already waiting for review." } });
    Object.assign(d, { status: "submitted", note: body.note, submitted_by: email, review_note: null });
    cmsLog(srv, email, "draft_submit", `v${d.version}`, { note: body.note });
    return json(route, 200, cmsSummary(srv));
  }
  if (path === "/admin/content/review" && method === "POST") {
    const no = need("review");
    if (no) return no;
    const d = srv.cms.draft;
    if (!d) return json(route, 409, { detail: { code: "no_draft", message: "There's no draft." } });
    if (d.authors.includes(email) || d.submitted_by === email) return json(route, 403, { detail: { code: "own", message: "Someone who didn't work on it must review it." } });
    if (body.approve) {
      if (d.status !== "submitted") return json(route, 409, { detail: { code: "state", message: "It isn't waiting for review." } });
      Object.assign(d, { status: "approved", approved_by: email });
      cmsLog(srv, email, "draft_approve", `v${d.version}`);
    } else {
      if (!body.comment) return json(route, 422, { detail: { code: "comment", message: "Say what needs changing." } });
      Object.assign(d, { status: "draft", review_note: body.comment, approved_by: null });
      cmsLog(srv, email, "draft_return", `v${d.version}`, { comment: body.comment });
    }
    return json(route, 200, cmsSummary(srv));
  }
  if (path === "/admin/content/review" && method === "GET") {
    const d = srv.cms.draft;
    if (!d) return json(route, 409, { detail: { code: "no_draft", message: "There's no draft." } });
    const live = srv.cms.live;
    const docs = [
      ...(d.badges ? [{ kind: "badges", key: "built-in", before: live.badges, after: d.badges, by: d.created_by }] : []),
      ...(d.catalogue ? [{ kind: "catalogue", key: "catalogue", before: live.catalogue, after: d.catalogue, by: d.created_by }] : []),
      ...Object.entries(d.units).map(([id, u]) => ({ kind: "unit", key: id, before: live.units[id] || null, after: u, by: d.by[id] })),
    ];
    return json(route, 200, { draft: cmsSummary(srv).draft, docs });
  }
  if (path === "/admin/content/publish" && method === "POST") {
    const no = need("publish");
    if (no) return no;
    const d = srv.cms.draft;
    if (!d) return json(route, 409, { detail: { code: "no_draft", message: "There's nothing to publish." } });
    if (d.status !== "approved") return json(route, 409, { detail: { code: "not_approved", message: "A reviewer must approve it first." } });
    const cur = cmsCurrent(srv);
    const blocked = assetsBlocked(cur);
    if (blocked.length) return json(route, 409, { detail: { code: "assets", message: "Some pictures aren't approved yet.", problems: blocked } });
    goLive(cur, d.version, body.note || d.note, { created_by: d.created_by, authors: d.authors, submitted_by: d.submitted_by, approved_by: d.approved_by });
    srv.cms.draft = null;
    cmsLog(srv, email, "content_publish", `v${d.version}`, { note: body.note || d.note, approved_by: d.approved_by });
    return json(route, 200, cmsSummary(srv));
  }
  if (path === "/admin/content/versions") {
    const live = srv.cms.live?.version;
    return json(route, 200, {
      versions: srv.cms.versions.map(({ snapshot: _s, ...v }) => ({ authors: [], submitted_by: null, approved_by: null, rolled_back_from: null, created_by: v.published_by, ...v, live: v.version === live })),
    });
  }
  if (path === "/admin/content/rollback" && method === "POST") {
    const no = need("publish");
    if (no) return no;
    const target = srv.cms.versions.find((v) => v.version === body.version);
    if (!target || target.version >= srv.cms.live.version) return json(route, 404, { detail: "Pick an earlier published version" });
    if (srv.cms.draft) return json(route, 409, { detail: { code: "draft_open", message: "Publish or discard the draft first." } });
    const version = Math.max(...srv.cms.versions.map((v) => v.version)) + 1;
    goLive(target.snapshot, version, body.note, { rolled_back_from: target.version, created_by: email });
    cmsLog(srv, email, "content_rollback", `v${version}`, { to: target.version });
    return json(route, 200, cmsSummary(srv));
  }
  // S13: map & trails (CMS-05)
  const catDraft = () => {
    const d = draftFor(srv, email);
    d.catalogue = clone(cmsCurrent(srv).catalogue);
    return d;
  };
  const makeUnit = (d, subject, u) => {
    const taken = [...Object.keys(cmsCurrent(srv).units), ...d.catalogue.subjects.flatMap((x) => x.units.map((e) => e.id))];
    const id = newId(u.title, taken);
    const unit = newUnit({ id, subject, title: u.title, band: u.band }, u.copy_from ? cmsCurrent(srv).units[u.copy_from] : undefined);
    d.units[id] = unit;
    d.by[id] = email;
    if (u.copy_from && cmsCurrent(srv).assets[u.copy_from]) d.assets[id] = clone(cmsCurrent(srv).assets[u.copy_from]);
    d.catalogue.subjects.find((x) => x.id === subject).units.push({ id, title: unit.title, band: unit.band, status: "draft", lessons: unit.lessons.length });
    return id;
  };
  if (path === "/admin/content/trails" && method === "POST") {
    const no = need("edit");
    if (no) return no;
    const d = catDraft();
    const sid = newId(body.place, d.catalogue.subjects.map((x) => x.id));
    d.catalogue.subjects.push({ id: sid, name: body.name, place: body.place, island: sid, art: body.art, units: [] });
    makeUnit(d, sid, body.unit);
    cmsLog(srv, email, "trail_add", sid, { name: body.name });
    return json(route, 201, cmsSummary(srv));
  }
  m = path.match(/^\/admin\/content\/trails\/([^/]+)\/units$/);
  if (m && method === "POST") {
    const no = need("edit");
    if (no) return no;
    const d = catDraft();
    const id = makeUnit(d, m[1], body);
    cmsLog(srv, email, "unit_add", id, { trail: m[1] });
    return json(route, 201, { ...cmsSummary(srv), unit: id });
  }
  m = path.match(/^\/admin\/content\/trails\/([^/]+)$/);
  if (m && method === "PATCH") {
    const no = need("edit");
    if (no) return no;
    const d = catDraft();
    const sub = d.catalogue.subjects.find((x) => x.id === m[1]);
    for (const k of ["name", "place", "art"]) if (body[k]) sub[k] = body[k];
    if (body.archived === true) sub.archived = true;
    if (body.archived === false) delete sub.archived;
    cmsLog(srv, email, "trail_change", m[1], body);
    return json(route, 200, cmsSummary(srv));
  }
  if (path === "/admin/content/order" && method === "PUT") {
    const no = need("edit");
    if (no) return no;
    const d = catDraft();
    const by = Object.fromEntries(d.catalogue.subjects.map((x) => [x.id, x]));
    if ([...body.subjects].sort().join() !== Object.keys(by).sort().join()) return json(route, 422, { detail: { code: "order", message: "Every trail must be in the order once." } });
    for (const [sid, ids] of Object.entries(body.units || {})) by[sid].units = ids.map((id) => by[sid].units.find((e) => e.id === id));
    d.catalogue.subjects = body.subjects.map((id) => by[id]);
    cmsLog(srv, email, "map_order", "map");
    return json(route, 200, cmsSummary(srv));
  }
  // S13: badges (CMS-08)
  if (path === "/admin/content/badges" && method === "GET") {
    const cur = cmsCurrent(srv);
    const items = cur.badges || [];
    const live = Object.fromEntries((srv.cms.live.badges || []).map((b) => [b.id, JSON.stringify(b)]));
    return json(route, 200, {
      badges: items,
      approvals: Object.fromEntries(items.filter((b) => b.art).map((b) => [b.art, srv.contentAssets[b.art]?.approval])),
      edited: items.filter((b) => live[b.id] !== JSON.stringify(b)).map((b) => b.id),
      units: Object.fromEntries(Object.entries(cur.units).map(([id, u]) => [id, u.title])),
    });
  }
  m = path.match(/^\/admin\/content\/badges\/([^/]+)$/);
  if (m && method === "PUT") {
    const no = need("edit");
    if (no) return no;
    const problems = validate("badge", body.badge).errors;
    if (problems.length) return json(route, 422, { detail: { code: "invalid", message: "Fix these before saving.", problems } });
    const d = draftFor(srv, email);
    const list = clone(cmsCurrent(srv).badges || []);
    const i = list.findIndex((b) => b.id === m[1]);
    if (i < 0) list.push(body.badge);
    else list[i] = body.badge;
    d.badges = list;
    cmsLog(srv, email, "badge_save", m[1], { retired: !!body.badge.retired });
    return staffRoutes(srv, route, { path: "/admin/content/badges", method: "GET", body: null, user });
  }
  const assetOut = (id) => ({ id, ...srv.contentAssets[id] });
  if (path === "/admin/content/assets" && method === "GET") return canSee ? json(route, 200, { assets: Object.keys(srv.contentAssets).filter((id) => srv.contentAssets[id].status === "ready").map(assetOut) }) : need("approve-asset");
  if (path === "/admin/content/assets" && method === "POST") {
    const no = need("edit");
    if (no) return no;
    srv.contentAssets[body.id] = { status: "pending", approval: "waiting", label: body.label || null, uploaded_by: email };
    srv.media[body.id] = { family: null, kind: "content", type: body.content_type, bytes: null, status: "pending" };
    return json(route, 201, { ...assetOut(body.id), upload: { url: `/api/media/blob/${body.id}`, method: "PUT", headers: { "Content-Type": body.content_type } } });
  }
  m = path.match(/^\/admin\/content\/assets\/([^/]+)\/(complete|decision|file)$/);
  if (m) {
    const a = srv.contentAssets[m[1]];
    if (!a) return json(route, 404, { detail: "Not found" });
    if (m[2] === "file") {
      const md = srv.media[m[1]];
      return md?.bytes ? route.fulfill({ status: 200, contentType: md.type, body: md.bytes }) : json(route, 404, { detail: "Not found" });
    }
    if (m[2] === "complete") {
      if (!srv.media[m[1]]?.bytes) return json(route, 409, { detail: { code: "not_uploaded", message: "The file hasn't arrived yet." } });
      a.status = "ready";
      srv.media[m[1]].status = "ready";
      if (body.scan?.flagged) a.approval = "flagged";
      cmsLog(srv, email, "asset_upload", m[1]);
      return json(route, 200, assetOut(m[1]));
    }
    const no = need("approve-asset");
    if (no) return no;
    if (a.uploaded_by === email && role !== "admin") return json(route, 403, { detail: { code: "own", message: "Someone else must approve your upload." } });
    a.approval = body.approve ? "approved" : "refused";
    cmsLog(srv, email, `asset_${a.approval}`, m[1]);
    return json(route, 200, assetOut(m[1]));
  }
  return null;
}

const json = (route, status, body) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: body === undefined ? "" : JSON.stringify(body),
  });

const familyOut = (srv, fam, role = "owner") => ({
  ...fam,
  role,
  learner_limit: LIMITS[fam.plan] ?? 1,
  device_limit: deviceLimit(fam.plan),
  region: countryRules(fam.country).region,
  consent: srv.consents[fam.id] || null,
  cohorts: fam.cohorts || [],
  sounds: fam.sounds || {},
  flags: { "beta-feedback": false, "beta-faq": false, ...(srv.flags[fam.id] || {}) },
  deletion: srv.deletions[fam.id]?.purge_after ? { purge_after: srv.deletions[fam.id].purge_after } : null,
  learners: Object.values(srv.learners)
    .filter((l) => l.family_id === fam.id)
    .map(({ family_id: _f, ...l }) => l),
});

const studentOut = (x) => ({
  id: x.id,
  first_name: x.first_name,
  initial: x.initial,
  avatar_color: x.avatar_color,
  pictures: x.pictures,
  linked: Boolean(x.learner_id),
  scope: x.scope,
  help: Boolean(x.help),
});
const classOut = (srv, id, roster = false) => {
  const c = srv.classes[id];
  const rows = Object.values(srv.students).filter((x) => x.class_id === id);
  return {
    id,
    name: c.name,
    year_group: c.year_group || "",
    band: c.band,
    join_code: c.join_code,
    students: rows.length,
    ...(roster
      ? {
          roster: rows.map(studentOut),
          groups: groupsOf(srv, id),
          devices: Object.values(srv.classDevices)
            .filter((d) => d.class_id === id && !d.removed)
            .map(({ id: did, label }) => ({
              id: did,
              label,
              created_at: "2026-11-04T08:00:00Z",
              last_seen_at: "2026-11-04T08:00:00Z",
            })),
        }
      : {}),
  };
};
// S10, mirroring services/api/app/routes/classwork.py
const groupsOf = (srv, classId) =>
  Object.values(srv.groups)
    .filter((g) => g.class_id === classId)
    .map(({ id, name, student_ids }) => ({ id, name, student_ids: [...student_ids].sort() }));
const rosterIds = (srv, classId) =>
  Object.values(srv.students)
    .filter((x) => x.class_id === classId)
    .sort((a, b) => a.first_name.localeCompare(b.first_name))
    .map((x) => x.id);
const targetsOf = (srv, a) => {
  const roster = rosterIds(srv, a.class_id);
  const t = a.target;
  const ids = new Set(
    t.type === "group"
      ? srv.groups[t.group_id]?.student_ids || []
      : t.type === "students"
        ? t.student_ids
        : roster,
  );
  return roster.filter((id) => ids.has(id));
};
const assignmentOut = ({ class_id: _c, removed: _r, ...a }) => a;
const openWork = (srv, classId) =>
  Object.values(srv.assignments).filter((a) => a.class_id === classId && !a.removed);
const unitOf = (a) => (a.kind === "custom" ? `custom-${a.lesson.id}` : a.unit_id);
const workEvents = (srv, pairs, { home = true, key = (st) => st.id } = {}) => {
  const out = [];
  for (const [a, st] of pairs) {
    const from = a.created_at.slice(0, 10);
    const fits = (e) =>
      ["lesson_completed", "item_answered"].includes(e.type) &&
      e.data.unitId === unitOf(a) &&
      e.at.slice(0, 10) >= from;
    for (const e of srv.classEvents)
      if (e.learnerId === st.id && fits(e)) out.push({ ...e, learnerId: key(st) });
    if (home && st.learner_id)
      for (const e of srv.events)
        if (e.learnerId === st.learner_id && fits(e)) out.push({ ...e, learnerId: key(st) });
  }
  const seen = new Set();
  return out
    .filter((e) => !seen.has(e.id) && seen.add(e.id))
    .map(({ id, type, learnerId, at, data }) => ({ id, type, learnerId, at, data }))
    .sort((x, y) => (x.at < y.at ? -1 : 1));
};
const teacherOut = (srv, uid) => {
  const t = srv.teachers[uid];
  return {
    school: t.school_id ? srv.schools[t.school_id] : null,
    classes: Object.values(srv.classes)
      .filter((c) => c.teacher === uid)
      .map((c) => classOut(srv, c.id)),
    tips: t.tips,
  };
};
const linkOut = (srv, x) => {
  const c = srv.classes[x.class_id];
  return {
    student_id: x.id,
    learner_id: x.learner_id,
    roster_name: x.initial ? `${x.first_name} ${x.initial}.` : x.first_name,
    class: c.name,
    year_group: c.year_group || "",
    teacher: srv.users[c.teacher]?.name || "Your child's teacher",
    school: srv.schools[c.school_id]?.name || null,
    scope: x.scope,
    linked_at: "2026-11-01T10:00:00Z",
    // Teacher-made badges earned in class (mirrors services/api links.class_badges).
    badges: srv.classEvents
      .filter((e) => e.learnerId === x.id && e.type === "badge_awarded" && e.data?.custom)
      .filter((e, i, all) => all.findIndex((y) => y.data.badgeId === e.data.badgeId) === i)
      .map((e) => ({
        id: e.data.badgeId,
        name: e.data.custom.name,
        shape: e.data.custom.shape,
        colour: e.data.custom.colour,
        icon: e.data.custom.icon,
        at: e.at,
      })),
  };
};

/** Badge Studio rule types (mirrors services/api routes/rewards.py). */
const FAMILY_RULES = ["manual", "lesson", "count", "streak", "mastery", "combo"];
const CLASS_RULES = ["manual", "count", "streak", "assignment", "combo"];
const ruleTypes = (r) => [r.type, ...(r.all || []).map((x) => x.type)];
const badgeOut = ({ family_id: _f, class_id: _c, ...b }) => ({
  photo: null,
  note: null,
  voice: null,
  reward: null,
  ...b,
});
/** The checks the API makes on a badge (BST-02, BST-03, BST-06). */
function badgeProblem(body, rules, audienceOk) {
  if (!String(body.name || "").trim()) return "name";
  if (!Number.isInteger(body.treasures) || body.treasures < 0 || body.treasures > 50) return "treasures";
  if (!body.rule || !ruleTypes(body.rule).every((t) => rules.includes(t))) return "rule";
  if (body.rule.type === "combo" && !(body.rule.all?.length >= 2 && body.rule.all.length <= 3)) return "rule";
  if (!audienceOk) return "audience";
  return null;
}
const snapshotOf = (b) => ({
  name: b.name,
  shape: b.shape,
  colour: b.colour,
  icon: b.icon,
  ...(b.photo ? { photo: b.photo } : {}),
  ...(b.note ? { note: b.note } : {}),
  ...(b.voice ? { voice: b.voice } : {}),
  ...(b.reward ? { reward: b.reward } : {}),
});

const defaultSettings = () => ({
  goal: 2,
  limit: 20,
  bedtime: { on: false, start: "19:30", end: "06:30" },
  voice: true,
  voice_rate: 1,
  sound: true,
  treasure_cap: true,
  breaks: 0,
  captions: true,
  calm: "device",
  emails: { digest: true, badges: false, wishes: false },
});


// ---- Share codes and moderation (S11b): mirrors services/api shares.py and moderation.py ----
const SHARE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const shareState = (sh) => (sh.status === "live" && Date.parse(sh.expires_at) <= Date.now() ? "expired" : sh.status);
const shareOut = (sh) => ({
  id: sh.id,
  code: formatShareCode(sh.code),
  kind: sh.kind,
  title: sh.title,
  status: shareState(sh),
  created_at: sh.created_at,
  expires_at: sh.expires_at,
  imports: sh.imports,
  lessons: sh.package.lessons.length,
  badges: sh.package.badges.length,
  cards: sh.package.lessons.reduce((n, l) => n + l.cards.length, 0),
});
const REASON_TEXT = {
  "child-photo": "a photo of a child",
  "personal-details": "names or personal details",
  unkind: "unkind or upsetting content",
  "not-for-children": "not suitable for children",
  other: "something else",
  nudity: "the image check flagged it",
  review: "new share with photos or voice clips",
};
function openItem(srv, kind, reason, ids) {
  const found = Object.values(srv.modItems).find(
    (i) => i.kind === kind && i.status === "open" && Object.entries(ids).every(([k, v]) => i[k] === v),
  );
  if (found) return found;
  const id = `MOD${++srv.seq}`;
  srv.modItems[id] = { id, kind, reason, status: "open", outcome: null, created_at: new Date().toISOString(), ...ids };
  return srv.modItems[id];
}
const copiesOf = (srv, mid) => Object.entries(srv.media).filter(([id, x]) => id === mid || x.origin === mid);
function modItemOut(srv, i) {
  const share = i.share_id ? srv.shares[i.share_id] : null;
  const reports = srv.reports.filter((r) => r.share_id === i.share_id);
  const reasons = {};
  for (const r of reports) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
  const photos = i.media_id ? [i.media_id] : share ? packageMedia(share.package).photos : [];
  return {
    id: i.id,
    kind: i.kind,
    reason: i.reason,
    reason_text: REASON_TEXT[i.reason] || i.reason,
    status: i.status,
    outcome: i.outcome,
    created_at: i.created_at,
    uploaded_at: share?.created_at || i.created_at,
    overdue: i.status === "open" && Date.now() - Date.parse(i.created_at) > 24 * 3600_000,
    reports: reports.length,
    report_reasons: share ? reasons : {},
    photos: photos.map((id) => ({ id, status: srv.media[id]?.status || "missing" })),
    scan: i.media_id ? srv.media[i.media_id]?.scan || null : null,
    share: share ? { ...shareOut(share), package: share.package, checklist: share.checklist } : null,
  };
}

/**
 * Route /api/* for a browser context. Each context is one device with its own session.
 * @param {import("@playwright/test").BrowserContext} context
 * @param {ReturnType<typeof newServer>} srv
 */
export async function fakeApi(context, srv) {
  let sessionId = null;
  let m0;
  let m;
  const signIn = (uid, ua) => {
    sessionId = `S${Object.keys(srv.sessions).length + 1}-${Math.random().toString(36).slice(2)}`;
    srv.sessions[sessionId] = uid;
    srv.devices[sessionId] = { name: deviceName(ua), last_seen_at: new Date().toISOString() };
  };
  const userFor = (email) => {
    let u = Object.values(srv.users).find((x) => x.email === email);
    const isNew = !u;
    if (!u) {
      u = { id: `U${Object.keys(srv.users).length + 1}`, email, name: "" };
      srv.users[u.id] = u;
    }
    return [u, isNew];
  };

  await context.route("**/api/**", async (route) => {
    if (srv.offline) return route.abort("internetdisconnected");
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = req.method();
    const isJson = (req.headers()["content-type"] || "").includes("json");
    const body = isJson && req.postData() ? JSON.parse(req.postData()) : {};
    const userId = sessionId && srv.sessions[sessionId];
    const user = userId && srv.users[userId];
    const membership = user && srv.members.find((x) => x.user === userId);
    const fam = membership && srv.families[membership.family];
    const role = membership?.role;
    const forbidViewer = () => json(route, 403, { detail: "This role can only view progress" });

    // Signed media links (the real API signs them; any link here works).
    m0 = path.match(/^\/media\/blob\/([^/]+)$/);
    if (m0 && method === "PUT") {
      const md = srv.media[m0[1]];
      if (!md) return json(route, 403, { detail: "Link expired" });
      md.bytes = req.postDataBuffer();
      return json(route, 204);
    }
    if (m0 && method === "GET") {
      const md = srv.media[m0[1]];
      if (!md?.bytes || md.status !== "ready") return json(route, 404, { detail: "Not found" });
      return route.fulfill({ status: 200, contentType: md.type, body: md.bytes });
    }
    if (path === "/auth/config") return json(route, 200, { google: false, policy_version: POLICY });
    // Published content needs no sign-in (CNT-02).
    if (path === "/content/manifest") {
      const man = srv.manifest[url.searchParams.get("channel") || "production"];
      const channel = url.searchParams.get("channel") || "production";
      return json(route, 200, man || { schema: "packs/1", release: null, channel, packs: [] });
    }
    m0 = path.match(/^\/content\/packs\/([^/]+)$/);
    if (m0)
      return srv.packs[m0[1]]
        ? json(route, 200, srv.packs[m0[1]])
        : json(route, 404, { detail: "Pack not found" });
    if (path === "/policy")
      return json(route, 200, {
        version: POLICY,
        collect: [
          "Your name and email, to sign you in.",
          "Each learner's first name and birth month and year.",
        ],
        why: ["Progress chooses what each child practises next."],
        kept: ["If nobody signs in for 24 months, we email you twice, then delete the family."],
        rights: ["Delete a learner or the whole family at any time."],
        never: ["No ads and no tracking or analytics companies."],
        scopes: {
          progress: { label: "Save progress so it follows each child to every device", required: true },
          voice: { label: "Let grown-ups record their own voice for lessons", required: false },
          photos: { label: "Let grown-ups add their own photos to lessons", required: false },
        },
      });
    if (path === "/auth/magic-link" && method === "POST") {
      const token = `token-${Object.keys(srv.tokens).length + 1}-abcdefghijklmnopqrstuvwxyz`;
      srv.tokens[token] = body.email.toLowerCase();
      srv.sent.push({ to: body.email, token, role: body.role || null });
      return json(route, 202, { sent: true });
    }
    if (path === "/auth/verify" && method === "POST") {
      const email = srv.tokens[body.token];
      if (!email)
        return json(route, 400, { detail: "This link has expired or was already used. Ask for a new one." });
      delete srv.tokens[body.token];
      const [u, isNew] = userFor(email);
      signIn(u.id, req.headers()["user-agent"]);
      return json(route, 200, { user: u, new: isNew });
    }
    if (path === "/invites/accept" && method === "POST") {
      const inv = srv.invites[body.token];
      if (!inv || inv.accepted || inv.expired || inv.dead)
        return json(route, 400, { detail: "This invitation has expired or was already used." });
      inv.accepted = true;
      const [u] = userFor(inv.email);
      srv.members.push({ family: inv.family, user: u.id, role: inv.role });
      signIn(u.id, req.headers()["user-agent"]);
      return json(route, 200, { family_id: inv.family, role: inv.role });
    }
    if (path === "/auth/logout") {
      delete srv.sessions[sessionId];
      sessionId = null;
      return json(route, 200, { ok: true });
    }
    // No sign-in needed: the emailed deletion link (SAF-04) and error reports (SAF-07).
    if (path === "/families/deletion/confirm" && method === "POST") {
      const entry = Object.entries(srv.deletions).find(([, d]) => d.token === body.token);
      if (!entry)
        return json(route, 404, { detail: "This link has expired. You can ask again in Settings." });
      entry[1].purge_after = new Date(Date.now() + 7 * 86_400_000).toISOString();
      return json(route, 200, { purge_after: entry[1].purge_after });
    }
    if (path === "/errors" && method === "POST") {
      srv.errors.push(body);
      return json(route, 204);
    }
    if (!user) return json(route, 401, { detail: "Not signed in" });

    if (path === "/auth/logout-all") {
      for (const [k, v] of Object.entries(srv.sessions)) if (v === userId) delete srv.sessions[k];
      sessionId = null;
      return json(route, 200, { ok: true });
    }
    if (path === "/me" && method === "GET")
      return json(route, 200, {
        user,
        families: fam ? [familyOut(srv, fam, role)] : [],
        teacher: srv.teachers[userId] ? teacherOut(srv, userId) : null,
      });
    // --- Teachers and classes (S9), mirroring services/api/app/routes/teach.py and links.py ---
    if (path === "/teacher" && method === "POST") {
      const domain = user.email.split("@")[1];
      const existing = Object.values(srv.schools).find((x) => x.domain === domain);
      const t = srv.teachers[userId] || { school_id: null, tips: {} };
      srv.teachers[userId] = t;
      if (body.join_school) t.school_id = body.join_school;
      else if (existing && !t.school_id && !body.separate)
        return json(route, 201, { ...teacherOut(srv, userId), offer: existing });
      else if (!t.school_id) {
        const sid = `SC${Object.keys(srv.schools).length + 1}`;
        srv.schools[sid] = {
          id: sid,
          name: body.school_name,
          domain: existing || domain === "gmail.com" ? null : domain,
          consent: null,
        };
        t.school_id = sid;
      }
      return json(route, 201, teacherOut(srv, userId));
    }
    if (path === "/teacher/tips" && method === "PATCH") {
      Object.assign(srv.teachers[userId].tips, body);
      return json(route, 200, { tips: srv.teachers[userId].tips });
    }
    m = path.match(/^\/schools\/([^/]+)\/consent$/);
    if (m && method === "POST") {
      srv.schools[m[1]].consent = { at: new Date().toISOString(), name: body.name, role: body.role };
      return json(route, 200, srv.schools[m[1]]);
    }
    if (path === "/classes" && method === "POST") {
      const id = `01JC${String(Object.keys(srv.classes).length + 1).padStart(22, "0")}`;
      srv.classes[id] = {
        id,
        teacher: userId,
        school_id: srv.teachers[userId].school_id,
        ...body,
        join_code: `ABC${234 + Object.keys(srv.classes).length}`.slice(0, 6),
      };
      return json(route, 201, classOut(srv, id, true));
    }
    m = path.match(/^\/classes\/([^/]+)$/);
    if (m && method === "GET")
      return srv.classes[m[1]]
        ? json(route, 200, classOut(srv, m[1], true))
        : json(route, 404, { detail: "Class not found" });
    m = path.match(/^\/classes\/([^/]+)\/code$/);
    if (m && method === "POST") {
      srv.classes[m[1]].join_code = "NEWC0D".replace("0", "2");
      return json(route, 200, classOut(srv, m[1], true));
    }
    m = path.match(/^\/classes\/([^/]+)\/students$/);
    if (m && method === "POST") {
      const roster = Object.values(srv.students).filter((x) => x.class_id === m[1]);
      const nm = (x) => `${x.first_name} ${x.initial || ""}`.trim().toLowerCase();
      const all = [...roster, ...body.students].map(nm);
      const clashes = [
        ...new Set(body.students.map(nm).filter((n) => all.filter((x) => x === n).length > 1)),
      ];
      if (clashes.length)
        return json(route, 422, {
          detail: {
            code: "same_name",
            names: clashes,
            message: "Add an initial to tell these children apart.",
          },
        });
      const pics = ["cat", "sun", "moon"];
      const added = body.students.map((x, i) => {
        const id = `01JS${String(Object.keys(srv.students).length + 1).padStart(22, "0")}`;
        srv.students[id] = {
          id,
          class_id: m[1],
          first_name: x.first_name,
          initial: x.initial || null,
          avatar_color: ["coral", "sky", "leaf"][i % 3],
          pictures: pics,
          learner_id: null,
          scope: "class",
        };
        return studentOut(srv.students[id]);
      });
      return json(route, 201, { added, ...classOut(srv, m[1], true) });
    }
    m = path.match(/^\/classes\/([^/]+)\/students\/([^/]+)\/progress$/);
    if (m) {
      const st = srv.students[m[2]];
      srv.teachers[userId].tips.viewed = true;
      const sum = (rows) => {
        const lessons = rows.filter((e) => e.type === "lesson_completed" && e.data.subjectId !== "family");
        const subjects = {};
        for (const e of lessons) {
          const x = (subjects[e.data.subjectId] ||= { lessons: 0, stars: 0 });
          x.lessons += 1;
          x.stars += e.data.stars || 0;
        }
        return {
          lessons: lessons.length,
          stars: lessons.reduce((n, e) => n + (e.data.stars || 0), 0),
          badges: 0,
          subjects,
        };
      };
      const home = st.learner_id ? sum(srv.events.filter((e) => e.learnerId === st.learner_id)) : null;
      if (home && st.scope !== "all") delete home.subjects;
      return json(route, 200, {
        student: studentOut(st),
        class: sum(srv.classEvents.filter((e) => e.learnerId === st.id)),
        home,
      });
    }
    m = path.match(/^\/classes\/([^/]+)\/events$/);
    if (m && method === "POST") {
      const accepted = [];
      const rejected = [];
      const school = srv.schools[srv.classes[m[1]].school_id];
      for (const e of body.events) {
        const st = srv.students[e.learnerId];
        if (!st?.learner_id && !school?.consent) {
          rejected.push({ id: e.id, reason: "school_consent" });
          continue;
        }
        if (!srv.classEvents.some((x) => x.id === e.id))
          srv.classEvents.push({ ...e, seq: ++srv.seq, class_id: m[1] });
        accepted.push(e.id);
      }
      return json(route, 200, { accepted, rejected });
    }
    if (m && method === "GET") {
      const after = Number(url.searchParams.get("after") || 0);
      const events = srv.classEvents
        .filter((e) => e.class_id === m[1] && e.seq > after)
        .map(({ class_id: _c, ...e }) => e);
      return json(route, 200, { events, cursor: events.length ? events.at(-1).seq : after, more: false });
    }
    // --- Sprint 10: groups, assignments, progress, classroom devices (classwork.py) ---
    m = path.match(/^\/classes\/([^/]+)\/groups$/);
    if (m && method === "POST") {
      const id = `01JG${String(Object.keys(srv.groups).length + 1).padStart(22, "0")}`;
      srv.groups[id] = { id, class_id: m[1], name: body.name.trim(), student_ids: body.student_ids || [] };
      return json(route, 201, { groups: groupsOf(srv, m[1]) });
    }
    m = path.match(/^\/classes\/([^/]+)\/groups\/([^/]+)$/);
    if (m && method === "PATCH") {
      Object.assign(
        srv.groups[m[2]],
        body.name ? { name: body.name } : {},
        body.student_ids ? { student_ids: body.student_ids } : {},
      );
      return json(route, 200, { groups: groupsOf(srv, m[1]) });
    }
    if (m && method === "DELETE") {
      const busy = openWork(srv, m[1]).filter((a) => a.target.type === "group" && a.target.group_id === m[2]);
      if (busy.length)
        return json(route, 409, {
          detail: {
            code: "group_has_work",
            titles: busy.map((a) => a.title),
            message: "Remove the work assigned to this group first.",
          },
        });
      delete srv.groups[m[2]];
      return json(route, 204);
    }
    m = path.match(/^\/classes\/([^/]+)\/assignments$/);
    if (m && method === "GET")
      return json(route, 200, {
        assignments: openWork(srv, m[1]).map((a) => ({ ...assignmentOut(a), to: targetsOf(srv, a) })),
        groups: groupsOf(srv, m[1]),
      });
    if (m && method === "POST") {
      const id = `01JA${String(Object.keys(srv.assignments).length + 1).padStart(22, "0")}`;
      const lesson = body.kind === "custom" ? srv.lessons[body.lesson_id] : null;
      const a = {
        id,
        class_id: m[1],
        kind: body.kind,
        unit_id: body.kind === "unit" ? body.unit_id : null,
        lesson: lesson ? (({ family_id: _f, ...l }) => l)(lesson) : null,
        title: lesson ? lesson.title : body.title,
        target: Object.fromEntries(Object.entries(body.target).filter(([, v]) => v != null)),
        due_on: body.due_on || null,
        created_at: new Date(Date.now() - 60_000).toISOString(),
      };
      srv.assignments[id] = a;
      srv.teachers[userId].tips.assigned = true;
      return json(route, 201, { ...assignmentOut(a), to: targetsOf(srv, a) });
    }
    m = path.match(/^\/classes\/([^/]+)\/assignments\/progress$/);
    if (m && method === "GET") {
      const open = openWork(srv, m[1]);
      const pairs = open.flatMap((a) => targetsOf(srv, a).map((sid) => [a, srv.students[sid]]));
      srv.teachers[userId].tips.viewed = true;
      return json(route, 200, {
        assignments: open.map((a) => ({ ...assignmentOut(a), to: targetsOf(srv, a) })),
        groups: groupsOf(srv, m[1]),
        events: workEvents(srv, pairs),
      });
    }
    // T05 class badges (S11): made and awarded by the teacher.
    m = path.match(/^\/classes\/([^/]+)\/badges$/);
    if (m && method === "GET") {
      const cls = srv.classes[m[1]];
      if (!cls || cls.teacher !== userId) return json(route, 404, { detail: "Not found" });
      return json(route, 200, { badges: Object.values(srv.badges).filter((b) => b.class_id === m[1]).map(badgeOut) });
    }
    m = path.match(/^\/classes\/([^/]+)\/badges\/([^/]+)$/);
    if (m && (method === "PUT" || method === "DELETE")) {
      const cls = srv.classes[m[1]];
      if (!cls || cls.teacher !== userId) return json(route, 404, { detail: "Not found" });
      if (method === "DELETE") {
        delete srv.badges[m[2]];
        return json(route, 204);
      }
      const roster = Object.values(srv.students).filter((x) => x.class_id === m[1]).map((x) => x.id);
      const audienceOk = body.audience === "class" || (Array.isArray(body.audience) && body.audience.length > 0 && body.audience.every((a) => roster.includes(a)));
      const problem = body.photo || body.voice ? "design" : badgeProblem(body, CLASS_RULES, audienceOk);
      if (problem) return json(route, 422, { detail: problem });
      srv.badges[m[2]] = { id: m[2], class_id: m[1], ...body };
      return json(route, 200, badgeOut(srv.badges[m[2]]));
    }
    m = path.match(/^\/classes\/([^/]+)\/badges\/([^/]+)\/award$/);
    if (m && method === "POST") {
      const cls = srv.classes[m[1]];
      const b = srv.badges[m[2]];
      if (!cls || cls.teacher !== userId || !b || b.class_id !== m[1]) return json(route, 404, { detail: "Not found" });
      const consented = Boolean(srv.schools[cls.school_id]?.consent);
      const awarded = [];
      const skipped = [];
      const at = new Date().toISOString();
      for (const sid of [...new Set(body.student_ids || [])]) {
        const st = srv.students[sid];
        const has = srv.classEvents.some((e) => e.learnerId === sid && e.type === "badge_awarded" && e.data.badgeId === b.id);
        if (!st || st.class_id !== m[1]) skipped.push({ id: sid, reason: "not in this class" });
        else if (b.audience !== "class" && !b.audience.includes(sid)) skipped.push({ id: sid, reason: "not for this child" });
        else if (has) skipped.push({ id: sid, reason: "already earned" });
        else if (!consented && !st.learner_id) skipped.push({ id: sid, reason: "school_consent" });
        else {
          const id = () => `01JZ${String(++srv.seq).padStart(22, "0")}`;
          const data = { badgeId: b.id, name: b.name, custom: snapshotOf(b), manual: true };
          srv.classEvents.push({ id: id(), type: "badge_awarded", learnerId: sid, at, data, seq: srv.seq, class_id: m[1] });
          if (b.treasures)
            srv.classEvents.push({
              id: id(),
              type: "treasure_earned",
              learnerId: sid,
              at,
              data: { amount: b.treasures, reason: "badge", badgeId: b.id },
              seq: srv.seq,
              class_id: m[1],
            });
          awarded.push(sid);
        }
      }
      return json(route, 200, { awarded, skipped });
    }
    m = path.match(/^\/classes\/([^/]+)\/badge-wall$/);
    if (m && method === "GET") {
      // Mirrors services/api badge_wall: every child; first awards in [from, to); home badges
      // only for links that share all progress; tier upgrades are not new badges.
      const cls = srv.classes[m[1]];
      if (!cls || cls.teacher !== userId) return json(route, 404, { detail: "Not found" });
      let from = url.searchParams.get("from");
      let to = url.searchParams.get("to");
      if (!from && !to) {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
        from = d.toISOString();
        to = new Date(+d + 7 * 864e5).toISOString();
      }
      const span = Date.parse(to) - Date.parse(from);
      if (!(span > 0 && span <= (7 * 24 + 2) * 36e5)) return json(route, 422, { detail: "bad_week" });
      const when = (iso) => new Date(iso).toISOString().replace(".000Z", "Z");
      const roster = Object.values(srv.students)
        .filter((st) => st.class_id === m[1])
        .sort((a, b) => (a.first_name < b.first_name ? -1 : 1));
      const students = roster.map((st) => {
        const awards = [
          ...srv.classEvents.filter((e) => e.learnerId === st.id).map((e) => [e, "class"]),
          ...(st.learner_id && st.scope === "all"
            ? srv.events.filter((e) => e.learnerId === st.learner_id).map((e) => [e, "home"])
            : []),
        ].filter(([e]) => e.type === "badge_awarded" && !e.data.upgrade && Date.parse(e.at) < Date.parse(to));
        const first = new Map();
        for (const [e, where] of awards) {
          const had = first.get(e.data.badgeId);
          if (!had || Date.parse(e.at) < Date.parse(had.at))
            first.set(e.data.badgeId, {
              badge_id: e.data.badgeId,
              tier: ["bronze", "silver", "gold"].includes(e.data.tier) ? e.data.tier : null,
              at: when(e.at),
              where,
            });
        }
        return {
          id: st.id,
          first_name: st.first_name,
          initial: st.initial,
          avatar_color: st.avatar_color,
          badges: [...first.values()]
            .filter((b) => Date.parse(b.at) >= Date.parse(from))
            .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)),
        };
      });
      return json(route, 200, { class_name: cls.name, from: when(from), to: when(to), students });
    }
    m = path.match(/^\/classes\/([^/]+)\/assignments\/([^/]+)$/);
    if (m && method === "DELETE") {
      srv.assignments[m[2]].removed = true;
      return json(route, 204);
    }
    m = path.match(/^\/families\/([^/]+)\/assignments$/);
    if (m && method === "GET") {
      const out = [];
      const pairs = [];
      for (const st of Object.values(srv.students)) {
        if (!st.learner_id || srv.learners[st.learner_id]?.family_id !== m[1]) continue;
        const c = srv.classes[st.class_id];
        for (const a of openWork(srv, st.class_id)) {
          if (!targetsOf(srv, a).includes(st.id)) continue;
          out.push({
            ...assignmentOut(a),
            learner_id: st.learner_id,
            class_name: c.name,
            teacher: srv.users[c.teacher]?.name || "Your child's teacher",
          });
          pairs.push([a, st]);
        }
      }
      return json(route, 200, {
        assignments: out,
        events: workEvents(srv, pairs, { home: false, key: (st) => st.learner_id }),
      });
    }
    m = path.match(/^\/assignments\/([^/]+)\/media\/([^/]+)$/);
    if (m && method === "GET") {
      const media = srv.media[m[2]];
      if (!media?.bytes) return json(route, 404, { detail: "Not found" });
      return route.fulfill({ status: 200, contentType: media.type, body: media.bytes });
    }
    m = path.match(/^\/classes\/([^/]+)\/devices$/);
    if (m && method === "POST") {
      srv.classDevices[body.id] = { id: body.id, class_id: m[1], label: body.label, removed: false };
      return json(route, 201, {
        id: body.id,
        label: body.label,
        created_at: "2026-11-04T08:00:00Z",
        last_seen_at: "2026-11-04T08:00:00Z",
      });
    }
    m = path.match(/^\/classes\/([^/]+)\/devices\/([^/]+)$/);
    if (m && method === "GET") {
      const d = srv.classDevices[m[2]];
      return json(route, 200, { active: Boolean(d && d.class_id === m[1] && !d.removed) });
    }
    if (m && method === "DELETE") {
      srv.classDevices[m[2]].removed = true;
      return json(route, 204);
    }
    m = path.match(/^\/classes\/([^/]+)\/students\/([^/]+)\/help$/);
    if (m && method === "POST") {
      srv.students[m[2]].help = true;
      return json(route, 204);
    }
    m = path.match(/^\/classes\/([^/]+)\/students\/([^/]+)$/);
    if (m && method === "PATCH") {
      const st = srv.students[m[2]];
      if (body.help === false || body.new_pictures) st.help = false;
      if (body.new_pictures) st.pictures = ["dog", "star", "fish"];
      return json(route, 200, studentOut(st));
    }
    m = path.match(/^\/join\/([^/]+)$/);
    if (m) {
      const c = Object.values(srv.classes).find((x) => x.join_code === m[1].toUpperCase());
      if (!c)
        return json(route, 404, {
          detail: { code: "bad_code", message: "We couldn't find that class code." },
        });
      return json(route, 200, {
        class: {
          name: c.name,
          year_group: c.year_group,
          teacher: srv.users[c.teacher]?.name || "Your child's teacher",
          school: srv.schools[c.school_id]?.name,
        },
        students: Object.values(srv.students)
          .filter((x) => x.class_id === c.id && !x.learner_id)
          .map((x) => ({ id: x.id, name: x.initial ? `${x.first_name} ${x.initial}.` : x.first_name })),
      });
    }
    m = path.match(/^\/families\/([^/]+)\/links$/);
    if (m && method === "GET")
      return json(route, 200, {
        links: Object.values(srv.students)
          .filter((x) => x.learner_id && srv.learners[x.learner_id]?.family_id === m[1])
          .map((x) => linkOut(srv, x)),
      });
    if (m && method === "POST") {
      if (role === "viewer") return forbidViewer();
      const st = srv.students[body.student_id];
      st.learner_id = body.learner_id;
      st.scope = body.scope || "class";
      return json(route, 201, linkOut(srv, st));
    }
    m = path.match(/^\/families\/([^/]+)\/links\/([^/]+)$/);
    if (m && method === "PATCH") {
      srv.students[m[2]].scope = body.scope;
      return json(route, 200, linkOut(srv, srv.students[m[2]]));
    }
    if (m && method === "DELETE") {
      Object.assign(srv.students[m[2]], { learner_id: null, scope: "class" });
      return json(route, 204);
    }
    if (path === "/me" && method === "PATCH") {
      user.name = body.name;
      return json(route, 200, { user });
    }
    if (path === "/families" && method === "POST") {
      const f = {
        id: `F${Object.keys(srv.families).length + 1}`,
        name: body.name,
        country: body.country.toUpperCase(),
        plan: "family",
        settings: defaultSettings(),
        pin: null,
        updated_at: new Date().toISOString(),
      };
      srv.families[f.id] = f;
      srv.members.push({ family: f.id, user: userId, role: "owner" });
      return json(route, 201, familyOut(srv, f));
    }
    m = path.match(/^\/families\/([^/]+)$/);
    if (m && method === "PATCH") {
      if (role === "viewer") return forbidViewer();
      const f = srv.families[m[1]];
      if (Date.parse(body.updated_at) > Date.parse(f.updated_at)) {
        if (body.settings) f.settings = body.settings;
        if (body.country) {
          const c = srv.consents[f.id];
          if (c && !c.region) c.region = countryRules(f.country).region;
          f.country = body.country.toUpperCase();
        }
        if (body.clear_pin) f.pin = null;
        else if (body.pin) f.pin = body.pin;
        f.updated_at = body.updated_at;
      }
      return json(route, 200, familyOut(srv, f, role));
    }
    m = path.match(/^\/families\/([^/]+)\/consents$/);
    if (m) {
      const region = countryRules(srv.families[m[1]].country).region;
      // ONB-06b: US families sign a form that a person reviews.
      if (region === "us-coppa" && !body.form)
        return json(route, 422, {
          detail: { code: "signed_form_needed", message: "Please sign the consent form." },
        });
      srv.consents[m[1]] = {
        policy_version: body.policy_version,
        scopes: body.scopes,
        method: body.form ? "signed_form" : "checkbox",
        status: body.form ? "pending" : "approved",
        evidence: body.form || null,
        region,
        given_at: new Date().toISOString(),
      };
      return json(route, 201, srv.consents[m[1]]);
    }
    // SAF-03 export, SAF-04 deletion, OPS-06 flags, beta feedback, SAF-07 errors.
    m = path.match(/^\/families\/([^/]+)\/exports$/);
    if (m && method === "POST") {
      const e = {
        id: `X${srv.exports.length + 1}`,
        status: "ready",
        bytes: 1234,
        expires_at: "2030-01-08T00:00:00Z",
      };
      srv.exports.push(e);
      srv.sent.push({ to: user.email, kind: "export", id: e.id });
      return json(route, 201, e);
    }
    if (m && method === "GET") return json(route, 200, { exports: srv.exports });
    m = path.match(/^\/families\/([^/]+)\/deletion$/);
    if (m && method === "POST") {
      if (role !== "owner")
        return json(route, 403, { detail: "Only the family's owner can delete the family" });
      const token = `delete-${m[1]}-abcdefghijklmnop`;
      srv.deletions[m[1]] = { token };
      srv.sent.push({ to: user.email, kind: "delete", token });
      return json(route, 202, { sent: true });
    }
    m = path.match(/^\/families\/([^/]+)\/deletion\/undo$/);
    if (m && method === "POST") {
      delete srv.deletions[m[1]];
      return json(route, 204);
    }
    m = path.match(/^\/families\/([^/]+)\/flags$/);
    if (m)
      return json(route, 200, {
        cohorts: srv.families[m[1]].cohorts || [],
        flags: familyOut(srv, srv.families[m[1]]).flags,
      });
    m = path.match(/^\/families\/([^/]+)\/beta$/);
    if (m && method === "POST") {
      if (body.code !== "TB-BETA22")
        return json(route, 404, {
          detail: "That invite code can't be used. Check it or ask us for a new one.",
        });
      const f = srv.families[m[1]];
      f.cohorts = ["beta"];
      srv.flags[f.id] = { "beta-feedback": true, "beta-faq": true };
      return json(route, 200, { cohorts: f.cohorts, flags: familyOut(srv, f).flags });
    }
    m = path.match(/^\/families\/([^/]+)\/feedback$/);
    if (m && method === "POST") {
      srv.feedback.push(body);
      return json(route, 201, body);
    }
    m = path.match(/^\/families\/([^/]+)\/members$/);
    if (m)
      return json(route, 200, {
        members: srv.members
          .filter((x) => x.family === m[1])
          .map((x) => ({ user_id: x.user, ...srv.users[x.user], role: x.role, you: x.user === userId })),
        invites: Object.values(srv.invites)
          .filter((i) => i.family === m[1] && !i.accepted && !i.expired && !i.dead)
          .map((i) => ({ id: i.id, email: i.email, role: i.role, expires_at: "2030-01-01T00:00:00Z" })),
        // FAM-05: the invitation log, newest first.
        history: Object.values(srv.invites)
          .filter((i) => i.family === m[1] && !i.dead)
          .reverse()
          .map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            invited_by: "Grace",
            status: i.accepted ? "accepted" : i.expired ? "expired" : "pending",
            created_at: "2026-10-01T10:00:00Z",
            resent_at: i.resent_at || null,
            accepted_at: i.accepted ? "2026-10-02T10:00:00Z" : null,
          })),
      });
    m = path.match(/^\/families\/([^/]+)\/invites\/(\d+)\/resend$/);
    if (m && method === "POST") {
      const entry = Object.entries(srv.invites).find(([, i]) => i.id === Number(m[2]));
      if (!entry) return json(route, 404, { detail: "Invitation not found" });
      const [oldToken, inv] = entry;
      const token = `${oldToken}-r${Date.now()}`;
      srv.invites[oldToken] = { ...inv, dead: true }; // the old link stops working
      srv.invites[token] = { ...inv, expired: false, resent_at: new Date().toISOString() };
      srv.sent.push({ to: inv.email, token, kind: "invite" });
      return json(route, 200, { id: inv.id, status: "pending" });
    }
    // LES-19 letter sounds, HLP-02 support.
    m = path.match(/^\/families\/([^/]+)\/sounds\/([a-z]+)$/);
    if (m && method === "PUT") {
      if (role === "viewer") return forbidViewer();
      const f = srv.families[m[1]];
      f.sounds = { ...(f.sounds || {}) };
      if (body.media_id) {
        if (!srv.media[body.media_id]) return json(route, 422, { detail: "Record the sound first" });
        f.sounds[m[2]] = body.media_id;
      } else delete f.sounds[m[2]];
      return json(route, 200, { sounds: f.sounds });
    }
    if (path === "/support" && method === "POST") {
      const ref = `TB-${"ABCDE".slice(0, 5)}`;
      srv.support = [...(srv.support || []), { ...body, ref }];
      srv.sent.push({ to: user.email, kind: "support", ref });
      return json(route, 201, { ref });
    }
    m = path.match(/^\/families\/([^/]+)\/invites$/);
    if (m && method === "POST") {
      if (role === "viewer") return forbidViewer();
      const token = `invite-${Object.keys(srv.invites).length + 1}-abcdefghijklmnopqrstuvwxyz`;
      const inv = {
        id: Object.keys(srv.invites).length + 1,
        family: m[1],
        email: body.email.toLowerCase(),
        role: body.role,
      };
      srv.invites[token] = inv;
      srv.sent.push({ to: inv.email, token, kind: "invite" });
      return json(route, 201, { id: inv.id, email: inv.email, role: inv.role });
    }
    // Devices (FAM-08).
    m = path.match(/^\/families\/([^/]+)\/devices$/);
    if (m && method === "GET") {
      const users = srv.members.filter((x) => x.family === m[1]).map((x) => x.user);
      const devices = Object.entries(srv.sessions)
        .filter(([, uid]) => users.includes(uid))
        .map(([sid, uid]) => ({
          id: sid,
          name: srv.devices[sid]?.name || "A device",
          who: srv.users[uid].name || srv.users[uid].email.split("@")[0],
          last_seen_at: srv.devices[sid]?.last_seen_at || new Date().toISOString(),
          this_device: sid === sessionId,
        }));
      const limit = deviceLimit(srv.families[m[1]].plan);
      return json(route, 200, { devices, limit, over: Math.max(0, devices.length - limit) });
    }
    m = path.match(/^\/families\/([^/]+)\/devices\/([^/]+)$/);
    if (m && method === "DELETE") {
      if (!srv.sessions[m[2]]) return json(route, 404, { detail: "Device not found" });
      delete srv.sessions[m[2]];
      return json(route, 204);
    }
    m = path.match(/^\/families\/([^/]+)\/learners\/([^/]+)$/);
    if (m && method === "PUT") {
      if (role === "viewer") return forbidViewer();
      // ONB-05: a country with different privacy rules needs consent again.
      if (
        srv.consents[m[1]]?.region &&
        srv.consents[m[1]].region !== countryRules(srv.families[m[1]].country).region
      )
        return json(route, 403, { detail: "Your country's privacy rules changed. Please agree again." });
      if (srv.consents[m[1]]?.status === "pending")
        return json(route, 403, { detail: "Your signed consent form is waiting for review" });
      const cur = srv.learners[m[2]];
      const count = Object.values(srv.learners).filter((l) => l.family_id === m[1] && !l.removing_at).length;
      const limit = LIMITS[srv.families[m[1]].plan] ?? 1;
      if (!cur && count >= limit)
        return json(route, 402, {
          detail: { code: "plan_limit", limit, message: `Your plan allows ${limit} learners.` },
        });
      if (!cur || Date.parse(body.updated_at) > Date.parse(cur.updated_at))
        srv.learners[m[2]] = { id: m[2], family_id: m[1], ...body };
      const { family_id: _f, ...out } = srv.learners[m[2]];
      return json(route, 200, out);
    }
    if (m && method === "DELETE") {
      delete srv.learners[m[2]];
      srv.events = srv.events.filter((e) => e.learnerId !== m[2]);
      return json(route, 204);
    }
    // Custom lessons (Lesson Builder).
    m = path.match(/^\/families\/([^/]+)\/lessons$/);
    if (m && method === "GET")
      return json(route, 200, {
        lessons: Object.values(srv.lessons)
          .filter((l) => l.family_id === m[1])
          .map(({ family_id: _f, ...l }) => l),
      });
    m = path.match(/^\/families\/([^/]+)\/lessons\/([^/]+)$/);
    if (m && method === "PUT") {
      if (role === "viewer") return forbidViewer();
      const cur = srv.lessons[m[2]];
      if (!cur || Date.parse(body.updated_at) > Date.parse(cur.updated_at))
        srv.lessons[m[2]] = { id: m[2], family_id: m[1], ...body };
      const { family_id: _f, ...out } = srv.lessons[m[2]];
      return json(route, 200, out);
    }
    if (m && method === "DELETE") {
      if (role === "viewer") return forbidViewer();
      delete srv.lessons[m[2]];
      return json(route, 204);
    }
    // Badge Studio (S11): family badges and wishes, newest edit wins.
    m = path.match(/^\/families\/([^/]+)\/(badges|wishes)$/);
    if (m && method === "GET") {
      const store = m[2] === "badges" ? srv.badges : srv.wishes;
      const rows = Object.values(store).filter((x) => x.family_id === m[1]);
      return json(route, 200, {
        [m[2]]: rows.map((x) => (m[2] === "badges" ? badgeOut(x) : (({ family_id: _f, ...w }) => w)(x))),
      });
    }
    m = path.match(/^\/families\/([^/]+)\/(badges|wishes)\/([^/]+)$/);
    if (m && method === "PUT") {
      if (role === "viewer") return forbidViewer();
      const kids = Object.values(srv.learners).filter((l) => l.family_id === m[1]).map((l) => l.id);
      const store = m[2] === "badges" ? srv.badges : srv.wishes;
      if (m[2] === "badges") {
        const lessons = Object.values(srv.lessons).filter((l) => l.family_id === m[1]).map((l) => l.id);
        const lessonOk = [body.rule, ...(body.rule?.all || [])].every((r) => !r?.lesson || lessons.includes(r.lesson));
        const audienceOk = Array.isArray(body.audience) && body.audience.length > 0 && body.audience.every((a) => kids.includes(a));
        const problem = badgeProblem(body, FAMILY_RULES, audienceOk) || (lessonOk ? null : "rule");
        if (problem) return json(route, 422, { detail: problem });
      } else {
        const t = String(body.title || "").trim();
        if (!t || t.length > 60 || !(body.price >= 1 && body.price <= 1000) || !kids.includes(body.learner_id))
          return json(route, 422, { detail: "wish" });
      }
      const cur = store[m[3]];
      if (!cur || Date.parse(body.updated_at) > Date.parse(cur.updated_at)) store[m[3]] = { id: m[3], family_id: m[1], ...body };
      const { family_id: _f, ...out } = store[m[3]];
      return json(route, 200, m[2] === "badges" ? badgeOut(out) : out);
    }
    if (m && method === "DELETE") {
      if (role === "viewer") return forbidViewer();
      delete (m[2] === "badges" ? srv.badges : srv.wishes)[m[3]];
      return json(route, 204);
    }

    // ---- S11b share codes (SHR-01…05) ----
    m = path.match(/^\/(families|classes)\/([^/]+)\/shares$/);
    if (m && user) {
      const owner = m[1] === "families" ? { family_id: m[2] } : { class_id: m[2] };
      if (method === "GET")
        return json(route, 200, {
          shares: Object.values(srv.shares)
            .filter((x) => (owner.family_id ? x.family_id === m[2] : x.class_id === m[2]))
            .reverse()
            .map(shareOut),
        });
      if (method === "POST") {
        if (role === "viewer" && owner.family_id) return forbidViewer();
        if (user.share_banned) return json(route, 403, { detail: { code: "banned", message: "Sharing is switched off." } });
        if (!body.checklist?.no_names)
          return json(route, 422, { detail: { code: "checklist", message: "Confirm there are no names or addresses." } });
        const mine = (x) => (owner.family_id ? x.family_id === m[2] : x.class_id === m[2]);
        const pool = body.kind === "badges" ? Object.values(srv.badges).filter(mine) : Object.values(srv.lessons).filter(mine);
        const rows = body.ids.map((id) => pool.find((x) => x.id === id));
        if (rows.some((x) => !x)) return json(route, 404, { detail: "Not found" });
        const src = body.kind === "badges" ? { kind: "badges", badges: rows } : { kind: body.kind, lessons: rows };
        const pkg = sharePackage(src, { voice: body.voice, removed: body.checklist.removed });
        const { photos, voices } = packageMedia(pkg);
        const media = [...photos, ...voices];
        if (media.some((id) => srv.media[id]?.status !== "ready"))
          return json(route, 409, { detail: { code: "media_not_ready", message: "Still uploading" } });
        let code;
        do code = Array.from({ length: 6 }, () => SHARE_ALPHABET[Math.floor(Math.random() * 32)]).join("");
        while (Object.values(srv.shares).some((x) => x.code === code));
        const id = `SH${++srv.seq}`;
        const now = new Date();
        srv.shares[id] = {
          id,
          code,
          ...owner,
          kind: body.kind,
          title: pkg.title,
          package: pkg,
          media,
          checklist: { ...body.checklist, voice: !!body.voice, by: userId, at: now.toISOString() },
          status: media.length ? "review" : "live",
          created_by: userId,
          created_at: now.toISOString(),
          expires_at: new Date(now.getTime() + 30 * 864e5).toISOString(),
          imports: 0,
        };
        if (media.length) openItem(srv, "share", "review", { share_id: id });
        return json(route, 201, shareOut(srv.shares[id]));
      }
    }
    m = path.match(/^\/(families|classes)\/([^/]+)\/shares\/([^/]+)$/);
    if (m && method === "DELETE" && user) {
      const sh = srv.shares[m[3]];
      if (!sh) return json(route, 404, { detail: "Share not found" });
      if (sh.status === "live" || sh.status === "review") sh.status = "revoked";
      return json(route, 204);
    }
    m = path.match(/^\/families\/([^/]+)\/media-hidden$/);
    if (m && user)
      return json(route, 200, {
        hidden: Object.entries(srv.media)
          .filter(([, x]) => x.family === m[1] && (x.status === "flagged" || x.status === "hidden"))
          .map(([id]) => id),
      });
    m = path.match(/^\/shares\/([^/]+)(\/media\/([^/]+)|\/import)?$/);
    if (m && user && !path.endsWith("/reports")) {
      const sh = Object.values(srv.shares).find((x) => x.code === normaliseShareCode(m[1]));
      if (!sh) return json(route, 404, { detail: { code: "not_found", message: "We couldn't find that code." } });
      const st = shareState(sh);
      if (st === "review") return json(route, 423, { detail: { code: "review", message: "Being checked" } });
      if (st !== "live") return json(route, 410, { detail: { code: "gone", message: "This code is no longer available." } });
      if (m[3] && method === "GET") {
        const md = srv.media[m[3]];
        if (!sh.media.includes(m[3]) || md?.status !== "ready") return json(route, 404, { detail: { code: "hidden" } });
        return route.fulfill({ status: 200, contentType: md.type, body: md.bytes });
      }
      if (m[2] === "/import" && method === "POST") {
        const out = { lessons: [], badges: [] };
        const now = new Date().toISOString();
        const moved = {};
        if (body.family_id)
          for (const mid of sh.media) {
            const md = srv.media[mid];
            if (md?.status !== "ready") continue;
            const nid = `01JCOPY${String(++srv.seq).padStart(19, "0")}`;
            srv.media[nid] = { ...md, family: body.family_id, origin: md.origin || mid };
            moved[mid] = nid;
          }
        const ulidish = () => `01JIMP${String(++srv.seq).padStart(20, "0")}`;
        for (const l of sh.package.lessons) {
          const cards = l.cards.map((c) => {
            const x = { ...c };
            for (const k of ["photo", "voice"]) if (x[k]) (moved[x[k]] ? (x[k] = moved[x[k]]) : delete x[k]);
            return x;
          });
          const id = ulidish();
          srv.lessons[id] = { id, family_id: body.family_id, ...l, cards, assigned: [], version: 1, source_share: sh.id, updated_at: now };
          const { family_id: _f, ...row } = srv.lessons[id];
          out.lessons.push(row);
        }
        const kids = Object.values(srv.learners).filter((x) => x.family_id === body.family_id).map((x) => x.id);
        for (const b of sh.package.badges) {
          const id = ulidish();
          const photo = body.family_id ? moved[b.design.photo] : null;
          srv.badges[id] = {
            id,
            ...(body.class_id ? { class_id: body.class_id } : { family_id: body.family_id }),
            name: b.name,
            shape: b.design.shape,
            colour: b.design.colour,
            icon: b.design.icon,
            photo: photo || null,
            note: b.note || null,
            voice: body.family_id ? moved[b.voice] || null : null,
            rule: b.rule,
            treasures: b.treasures,
            reward: b.reward || null,
            audience: body.class_id ? "class" : kids,
            source_share: sh.id,
            updated_at: now,
          };
          out.badges.push(badgeOut(srv.badges[id]));
        }
        sh.imports += 1;
        return json(route, 201, out);
      }
      if (!m[2] && method === "GET") {
        const by = srv.users[sh.created_by]?.name || "a Trailbuddies grown-up";
        const own = sh.family_id ? srv.members.some((x) => x.family === sh.family_id && x.user === userId) : srv.classes[sh.class_id]?.teacher === userId;
        return json(route, 200, { ...shareOut(sh), by, own, package: sh.package });
      }
    }
    m = path.match(/^\/shares\/([^/]+)\/reports$/);
    if (m && method === "POST" && user) {
      const sh = srv.shares[m[1]];
      const hasCopy = [...Object.values(srv.lessons), ...Object.values(srv.badges)].some(
        (x) => x.family_id === body.family_id && x.source_share === m[1],
      );
      if (!sh || !hasCopy) return json(route, 404, { detail: "Share not found" });
      if (srv.reports.some((r) => r.share_id === m[1] && r.family_id === body.family_id))
        return json(route, 201, { reported: true, already: true, suspended: sh.status === "suspended" });
      srv.reports.push({ share_id: m[1], family_id: body.family_id, reason: body.reason });
      openItem(srv, "report", body.reason, { share_id: m[1] });
      const n = srv.reports.filter((r) => r.share_id === m[1]).length;
      if (n >= REPORT_THRESHOLD && sh.status === "live") {
        sh.status = "suspended";
        srv.modLog.unshift({ id: `A${++srv.seq}`, action: "suspend_share", target: formatShareCode(sh.code), who: "automatic", why: `${n} families reported it`, at: new Date().toISOString() });
      }
      return json(route, 201, { reported: true, already: false, suspended: sh.status === "suspended" });
    }
    // ---- S11b moderation (MOD-01…03), safety team only ----
    m0 = path.match(/^\/content\/assets\/([^/]+)$/);
    if (m0) {
      const a = srv.contentAssets[m0[1]];
      const md = srv.media[m0[1]];
      return a?.approval === "approved" && md?.bytes ? route.fulfill({ status: 200, contentType: md.type, body: md.bytes }) : json(route, 404, { detail: "Not found" });
    }
    if (path.startsWith("/admin/")) {
      if (!user) return json(route, 401, { detail: "Not signed in" });
      if (!path.startsWith("/admin/moderation") && !path.startsWith("/admin/media/")) {
        const done = staffRoutes(srv, route, { path, method, body, user });
        if (done) return done;
      }
      if (!cmsCan(srv, user.email, "moderate")) return json(route, 403, { detail: "Only the safety team can open this" });
      if (path === "/admin/moderation" && method === "GET") {
        const items = Object.values(srv.modItems);
        return json(route, 200, {
          items: items.filter((i) => i.status === "open").sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).map((i) => modItemOut(srv, i)),
          closed: items.filter((i) => i.status === "closed").map((i) => modItemOut(srv, i)),
          audit: srv.modLog.slice(0, 50),
        });
      }
      m = path.match(/^\/admin\/media\/([^/]+)$/);
      if (m) {
        const md = srv.media[m[1]];
        return md?.bytes ? route.fulfill({ status: 200, contentType: md.type, body: md.bytes }) : json(route, 404, { detail: "Not found" });
      }
      m = path.match(/^\/admin\/moderation\/([^/]+)$/);
      if (m && method === "POST") {
        const i = srv.modItems[m[1]];
        if (!i) return json(route, 404, { detail: "Not found" });
        if (!body.reason || body.reason.length < 3) return json(route, 422, { detail: "reason" });
        const sh = i.share_id ? srv.shares[i.share_id] : null;
        const a = body.action;
        let target = sh ? formatShareCode(sh.code) : i.media_id;
        if (a === "approve" && sh?.status === "review") sh.status = "live";
        if (a === "keep" && sh?.status === "suspended") sh.status = "live";
        if (a === "suspend_share" && sh) sh.status = "suspended";
        if (a === "restore_share" && sh?.status === "suspended") sh.status = "live";
        if (a === "hide_image" || a === "restore_image") {
          target = body.media_id || i.media_id;
          for (const [, md] of copiesOf(srv, target))
            if (a === "hide_image") md.status = "hidden";
            else if (md.status === "hidden" || md.status === "flagged") md.status = "ready";
        }
        srv.modLog.unshift({ id: `A${++srv.seq}`, item_id: i.id, action: a, target, who: user.email, why: body.reason, at: new Date().toISOString() });
        const closes = { approve: "approved", keep: "kept", suspend_share: "removed", suspend_creator: "removed", dismiss: "dismissed" };
        if (closes[a] && i.status === "open") Object.assign(i, { status: "closed", outcome: closes[a] });
        if (i.kind === "upload" && (a === "hide_image" || a === "restore_image") && i.status === "open")
          Object.assign(i, { status: "closed", outcome: a === "hide_image" ? "hidden" : "restored" });
        if (i.kind === "report" && i.status === "closed" && sh)
          for (const r of srv.reports.filter((x) => x.share_id === sh.id && !x.answered)) {
            r.answered = true;
            srv.sent.push({ to: r.family_id, subject: "We've reviewed the lesson you reported" });
          }
        return json(route, 200, modItemOut(srv, i));
      }
    }
    // Photos and voice clips: reserve, upload, check (any EXIF is refused, like GPS data).
    m = path.match(/^\/families\/([^/]+)\/media$/);
    if (m && method === "POST") {
      if (role === "viewer") return forbidViewer();
      const scope = body.kind === "photo" ? "photos" : "voice";
      if (!srv.consents[m[1]]?.scopes?.[scope])
        return json(route, 403, {
          detail: { code: "consent_needed", scope, message: "Turn this on first." },
        });
      const md = srv.media[body.id] || {
        family: m[1],
        kind: body.kind,
        type: body.content_type,
        bytes: null,
      };
      md.status = md.status === "ready" ? "ready" : "pending";
      srv.media[body.id] = md;
      return json(route, 201, {
        id: body.id,
        status: md.status,
        upload:
          md.status === "ready"
            ? null
            : {
                url: `/api/media/blob/${body.id}?exp=1&sig=x`,
                method: "PUT",
                headers: { "Content-Type": body.content_type },
              },
      });
    }
    m = path.match(/^\/families\/([^/]+)\/media\/([^/]+)\/complete$/);
    if (m && method === "POST") {
      const md = srv.media[m[2]];
      if (!md || md.family !== m[1]) return json(route, 404, { detail: "Not found" });
      if (!md.bytes) return json(route, 409, { detail: { code: "not_uploaded", message: "Not yet" } });
      if (md.kind === "photo" && md.bytes.includes(Buffer.from("Exif\0\0"))) {
        md.status = "rejected";
        md.bytes = null;
        return json(route, 422, { detail: { code: "gps_metadata", message: "Location data" } });
      }
      md.status = "ready";
      if (body.scan && md.kind === "photo") {
        md.scan = body.scan;
        if (body.scan.flagged) {
          md.status = "flagged"; // SAF-08: hidden until the safety team looks
          openItem(srv, "upload", body.scan.reason || "nudity", { media_id: m[2], family_id: m[1] });
        }
      }
      return json(route, 200, { id: m[2], kind: md.kind, status: md.status });
    }
    m = path.match(/^\/families\/([^/]+)\/media\/([^/]+)$/);
    if (m && method === "GET") {
      const md = srv.media[m[2]];
      if (!md || md.family !== m[1] || md.status !== "ready")
        return json(route, 404, { detail: "Not found" });
      // The real API redirects to a short-lived link; Playwright's routing doesn't see the
      // redirected request, so the file is served here directly.
      return route.fulfill({ status: 200, contentType: md.type, body: md.bytes });
    }
    if (path === "/sync/events" && method === "POST") {
      if (role === "viewer") return forbidViewer();
      if (srv.consents[body.family_id]?.status === "pending")
        return json(route, 403, { detail: "Your signed consent form is waiting for review" });
      const accepted = [];
      for (const e of body.events) {
        if (!srv.events.some((x) => x.id === e.id))
          srv.events.push({ ...e, seq: ++srv.seq, family_id: body.family_id });
        accepted.push(e.id);
      }
      return json(route, 200, { accepted, rejected: [] });
    }
    if (path === "/sync/events" && method === "GET") {
      const after = Number(url.searchParams.get("after") || 0);
      const events = srv.events
        .filter((e) => e.family_id === url.searchParams.get("family_id") && e.seq > after)
        .map(({ family_id: _f, ...e }) => e);
      return json(route, 200, { events, cursor: events.length ? events.at(-1).seq : after, more: false });
    }
    return json(route, 404, { detail: `fake API: no route for ${method} ${path}` });
  });
}

/** A signed-up family on the server, as if set up on another device. */
export function seedServer(srv, { pin = null, plan = "family" } = {}) {
  srv.users.U1 = { id: "U1", email: "grace@example.com", name: "Grace" };
  srv.members.push({ family: "F1", user: "U1", role: "owner" });
  srv.families.F1 = {
    id: "F1",
    name: "Grace's family",
    country: "KE",
    plan,
    settings: defaultSettings(),
    pin,
    updated_at: "2026-10-01T10:00:00Z",
  };
  srv.consents.F1 = {
    policy_version: POLICY,
    scopes: { progress: true },
    method: "checkbox",
    given_at: "2026-10-01T10:00:00Z",
  };
  srv.learners["01JB0000000000000000000001"] = {
    id: "01JB0000000000000000000001",
    family_id: "F1",
    name: "Wanjiru",
    birth_year: 2020,
    birth_month: 6,
    avatar_color: "berry",
    buddy: "tumi",
    outfit: {},
    interests: [],
    placement: {},
    difficulty: "auto",
    wish: null,
    updated_at: "2026-10-01T10:00:00Z",
  };
  const at = new Date(Date.now() - 3600_000).toISOString();
  srv.events.push({
    id: "01JB00000000000000000000E1",
    type: "lesson_completed",
    learnerId: "01JB0000000000000000000001",
    at,
    data: {
      lessonId: "counting-1-5-1",
      unitId: "counting-1-5",
      subjectId: "numbers",
      kind: "lesson",
      stars: 3,
      durationSec: 300,
    },
    seq: ++srv.seq,
    family_id: "F1",
  });
  return srv;
}
