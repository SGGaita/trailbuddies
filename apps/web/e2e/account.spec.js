import { test, expect } from "@playwright/test";
import { hashPin } from "@trailbuddies/domain";
import { newServer, fakeApi, seedServer } from "./fakeApi.js";
import { shot, noSideScroll, watchErrors, demo, passGate } from "./helpers.js";
import { PRAISE } from "./helpers.js";

// Sprint 2: sign-up, onboarding (all 7 steps), the parent gate, and sync across devices.
// Network status lines ("Failed to load resource") are expected when a test goes offline.
test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/]);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

/** Sign in by email: ask for a link, then open it as if tapped in the email. */
async function signIn(page, srv, email = "grace@example.com") {
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const { token } = srv.sent.at(-1);
  await page.goto(`/auth/verify?token=${encodeURIComponent(token)}`);
}

/** Answer every placement question correctly. */
/** Get the first unit's questions right (she can count to 5), then miss one. */
async function passCheck(page) {
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole("heading", { name: /Thank you/ }).isVisible()) return;
    await page.locator(i < 2 ? '[data-answer="yes"]' : '[data-answer="no"]').first().click();
    await page.waitForTimeout(150);
  }
}

test("a parent signs up, sets up the family in 7 steps and hands over", async ({
  page,
  context,
}, testInfo) => {
  const srv = newServer();
  await fakeApi(context, srv);

  await page.goto("/play");
  await expect(page).toHaveURL(/\/start$/); // nobody set up yet
  await expect(page.getByRole("heading", { name: "Welcome to Trailbuddies!" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "o1-welcome");
  await page.getByRole("button", { name: "I'm a parent or carer" }).click();

  await expect(page.getByRole("heading", { name: "Your grown-up account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0); // not configured
  await shot(page, testInfo, "o2-account");
  await signIn(page, srv);

  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
  await page.getByLabel("Your first name").fill("Grace");
  await shot(page, testInfo, "o3-about");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Before we start" })).toBeVisible();
  for (const h of ["What we keep", "Why", "How long we keep it", "Your rights", "What we never do"])
    await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
  const go = page.getByRole("button", { name: "Continue" });
  await expect(go).toBeDisabled();
  await page.getByLabel(/I'm this child's parent or legal guardian/).check();
  await noSideScroll(page);
  await shot(page, testInfo, "o4-consent");
  await go.click();
  expect(srv.consents.F1.scopes.progress).toBe(true);

  await expect(page.getByRole("heading", { name: "Who's learning?" })).toBeVisible();
  const addChild = async (name, month, year) => {
    await page.getByLabel("First name or nickname").fill(name);
    await page.getByLabel("Birth month").click();
    await page.getByRole("option", { name: month }).click();
    await page.getByLabel("Birth year").click();
    await page.getByRole("option", { name: year, exact: true }).click();
    await page.getByRole("button", { name: "Add learner" }).click();
  };
  // A full name: only the first name is kept, and the form says so.
  await page.getByLabel("First name or nickname").fill("Wanjiru Kamau");
  await expect(page.getByText(`We'll only keep "Wanjiru"`)).toBeVisible();
  await addChild("Wanjiru Kamau", "June", "2020");
  await expect(page.getByText("Wanjiru", { exact: true })).toBeVisible();
  await expect(page.getByText("Age 6 · sprout")).toBeVisible();
  await page.getByRole("button", { name: "Add me too" }).click();
  await expect(page.getByLabel("First name or nickname")).toHaveValue("Grace");
  await addChild("Grace", "April", "1985");
  await expect(page.getByText("Adult learner")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "o5-learners");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "What do they love?" })).toBeVisible();
  const wanjiru = page.getByRole("region", { name: "Wanjiru" });
  await wanjiru.getByRole("button", { name: /Animals/ }).click();
  await expect(wanjiru.getByRole("button", { name: /Animals/ })).toHaveAttribute("aria-pressed", "true");
  await shot(page, testInfo, "o6-interests");
  await wanjiru.getByRole("link", { name: "Start the check" }).first().click();
  await expect(page).toHaveURL(/\/start\/check/);
  await shot(page, testInfo, "o7-check");
  await passCheck(page);
  await expect(page.getByText("Starts at: Counting 6 to 10")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("region", { name: "Wanjiru" }).getByText("Starts at: Counting 6 to 10"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Family settings" })).toBeVisible();
  await page.getByRole("group", { name: "Daily goal" }).getByRole("button", { name: "3" }).click();
  await page.getByRole("button", { name: "Set a PIN" }).click(); // suggested: Grace is over 8
  await page.getByLabel("New 4-digit PIN").fill("1234");
  await page.getByRole("button", { name: "Save PIN" }).click();
  await expect(page.getByText("That PIN is too easy to guess")).toBeVisible();
  await page.getByLabel("New 4-digit PIN").fill("2580");
  await page.getByRole("button", { name: "Save PIN" }).click();
  await expect(page.getByText("A PIN is set.")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "o8-settings");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Hand over to Wanjiru" })).toBeVisible();
  await page.getByRole("radio", { name: "Tumi the owl" }).click();
  await shot(page, testInfo, "o9-handover");
  await page.getByRole("button", { name: "Start Wanjiru's first lesson" }).click();
  // The check placed her at Counting 6 to 10.
  await expect(page).toHaveURL(/\/play\/lesson\/counting-6-10\/1$/);
  await expect(page.getByRole("button", { name: "Let's play!" })).toBeVisible();

  // Everything reached the server; the PIN itself never did.
  await expect.poll(() => Object.values(srv.learners).length).toBe(2);
  const w = Object.values(srv.learners).find((l) => l.name === "Wanjiru");
  expect(w).toMatchObject({
    birth_year: 2020,
    birth_month: 6,
    buddy: "tumi",
    interests: ["animals"],
    placement: { numbers: "counting-6-10" },
  });
  expect(Object.keys(w).sort()).toEqual(
    [
      "avatar_color",
      "birth_month",
      "birth_year",
      "buddy",
      "difficulty",
      "family_id",
      "id",
      "interests",
      "levels",
      "name",
      "outfit",
      "placement",
      "updated_at",
      "wish",
    ].sort(),
  );
  await expect.poll(() => srv.families.F1.settings.goal).toBe(3);
  expect(srv.families.F1.pin.hash).toBeTruthy();
  expect(JSON.stringify(srv.families.F1)).not.toContain("2580");
});

test("a second device signs in and gets the family and its progress", async ({ page, context }, testInfo) => {
  const srv = seedServer(newServer());
  await fakeApi(context, srv);
  await page.goto("/start");
  await page.getByRole("button", { name: "I already have an account" }).click();
  await signIn(page, srv);
  await expect(page).toHaveURL(/\/play$/);
  await page.getByRole("button", { name: /Wanjiru/ }).click();
  await page.goto("/play/trail/numbers");
  await expect(page.getByRole("button", { name: "Lesson 1, 3 stars" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "d1-second-device");

  // Play a lesson here: it reaches the server.
  await page.goto("/play/lesson/counting-1-5/2");
  await page.getByRole("button", { name: "Stop the lesson" }).waitFor();
  await page.locator('[data-answer="yes"], [data-side="l"], [data-order]').first().waitFor();
  const before = srv.events.length;
  // Finish whatever the first step is, so there is an answer to save.
  const tile = page.locator('[data-answer="yes"]');
  const left = page.locator('[data-side="l"]');
  if (await tile.isVisible()) await tile.click();
  else if (await left.first().isVisible()) {
    for (const id of await left.evaluateAll((els) => els.map((e) => e.getAttribute("data-pair")))) {
      await page.locator(`[data-side="l"][data-pair="${id}"]`).click();
      await page.locator(`[data-side="r"][data-pair="${id}"]`).click();
    }
  } else {
    const n = await page.locator("[data-order]").count();
    for (let k = 0; k < n; k++) await page.locator(`[data-order="${k}"]`).click();
  }
  await expect(page.getByRole("status")).toContainText(PRAISE);
  await page.getByRole("button", { name: "Stop the lesson" }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect.poll(() => srv.events.length, { timeout: 10_000 }).toBeGreaterThan(before);
});

test("the PIN guards the grown-up zone, with a lock-out after 5 wrong tries", async ({
  page,
  context,
}, testInfo) => {
  const srv = seedServer(newServer(), { pin: await hashPin("2580") });
  await fakeApi(context, srv);
  await page.goto("/start/account");
  await signIn(page, srv);
  await expect(page).toHaveURL(/\/play$/);
  await page.goto("/family");
  await expect(page.getByText("Enter your grown-up PIN.")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "g1-pin");
  const box = page.getByRole("textbox", { name: "Grown-up PIN" });
  for (let i = 0; i < 5; i++) {
    await page.keyboard.type("1111");
    await expect(box).toHaveText("••••");
    await page.getByRole("button", { name: "Open" }).click();
    await expect(box).toHaveText(""); // checked (slowly, on purpose) and cleared
  }
  await expect(page.getByText("Too many tries. Try again in a minute.")).toBeVisible();
  await expect(page.getByRole("button", { name: "5" })).toBeDisabled();
  await page.reload();
  await passGate(page, "2580");
  await expect(page.getByRole("heading", { name: "Hello, Grace" })).toBeVisible();
  // Going back to the children locks it again.
  await page.goto("/play");
  await page.goto("/family");
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
});

test("offline: progress waits on the device and is saved when back online", async ({ page, context }) => {
  const srv = seedServer(newServer());
  await fakeApi(context, srv);
  await page.goto("/start/account");
  await signIn(page, srv);
  await page.getByRole("button", { name: /Wanjiru/ }).click();
  srv.offline = true;
  const before = srv.events.length;
  await page.goto("/play/lesson/counting-1-5/2");
  await page.locator('[data-answer="yes"], [data-side="l"], [data-order]').first().waitFor();
  // Answer whatever the first step is, so there is something to save.
  const tile = page.locator('[data-answer="yes"]');
  const left = page.locator('[data-side="l"]');
  if (await tile.isVisible()) await tile.click();
  else if (await left.first().isVisible()) {
    const id = await left.first().getAttribute("data-pair");
    await left.first().click();
    await page.locator(`[data-side="r"][data-pair="${id}"]`).click();
  } else await page.locator('[data-order="0"]').click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Stop the lesson" }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.goto("/family/settings");
  await passGate(page);
  await expect(page.getByText(/Offline\./)).toBeVisible({ timeout: 10_000 });
  expect(srv.events.length).toBe(before);
  srv.offline = false;
  await page.getByRole("button", { name: "↻" }).click();
  await expect(page.getByText("Saved to your account")).toBeVisible();
  await expect.poll(() => srv.events.length).toBeGreaterThan(before);
});

test("the screen-time limit rests the trail", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/settings");
  await passGate(page);
  await page
    .getByRole("group", { name: "Screen-time limit" })
    .getByRole("button", { name: "10 min" })
    .click();
  await page.goto("/play");
  await page.getByRole("button", { name: /Zawadi/ }).click(); // 12 minutes today
  await expect(page.getByRole("heading", { name: "Time for a rest!" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "r1-rest");
  await page.goto("/play");
  await page.getByRole("button", { name: /Joseph/ }).click(); // adults aren't limited
  await expect(page.getByRole("heading", { name: "Time for a rest!" })).toHaveCount(0);
});
