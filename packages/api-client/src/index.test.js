import { createClient, ApiError } from "./index.js";

const fakeFetch = (status, body) => async (url, init) => ({
  ok: status < 400,
  status,
  json: async () => ({ ...body, url, auth: init.headers.Authorization }),
});

test("health calls /health with the token", async () => {
  const c = createClient({
    baseUrl: "http://api/",
    fetch: fakeFetch(200, { status: "ok" }),
    token: () => "abc",
  });
  const r = await c.health();
  expect(r).toMatchObject({ status: "ok", url: "http://api/health", auth: "Bearer abc" });
});

test("errors carry the status", async () => {
  const c = createClient({ baseUrl: "http://api", fetch: fakeFetch(503, {}) });
  await expect(c.health()).rejects.toBeInstanceOf(ApiError);
  await expect(c.health()).rejects.toMatchObject({ status: 503 });
});
