// A small in-memory stand-in for services/api, served through Playwright's request
// routing on /api/*. It follows the real API's contract (see services/api/tests) so the
// web app's sign-in, onboarding and sync can be tested at every screen size.

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
    tokens: {},
    sent: [],
    offline: false,
    seq: 0,
  };
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
  consent: srv.consents[fam.id] || null,
  learners: Object.values(srv.learners)
    .filter((l) => l.family_id === fam.id)
    .map(({ family_id: _f, ...l }) => l),
});

const defaultSettings = () => ({
  goal: 2,
  limit: 20,
  bedtime: { on: false, start: "19:30", end: "06:30" },
  voice: true,
  voice_rate: 1,
  sound: true,
  treasure_cap: true,
});

/**
 * Route /api/* for a browser context. Each context is one device with its own session.
 * @param {import("@playwright/test").BrowserContext} context
 * @param {ReturnType<typeof newServer>} srv
 */
export async function fakeApi(context, srv) {
  let sessionId = null;
  const signIn = (uid) => {
    sessionId = `S${Object.keys(srv.sessions).length + 1}-${Math.random().toString(36).slice(2)}`;
    srv.sessions[sessionId] = uid;
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
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    const userId = sessionId && srv.sessions[sessionId];
    const user = userId && srv.users[userId];
    const membership = user && srv.members.find((x) => x.user === userId);
    const fam = membership && srv.families[membership.family];
    const role = membership?.role;
    const forbidViewer = () => json(route, 403, { detail: "This role can only view progress" });

    if (path === "/auth/config") return json(route, 200, { google: false, policy_version: POLICY });
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
          voice: { label: "Let grown-ups record their own voice for lessons (later)", required: false },
        },
      });
    if (path === "/auth/magic-link" && method === "POST") {
      const token = `token-${Object.keys(srv.tokens).length + 1}-abcdefghijklmnopqrstuvwxyz`;
      srv.tokens[token] = body.email.toLowerCase();
      srv.sent.push({ to: body.email, token });
      return json(route, 202, { sent: true });
    }
    if (path === "/auth/verify" && method === "POST") {
      const email = srv.tokens[body.token];
      if (!email)
        return json(route, 400, { detail: "This link has expired or was already used. Ask for a new one." });
      delete srv.tokens[body.token];
      const [u, isNew] = userFor(email);
      signIn(u.id);
      return json(route, 200, { user: u, new: isNew });
    }
    if (path === "/invites/accept" && method === "POST") {
      const inv = srv.invites[body.token];
      if (!inv || inv.accepted)
        return json(route, 400, { detail: "This invitation has expired or was already used." });
      inv.accepted = true;
      const [u] = userFor(inv.email);
      srv.members.push({ family: inv.family, user: u.id, role: inv.role });
      signIn(u.id);
      return json(route, 200, { family_id: inv.family, role: inv.role });
    }
    if (path === "/auth/logout") {
      delete srv.sessions[sessionId];
      sessionId = null;
      return json(route, 200, { ok: true });
    }
    if (!user) return json(route, 401, { detail: "Not signed in" });

    if (path === "/auth/logout-all") {
      for (const [k, v] of Object.entries(srv.sessions)) if (v === userId) delete srv.sessions[k];
      sessionId = null;
      return json(route, 200, { ok: true });
    }
    if (path === "/me" && method === "GET")
      return json(route, 200, { user, families: fam ? [familyOut(srv, fam, role)] : [] });
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
    let m = path.match(/^\/families\/([^/]+)$/);
    if (m && method === "PATCH") {
      if (role === "viewer") return forbidViewer();
      const f = srv.families[m[1]];
      if (Date.parse(body.updated_at) > Date.parse(f.updated_at)) {
        if (body.settings) f.settings = body.settings;
        if (body.clear_pin) f.pin = null;
        else if (body.pin) f.pin = body.pin;
        f.updated_at = body.updated_at;
      }
      return json(route, 200, familyOut(srv, f, role));
    }
    m = path.match(/^\/families\/([^/]+)\/consents$/);
    if (m) {
      srv.consents[m[1]] = {
        policy_version: body.policy_version,
        scopes: body.scopes,
        method: "checkbox",
        given_at: new Date().toISOString(),
      };
      return json(route, 201, srv.consents[m[1]]);
    }
    m = path.match(/^\/families\/([^/]+)\/members$/);
    if (m)
      return json(route, 200, {
        members: srv.members
          .filter((x) => x.family === m[1])
          .map((x) => ({ user_id: x.user, ...srv.users[x.user], role: x.role, you: x.user === userId })),
        invites: Object.values(srv.invites)
          .filter((i) => i.family === m[1] && !i.accepted)
          .map((i) => ({ id: i.id, email: i.email, role: i.role, expires_at: "2030-01-01T00:00:00Z" })),
      });
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
    m = path.match(/^\/families\/([^/]+)\/learners\/([^/]+)$/);
    if (m && method === "PUT") {
      if (role === "viewer") return forbidViewer();
      const cur = srv.learners[m[2]];
      const count = Object.values(srv.learners).filter((l) => l.family_id === m[1]).length;
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
    if (path === "/sync/events" && method === "POST") {
      if (role === "viewer") return forbidViewer();
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
