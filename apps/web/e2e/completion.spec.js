import { test, expect } from "@playwright/test";
import { newServer, fakeApi, seedServer } from "./fakeApi.js";
import { shot, noSideScroll, watchErrors, demo, passGate } from "./helpers.js";

// Sprint 1-2 completion: invites and carers, sign out everywhere, plan limits, the
// hold-to-open gate, drag-to-match, and sound files.
test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/]);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

async function signIn(page, srv, email = "grace@example.com") {
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).toHaveURL(/\/play$/);
}

test("a parent invites a carer, who can view progress but not change settings", async ({
  browser,
}, testInfo) => {
  const srv = seedServer(newServer());
  const grace = await browser.newContext({ viewport: testInfo.project.use.viewport });
  await fakeApi(grace, srv);
  const page = await grace.newPage();
  watchErrors(page, [/Failed to load resource/]);
  await signIn(page, srv);
  await page.goto("/family/settings");
  await passGate(page);
  await expect(page.getByRole("heading", { name: "Grown-ups in this family" })).toBeVisible();
  await page.getByLabel("Their email address").fill("nana@example.com");
  await page.getByRole("button", { name: "View progress only" }).click();
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("Invited · waiting · Views progress")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "c1-invite");
  const invite = srv.sent.find((x) => x.kind === "invite");
  expect(invite.to).toBe("nana@example.com");

  // Nana opens the invitation on her own phone.
  const nanaCtx = await browser.newContext({ viewport: testInfo.project.use.viewport });
  await fakeApi(nanaCtx, srv);
  const nana = await nanaCtx.newPage();
  watchErrors(nana, [/Failed to load resource/]);
  await nana.goto(`/invite?token=${encodeURIComponent(invite.token)}`);
  await expect(nana).toHaveURL(/\/family$/);
  await nana.goto("/family/settings");
  await passGate(nana); // a fresh page load locks the grown-up zone again
  await expect(
    nana.getByText("You can view progress. Settings can only be changed by a parent."),
  ).toBeVisible();
  await expect(nana.getByRole("group", { name: "Daily goal" })).toHaveCount(0);
  await shot(nana, testInfo, "c2-carer");
  expect(srv.members.find((x) => x.user !== "U1")).toMatchObject({ family: "F1", role: "viewer" });
  expect(nana.errors).toEqual([]);
  await grace.close();
  await nanaCtx.close();
});

test("sign out of all devices sends other devices back to the welcome screen", async ({
  browser,
}, testInfo) => {
  const srv = seedServer(newServer());
  const tablet = await browser.newContext({ viewport: testInfo.project.use.viewport });
  const phone = await browser.newContext({ viewport: testInfo.project.use.viewport });
  await fakeApi(tablet, srv);
  await fakeApi(phone, srv);
  const t = await tablet.newPage();
  const p = await phone.newPage();
  await signIn(t, srv);
  await signIn(p, srv);
  await p.goto("/family/settings");
  await passGate(p);
  await p.getByRole("button", { name: "Sign out of all devices" }).click();
  await shot(p, testInfo, "c3-sign-out-all");
  await p.getByRole("button", { name: "Yes, sign out everywhere" }).click();
  await expect(p).toHaveURL(/\/start$/);
  expect(Object.keys(srv.sessions)).toEqual([]);
  // The tablet finds out on its next sync and returns to the welcome screen.
  await t.reload();
  await expect(t).toHaveURL(/\/start$/);
  await expect(t.getByRole("heading", { name: "Welcome to Trailbuddies!" })).toBeVisible();
  await tablet.close();
  await phone.close();
});

test("the plan's learner limit shows instead of the add form", async ({ page, context }, testInfo) => {
  const srv = seedServer(newServer(), { plan: "free" }); // Free: 1 learner, and Wanjiru exists
  await fakeApi(context, srv);
  await signIn(page, srv);
  await page.goto("/family/settings");
  await passGate(page);
  await expect(page.getByText("Free plan · learner profiles: up to 1")).toBeVisible();
  await page.goto("/start/learners");
  await passGate(page);
  await expect(page.getByText(/Learner profiles on your Free plan: 1 of 1/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add learner" })).toHaveCount(0);
  await noSideScroll(page);
  await shot(page, testInfo, "c4-limit");
});

test("grown-ups can hold a button for 3 seconds instead of doing the sum", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family");
  await page.getByRole("button", { name: "Hold for 3 seconds instead" }).click();
  const hold = page.getByRole("progressbar", { name: "Hold me" });
  await expect(hold).toBeVisible();
  await shot(page, testInfo, "c5-hold");
  // A short press isn't enough.
  await hold.hover();
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
  // Holding for 3 seconds opens it.
  await page.mouse.down();
  await page.waitForTimeout(3400);
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Hello, Grace" })).toBeVisible();
});

test("match pairs can be dragged as well as tapped", async ({ page }) => {
  await demo(page);
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: "Let's play!" }).click();
  // Answer until the match step.
  for (let i = 0; i < 6 && !(await page.locator('[data-side="l"]').first().isVisible()); i++) {
    await page.locator('[data-answer="yes"]').click();
    await expect(
      page.locator('[data-answer="yes"]').or(page.locator('[data-side="l"]').first()),
    ).toBeVisible();
    await page.waitForTimeout(1300);
  }
  const lefts = page.locator('[data-side="l"]');
  const n = await lefts.count();
  expect(n).toBeGreaterThanOrEqual(3); // 3–5 pairs
  const id = await lefts.first().getAttribute("data-pair");
  const from = await lefts.first().boundingBox();
  const to = await page.locator(`[data-side="r"][data-pair="${id}"]`).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(`[data-side="l"][data-pair="${id}"]`)).toHaveCSS("pointer-events", "none"); // locked
  // The rest by tap-tap.
  for (const other of await lefts.evaluateAll((els) => els.map((e) => e.getAttribute("data-pair")))) {
    if (other === id) continue;
    await page.locator(`[data-side="l"][data-pair="${other}"]`).click();
    await page.locator(`[data-side="r"][data-pair="${other}"]`).click();
  }
  await expect(page.getByRole("status")).toContainText(/Yes|right|Brilliant|got it|Great/);
});

test("sound files are served (and cached for offline)", async ({ request }) => {
  for (const name of ["right", "miss", "done"]) {
    const r = await request.get(`/sounds/${name}.wav`);
    expect(r.ok()).toBeTruthy();
    expect(r.headers()["content-type"]).toContain("audio");
  }
  expect(await (await request.get("/sw.js")).text()).toContain("/sounds/right.wav");
});
