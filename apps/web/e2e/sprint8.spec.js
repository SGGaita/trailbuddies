import { test, expect } from "@playwright/test";
import { shot, noSideScroll, watchErrors, demo, passGate } from "./helpers.js";
import { newServer, fakeApi, seedServer } from "./fakeApi.js";

// Sprint 8: picture passwords (FAM-02), letter sounds (LES-19), help and support (HLP-01, HLP-02),
// the first-steps card (ONB-12), parent emails (PAR-07, BDG-06), the invitation log and resend
// (FAM-05) and a view-only carer (FAM-06), at phone, tablet and desktop.
test.describe.configure({ timeout: 150_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/, /ERR_INTERNET_DISCONNECTED/]);
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
  await expect(page).not.toHaveURL(/\/auth\/verify/);
}

async function settings(page) {
  await page.goto("/family/settings");
  await passGate(page);
}

const tap = async (page, pics) => {
  for (const p of pics) await page.locator(`[data-picture="${p}"]`).click();
};

test("a picture password keeps a profile closed until the right 3 pictures (FAM-02)", async ({
  page,
}, testInfo) => {
  await demo(page);
  await settings(page);
  const learners = page.getByRole("region", { name: "Learners" });
  await learners.getByRole("button", { name: "Set a picture password for Zawadi" }).click();
  const setup = page.getByRole("dialog");
  await expect(setup.getByRole("heading", { name: "Choose Zawadi's 3 pictures" })).toBeVisible();
  await tap(page, ["cat", "sun", "moon"]);
  await expect(setup.getByRole("heading", { name: "Now tap the same 3 again" })).toBeVisible();
  await shot(page, testInfo, "s8-picture-setup");
  await tap(page, ["cat", "sun", "moon"]);
  await expect(learners.getByText(/picture password on/)).toBeVisible();

  await page.goto("/play");
  await page.getByRole("button", { name: /Zawadi/ }).click();
  const lock = page.getByRole("dialog", { name: "Zawadi, tap your 3 pictures" });
  await expect(lock).toBeVisible();
  for (let i = 0; i < 3; i++) await tap(page, ["dog", "dog", "dog"]);
  await expect(lock.getByRole("status")).toHaveText(/hint/);
  await expect(page.locator('[data-picture="cat"]')).toHaveClass(/glow/);
  await noSideScroll(page);
  await shot(page, testInfo, "s8-picture-hint");
  await tap(page, ["cat", "sun", "moon"]);
  await expect(page).toHaveURL(/\/play\/map$/);

  // A grown-up turns it off again.
  await settings(page);
  await page.getByRole("button", { name: "Turn off Zawadi's picture password" }).click();
  await page.goto("/play");
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
});

test("letter sounds: record once, use the device voice again, and a blocked microphone (LES-19)", async ({
  page,
}, testInfo) => {
  await demo(page);
  await page.goto("/family/sounds");
  await passGate(page);
  await expect(page.getByText("0 of 36 recorded").first()).toBeVisible();
  await expect(page.locator("[data-sound]")).toHaveCount(36);
  const sh = page.locator('[data-sound="sh"]');
  await sh.getByRole("button", { name: "Record sh" }).click();
  await page.waitForTimeout(700);
  await sh.getByRole("button", { name: "Stop recording sh" }).click();
  await expect(sh.getByText("Your voice")).toBeVisible();
  await expect(page.getByText("1 of 36 recorded").first()).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("trailbuddies-family-v3")).state.sounds,
  );
  expect(Object.keys(saved)).toEqual(["sh"]);
  await noSideScroll(page);
  await shot(page, testInfo, "s8-letter-sounds");
  await sh.getByRole("button", { name: "Use the device voice for sh" }).click();
  await expect(sh.getByText("Device voice")).toBeVisible();
});

test("a blocked microphone explains how to allow it (LES-19)", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
  });
  await demo(page);
  await page.goto("/family/sounds");
  await passGate(page);
  await page.locator('[data-sound="a"]').getByRole("button", { name: "Record a" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The microphone is blocked" })).toBeVisible();
  await expect(page.locator('[data-sound="b"]').getByRole("button", { name: "Record b" })).toBeEnabled();
});

test("help: topics, search, the ? on a screen, and offline (HLP-01)", async ({ page, request }, testInfo) => {
  await demo(page);
  await page.goto("/family/help");
  await passGate(page);
  for (const topic of [
    "Getting started",
    "Lessons",
    "Rewards",
    "Privacy and safety",
    "Plans and billing",
    "Offline and devices",
  ])
    await expect(page.getByRole("region", { name: topic })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s8-help");
  await page.getByLabel("Search help").fill("grandma");
  await page.getByRole("link", { name: "Invite another parent or a carer" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Invite another parent or a carer" }),
  ).toBeVisible();
  await shot(page, testInfo, "s8-help-article");
  // The "?" on the Lesson Builder opens its article.
  await page.goto("/family/create");
  await passGate(page);
  await page.getByRole("link", { name: "Help: Make your own lesson" }).click();
  await expect(page).toHaveURL(/\/family\/help\/make-lesson$/);
  // The offline worker precaches every article.
  const sw = await (await request.get("/sw.js")).text();
  for (const p of [
    "/family/help",
    "/family/help/make-lesson",
    "/family/help/offline",
    "/family/help/contact",
  ])
    expect(sw).toContain(`"${p}"`);
});

test("contact support with diagnostics and no child data (HLP-02)", async ({ page, context }, testInfo) => {
  const srv = seedServer(newServer());
  await fakeApi(context, srv);
  await signIn(page, srv);
  await page.goto("/family/help/contact");
  await passGate(page);
  await page.getByLabel("Subject").fill("Sound stops");
  await page.getByLabel("Your message").fill("The lesson goes quiet after the second step.");
  await expect(page.getByTestId("diagnostics")).toContainText("App version");
  await expect(page.getByTestId("diagnostics")).not.toContainText("Wanjiru");
  await noSideScroll(page);
  await shot(page, testInfo, "s8-contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Your reference is TB-");
  const sent = srv.support[0];
  expect(Object.keys(sent.diagnostics).sort()).toEqual([
    "app_version",
    "device",
    "errors",
    "online",
    "release",
    "screen",
  ]);
  expect(JSON.stringify(sent)).not.toContain("Wanjiru");
});

test("the first-steps card after a first lesson, until dismissed (ONB-12)", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family");
  await passGate(page);
  const card = page.getByRole("region", { name: "First steps" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "Make a lesson" })).toHaveAttribute("href", "/family/create");
  await expect(card.getByText("Make a badge")).toBeVisible();
  await expect(card.getByText("coming soon").first()).toBeVisible();
  await shot(page, testInfo, "s8-first-steps");
  await card.getByRole("button", { name: "Don't show this again" }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await passGate(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "First steps" })).toHaveCount(0);
});

test("parents choose which emails they get (PAR-07, BDG-06)", async ({ page }) => {
  await demo(page);
  await settings(page);
  const emails = page.getByRole("region", { name: "Emails" });
  await expect(
    emails
      .getByRole("switch", { name: /Weekly badge email/ })
      .or(emails.getByRole("checkbox", { name: /Weekly badge email/ })),
  ).toBeChecked();
  const badges = emails
    .getByRole("switch", { name: /When a badge is earned/ })
    .or(emails.getByRole("checkbox", { name: /When a badge is earned/ }));
  await expect(badges).not.toBeChecked();
  await badges.click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("trailbuddies-family-v3")).state.settings.emails,
  );
  expect(saved).toEqual({ digest: true, badges: true, wishes: false });
});

test("invitations are logged, and an expired one can be resent (FAM-05)", async ({
  page,
  context,
  browser,
}, testInfo) => {
  const srv = seedServer(newServer());
  await fakeApi(context, srv);
  await signIn(page, srv);
  await settings(page);
  await page.getByLabel("Their email address").fill("tom@example.com");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("tom@example.com").first()).toBeVisible();
  const first = srv.sent.find((x) => x.kind === "invite").token;
  srv.invites[first].expired = true; // seven days pass
  await settings(page);
  const log = page.getByTestId("invite-log");
  await log.locator("summary").click();
  await expect(log.getByText("expired")).toBeVisible();
  await shot(page, testInfo, "s8-invite-log");
  await log.getByRole("button", { name: "Resend" }).click();
  await expect(log.getByText("waiting")).toBeVisible();
  const fresh = srv.sent.filter((x) => x.kind === "invite").at(-1).token;
  expect(fresh).not.toBe(first);
  const tom = await browser.newContext({ viewport: testInfo.project.use.viewport });
  await fakeApi(tom, srv);
  const tp = await tom.newPage();
  await tp.goto(`/invite?token=${encodeURIComponent(fresh)}`);
  await expect(tp).toHaveURL(/\/family$/);
  expect(srv.members.find((x) => x.user !== "U1")).toMatchObject({ role: "parent" });
  await tom.close();
});

test("a view-only carer sees progress but can't change or buy anything (FAM-06)", async ({
  page,
  context,
}, testInfo) => {
  const srv = seedServer(newServer());
  srv.users.U2 = { id: "U2", email: "nana@example.com", name: "Nana" };
  srv.members.push({ family: "F1", user: "U2", role: "viewer" });
  await fakeApi(context, srv);
  await signIn(page, srv, "nana@example.com");
  await page.goto("/family/progress");
  await passGate(page);
  await expect(page.getByText("Wanjiru").first()).toBeVisible();
  await settings(page);
  const learners = page.getByRole("region", { name: "Learners" });
  await expect(learners.getByRole("button", { name: "Edit Wanjiru" })).toBeDisabled();
  await expect(learners.getByRole("button", { name: "Remove Wanjiru?" })).toBeDisabled();
  await expect(
    page
      .getByRole("region", { name: "Emails" })
      .getByRole("switch")
      .first()
      .or(page.getByRole("region", { name: "Emails" }).getByRole("checkbox").first()),
  ).toBeDisabled();
  await shot(page, testInfo, "s8-viewer");
  await page.goto("/family/sounds");
  await passGate(page);
  await expect(page.locator(`[data-sound="a"]`).getByRole("button", { name: "Record a" })).toBeDisabled();
  // In the children's shop a carer's device can't spend treasures.
  await page.goto("/play");
  await page.getByRole("button", { name: /Wanjiru/ }).click();
  await page.goto("/play/more/shop");
  await page.getByRole("tab", { name: "Hats" }).click();
  await page
    .getByRole("button", { name: /^Try on/ })
    .first()
    .click();
  await expect(page.getByText("Ask a parent to buy this on their device.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Buy for/ })).toHaveCount(0);
});
