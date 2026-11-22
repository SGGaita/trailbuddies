import { createClient, ApiError } from "./index.js";

function recorder(status = 200, body = {}) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: status < 400, status, json: async () => body };
  };
  return { calls, fetch };
}

test("requests send cookies and JSON", async () => {
  const r = recorder(202, { sent: true });
  const c = createClient({ baseUrl: "/api/", fetch: r.fetch });
  expect(await c.magicLink("a@example.com")).toEqual({ sent: true });
  const { url, init } = r.calls[0];
  expect(url).toBe("/api/auth/magic-link");
  expect(init).toMatchObject({ method: "POST", credentials: "include" });
  expect(init.headers["Content-Type"]).toBe("application/json");
  expect(JSON.parse(init.body)).toEqual({ email: "a@example.com" });
});

test("sync and learner paths", async () => {
  const r = recorder(200, {});
  const c = createClient({ baseUrl: "/api", fetch: r.fetch });
  await c.pullEvents("F1", 7);
  await c.putLearner("F1", "L1", { name: "Z" });
  await c.giveConsent("F1", { policy_version: "v", scopes: { progress: true } });
  expect(r.calls.map((x) => `${x.init.method || "GET"} ${x.url}`)).toEqual([
    "GET /api/sync/events?family_id=F1&after=7",
    "PUT /api/families/F1/learners/L1",
    "POST /api/families/F1/consents",
  ]);
  expect(JSON.parse(r.calls[2].init.body).agreed).toBe(true);
});

test("errors carry the status and the API's message", async () => {
  const c = createClient({ baseUrl: "/api", fetch: recorder(400, { detail: "This link has expired" }).fetch });
  await expect(c.verify("x")).rejects.toBeInstanceOf(ApiError);
  await expect(c.verify("x")).rejects.toMatchObject({ status: 400, message: "This link has expired" });
});

test("structured errors keep their code (plan limit)", async () => {
  const body = { detail: { code: "plan_limit", limit: 6, message: "Your plan allows 6 learners." } };
  const c = createClient({ baseUrl: "/api", fetch: recorder(402, body).fetch });
  await expect(c.putLearner("F", "L", {})).rejects.toMatchObject({ status: 402, code: "plan_limit", message: "Your plan allows 6 learners." });
});

test("device and content paths", async () => {
  const r = recorder(200, {});
  const c = createClient({ baseUrl: "/api", fetch: r.fetch });
  await c.devices("F1");
  await c.signOutDevice("F1", "S 1");
  await c.contentManifest("production");
  await c.contentPack("numbers.0123456789abcdef.json");
  expect(r.calls.map((x) => `${x.init.method || "GET"} ${x.url}`)).toEqual([
    "GET /api/families/F1/devices",
    "DELETE /api/families/F1/devices/S%201",
    "GET /api/content/manifest?channel=production",
    "GET /api/content/packs/numbers.0123456789abcdef.json",
  ]);
});

test("staff and content admin paths (CMS-01…04)", async () => {
  const r = recorder(200, {});
  const c = createClient({ baseUrl: "/api", fetch: r.fetch });
  await c.staffMe();
  await c.changeStaffRole("w@x.africa", "reviewer");
  await c.saveContentUnit("farm-animals", { id: "farm-animals" });
  await c.publishContent("Facts", true);
  await c.decideContentAsset("M1", true);
  expect(r.calls.map((x) => `${x.init.method || "GET"} ${x.url}`)).toEqual([
    "GET /api/admin/me",
    "PATCH /api/admin/staff/w%40x.africa",
    "PUT /api/admin/content/units/farm-animals",
    "POST /api/admin/content/publish",
    "POST /api/admin/content/assets/M1/decision",
  ]);
  expect(JSON.parse(r.calls[2].init.body)).toEqual({ unit: { id: "farm-animals" } });
  expect(JSON.parse(r.calls[3].init.body)).toEqual({ note: "Facts", confirm_own: true });
});

test("the content checks' problems come back on the error", async () => {
  const body = { detail: { code: "invalid", message: "Fix these before saving.", problems: ["/items/0/label is empty"] } };
  const c = createClient({ baseUrl: "/api", fetch: recorder(422, body).fetch });
  await expect(c.saveContentUnit("u", {})).rejects.toMatchObject({ code: "invalid", problems: ["/items/0/label is empty"] });
});
