// A small in-memory stand-in for services/api, served through Playwright's request
// routing on /api/*. It follows the real API's contract (see services/api/tests) so the
// web app's sign-in, onboarding and sync can be tested at every screen size.

export const POLICY = "2026-10";

export function newServer() {
  return {
    users: {},
    families: {},
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
  consent: srv.consents[fam.id] || null,
  learners: Object.values(srv.learners)
    .filter((l) => l.family_id === fam.id)
    .map(({ family_id: _f, ...l }) => l),
});

/**
 * Route /api/* for a browser context. Each context is one device with its own session.
 * @param {import("@playwright/test").BrowserContext} context
 * @param {ReturnType<typeof newServer>} srv
 */
export async function fakeApi(context, srv) {
  let userId = null;
  await context.route("**/api/**", async (route) => {
    if (srv.offline) return route.abort("internetdisconnected");
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = req.method();
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    const user = userId && srv.users[userId];
    const fam = user && Object.values(srv.families).find((f) => f.owner === userId);

    if (path === "/auth/config") return json(route, 200, { google: false, policy_version: POLICY });
    if (path === "/policy")
      return json(route, 200, {
        version: POLICY,
        collect: [
          "Your name and email, to sign you in.",
          "Each learner's first name and birth month and year.",
        ],
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
      let u = Object.values(srv.users).find((x) => x.email === email);
      const isNew = !u;
      if (!u) {
        u = { id: `U${Object.keys(srv.users).length + 1}`, email, name: "" };
        srv.users[u.id] = u;
      }
      userId = u.id;
      return json(route, 200, { user: u, new: isNew });
    }
    if (path === "/auth/logout") {
      userId = null;
      return json(route, 200, { ok: true });
    }
    if (!user) return json(route, 401, { detail: "Not signed in" });

    if (path === "/me" && method === "GET")
      return json(route, 200, { user, families: fam ? [familyOut(srv, fam)] : [] });
    if (path === "/me" && method === "PATCH") {
      user.name = body.name;
      return json(route, 200, { user });
    }
    if (path === "/families" && method === "POST") {
      const f = {
        id: `F${Object.keys(srv.families).length + 1}`,
        owner: userId,
        name: body.name,
        country: body.country.toUpperCase(),
        plan: "free",
        settings: {
          goal: 2,
          limit: 20,
          bedtime: { on: false, start: "19:30", end: "06:30" },
          voice: true,
          voice_rate: 1,
          sound: true,
        },
        pin: null,
        updated_at: new Date().toISOString(),
      };
      srv.families[f.id] = f;
      return json(route, 201, familyOut(srv, f));
    }
    let m = path.match(/^\/families\/([^/]+)$/);
    if (m && method === "PATCH") {
      const f = srv.families[m[1]];
      if (Date.parse(body.updated_at) > Date.parse(f.updated_at)) {
        if (body.settings) f.settings = body.settings;
        if (body.clear_pin) f.pin = null;
        else if (body.pin) f.pin = body.pin;
        f.updated_at = body.updated_at;
      }
      return json(route, 200, familyOut(srv, f));
    }
    m = path.match(/^\/families\/([^/]+)\/consents$/);
    if (m) {
      srv.consents[m[1]] = {
        policy_version: body.policy_version,
        scopes: body.scopes,
        given_at: new Date().toISOString(),
      };
      return json(route, 201, srv.consents[m[1]]);
    }
    m = path.match(/^\/families\/([^/]+)\/learners\/([^/]+)$/);
    if (m && method === "PUT") {
      const cur = srv.learners[m[2]];
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
export function seedServer(srv, { pin = null } = {}) {
  srv.users.U1 = { id: "U1", email: "grace@example.com", name: "Grace" };
  srv.families.F1 = {
    id: "F1",
    owner: "U1",
    name: "Grace's family",
    country: "KE",
    plan: "free",
    settings: {
      goal: 2,
      limit: 20,
      bedtime: { on: false, start: "19:30", end: "06:30" },
      voice: true,
      voice_rate: 1,
      sound: true,
    },
    pin,
    updated_at: "2026-10-01T10:00:00Z",
  };
  srv.consents.F1 = { policy_version: POLICY, scopes: { progress: true }, given_at: "2026-10-01T10:00:00Z" };
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
