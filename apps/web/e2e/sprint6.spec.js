import { test, expect } from "@playwright/test";
import { shot, noSideScroll, watchErrors, demo, passGate } from "./helpers.js";
import { newServer, fakeApi, seedServer } from "./fakeApi.js";

// Sprint 6: content and offline. New subjects with drawn pictures, "Show what you know",
// level locks, calm mode and captions, stretch breaks, lesson settings and card extras,
// country rules, devices and downloaded content packs, at phone, tablet and desktop.
test.describe.configure({ timeout: 150_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/, /ERR_INTERNET_DISCONNECTED/]);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

const DONE = /Lesson done!/;

async function as(page, name, { fresh = true } = {}) {
  if (fresh) await demo(page);
  await page.goto("/play");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
}

async function signIn(page, srv) {
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill("grace@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).toHaveURL(/\/play$/);
}

/** Answer whatever step is showing (tb_e2e marks the answers). */
async function answerStep(page) {
  if (await page.getByRole("heading", { level: 1, name: DONE }).isVisible()) return "done";
  const go = page.getByRole("button", { name: "Let's play!" });
  if (await go.isVisible()) return go.click().then(() => "intro");
  if (await page.locator('[data-answer="yes"]').isVisible())
    return page
      .locator('[data-answer="yes"]')
      .click()
      .then(() => "choice");
  if (await page.locator("[data-home]").first().isVisible()) {
    const n = await page.locator("[data-home]").count();
    for (let i = 0; i < n; i++) {
      const p = page.locator("[data-home]").first();
      const cell = await p.getAttribute("data-home");
      await p.click();
      await page.locator(`[data-cell="${cell}"]`).click();
    }
    return "jigsaw";
  }
  if (await page.locator('[data-side="l"]').first().isVisible()) {
    for (const id of await page
      .locator('[data-side="l"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-pair")))) {
      await page.locator(`[data-side="l"][data-pair="${id}"]`).click();
      await page.locator(`[data-side="r"][data-pair="${id}"]`).click();
    }
    return "match";
  }
  if (await page.locator("[data-item]").first().isVisible()) {
    for (const [id, bin] of await page
      .locator("[data-item]")
      .evaluateAll((els) => els.map((e) => [e.getAttribute("data-item"), e.getAttribute("data-bin")]))) {
      await page.locator(`[data-item="${id}"]`).click();
      await page.locator(`[data-binid="${bin}"]`).click();
    }
    return "sort";
  }
  return "waiting";
}

async function playThrough(page, { stopAfter } = {}) {
  for (let i = 0; i < 80; i++) {
    const kind = await answerStep(page);
    if (kind === "done") return;
    if (kind !== "waiting") {
      if (stopAfter && kind === stopAfter) return;
      const next = page.getByRole("button", { name: /Next/ });
      await next.click({ timeout: 4000 }).catch(() => {});
    }
    await page.waitForTimeout(250);
  }
  throw new Error("lesson did not finish");
}


test("Colours: a new subject with pictures drawn in code (CNT-04)", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/trail/colours");
  await expect(page.getByText("New here? Show what you already know and skip ahead.")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s6-colours-trail");
  await page.goto("/play/lesson/red-yellow-blue/1");
  await expect(page.getByRole("button", { name: "Let's play!" })).toBeVisible();
  // The colour swatches are drawn, not emoji.
  await expect(page.locator("main svg path[fill='#E53935']").first()).toBeVisible();
  await shot(page, testInfo, "s6-colours-intro");
  await playThrough(page);
  await expect(page.getByRole("heading", { level: 1, name: DONE })).toBeVisible();
});

test("Shapes: a first lesson with drawn shapes", async ({ page }, testInfo) => {
  await as(page, "Joseph");
  await page.goto("/play/lesson/circle-square-triangle/1");
  await expect(page.locator("main svg circle[fill='#E53935']").first()).toBeVisible();
  await shot(page, testInfo, "s6-shapes");
  await playThrough(page);
  await expect(page.getByRole("heading", { level: 1, name: DONE })).toBeVisible();
});

test("Show what you know: units passed show bronze stars (ADP-05)", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/trail/shapes");
  await page.getByRole("button", { name: "Show what you know" }).first().click();
  await expect(page).toHaveURL(/\/play\/placement\?/);
  await shot(page, testInfo, "s6-placement");
  // Get the first unit's questions right, then miss one: the quiz stops there.
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-answer="yes"]').click();
    await page.waitForTimeout(400);
  }
  await page.locator('[data-answer="no"]').first().click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/play\/trail\/shapes$/);
  await expect(page.getByRole("button", { name: /skipped, bronze star/ }).first()).toBeVisible();
  await expect(page.getByText("New here? Show what you already know")).toHaveCount(0);
  await shot(page, testInfo, "s6-bronze");
});

test("a grown-up locks one subject's level (ADP-02)", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/settings");
  await passGate(page);
  await page.getByRole("group", { name: "Subject levels for Zawadi" }).getByRole("combobox", { name: "Numbers" }).click();
  await page.getByRole("option", { name: "Locked: easier" }).click();
  await expect(page.getByText(/Numbers: Now: Level 1/).first()).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s6-locks");
  await as(page, "Zawadi", { fresh: false });
  await page.goto("/play/lesson/counting-1-5/3");
  await page.getByRole("button", { name: "Let's play!" }).click();
  await expect(page.locator("[data-answer]").first()).toBeVisible();
  await expect(page.locator("[data-answer]")).toHaveCount(2); // level 1: 2 choices
});

test("calm mode and captions (ACC-02, ACC-03)", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/settings");
  await passGate(page);
  await expect(page.getByRole("switch", { name: "Captions" }).or(page.getByRole("checkbox", { name: "Captions" }))).toBeChecked();
  await page.getByRole("group", { name: "Calm mode" }).getByRole("button", { name: "On" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-calm", "1");
  await as(page, "Zawadi", { fresh: false });
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: /Hear it again/ }).first().click();
  await expect(page.getByTestId("caption")).toBeVisible();
  await shot(page, testInfo, "s6-caption");
  // A celebration is a short fade, not a bounce.
  const anim = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "starpop";
    document.body.append(el);
    return getComputedStyle(el).animationName;
  });
  expect(anim).toBe("calmfade");
});

test("a stretch break after a lesson once enough play has passed (PAR-04)", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/settings");
  await passGate(page);
  await page.getByRole("group", { name: "Stretch breaks" }).getByRole("button", { name: "10" }).click();
  await as(page, "Zawadi", { fresh: false }); // she has played 12 minutes today
  await page.goto("/play/lesson/counting-1-5/1");
  await playThrough(page);
  // Her first badge celebrates first; the stretch follows.
  const badge = page.getByRole("dialog", { name: "New badge!" });
  await expect(badge).toBeVisible({ timeout: 6000 });
  for (let i = 0; i < 20 && (await badge.isVisible()); i++) {
    await badge.getByRole("button").click();
    await page.waitForTimeout(900);
  }
  const stretch = page.getByRole("dialog", { name: "Stretch time!" });
  await expect(stretch).toBeVisible({ timeout: 8000 });
  await noSideScroll(page);
  await shot(page, testInfo, "s6-stretch");
  await expect(page.getByRole("button", { name: "Back to playing" })).toBeVisible({ timeout: 35_000 });
  await page.getByRole("button", { name: "Back to playing" }).click();
  await expect(stretch).toHaveCount(0);
});

test("lesson settings and card numbers (BLD-03, BLD-06)", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/create/lesson");
  await passGate(page);
  await page.getByLabel("Lesson name").fill("Counting fruit");
  for (const [q, name, n] of [["banana", "Bananas", 3], ["apple", "Apples", 2], ["orange", "Oranges", 4]]) {
    await page.getByRole("button", { name: "Add a card" }).click();
    await page.getByRole("button", { name: "Picture" }).click();
    await page.getByLabel("Search pictures").fill(q);
    await page.getByRole("button", { name: q, exact: true }).click();
    await page.getByLabel("Name on the card").fill(name);
    await page.getByLabel("How many? (optional)").fill(String(n));
    await page.getByRole("button", { name: "Save card" }).click();
  }
  await page.getByRole("button", { name: "Next: choose a game" }).click();
  const settings = page.getByRole("region", { name: "Lesson settings" });
  await settings.getByRole("group", { name: "Age band" }).getByRole("button", { name: /Seedling/ }).click();
  await settings.getByRole("group", { name: "Activities" }).getByRole("button", { name: "5", exact: true }).click();
  await settings.getByRole("group", { name: "Hints" }).getByRole("button", { name: "Just try again" }).click();
  await settings.getByRole("group", { name: "Games these cards unlock" }).getByRole("button", { name: "Jigsaw" }).click();
  await noSideScroll(page);
  await shot(page, testInfo, "s6-lesson-settings");
  await page.getByRole("button", { name: "Zawadi" }).click();
  await page.getByRole("button", { name: /Publish to Zawadi/ }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("trailbuddies-family-v3")).state.lessons.find((l) => l.title === "Counting fruit"),
  );
  expect(saved.options).toEqual({ band: "seedling", activities: 5, hints: "none", games: ["memory"] });
  expect(saved.cards.map((c) => c.number)).toEqual([3, 2, 4]);
  // The cards play in Memory flip (switched on) but not Jigsaw (switched off).
  await as(page, "Zawadi", { fresh: false });
  await page.goto("/play/more/games");
  await expect(page.getByRole("link", { name: /Counting fruit, From your family/ })).toBeVisible();
  await page.getByRole("radio", { name: /Jigsaw/ }).click();
  await expect(page.getByRole("link", { name: /Counting fruit/ })).toHaveCount(0);
});

test("country rules, devices and Google (ONB-05, FAM-08, ONB-03)", async ({ browser }, testInfo) => {
  const srv = seedServer(newServer(), { plan: "free" });
  const ctx = await browser.newContext({ viewport: testInfo.project.use.viewport });
  await fakeApi(ctx, srv);
  const page = await ctx.newPage();
  watchErrors(page, [/Failed to load resource/]);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
  await signIn(page, srv);
  // Two more devices: a phone and a tablet.
  for (const ua of [
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1",
  ]) {
    const other = await browser.newContext({ userAgent: ua });
    await fakeApi(other, srv);
    const p = await other.newPage();
    await signIn(p, srv);
    await other.close();
  }
  await page.goto("/family/settings");
  await passGate(page);
  const devices = page.getByRole("region", { name: "Devices" });
  await expect(devices.getByText("You're signed in on 3 devices and your plan allows 2.")).toBeVisible();
  await expect(devices.getByText("Chrome on Android")).toBeVisible();
  await expect(devices.getByText("This device")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s6-devices");
  await devices.getByRole("button", { name: "Sign out" }).first().click();
  await expect(devices.getByText(/You're signed in on/)).toHaveCount(0);
  expect(Object.keys(srv.sessions)).toHaveLength(2);

  // Country: Kenya's rules, then the UK's, which asks for consent again.
  const country = page.getByRole("region", { name: "Country" });
  await expect(country.getByTestId("country-rules")).toContainText("24/10/2026");
  await expect(country.getByTestId("country-rules")).toContainText("KES");
  await country.getByLabel("Country").click();
  await page.getByRole("option", { name: "United States" }).click();
  await expect(country.getByTestId("country-rules")).toContainText("10/24/2026");
  await expect(country.getByText(/asked to agree again/)).toBeVisible();
  await shot(page, testInfo, "s6-country");
  await country.getByRole("button", { name: "Save country" }).click();
  await expect(page).toHaveURL(/\/start\/consent$/);
  await page.getByLabel(/I'm this child's parent or legal guardian/).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).not.toHaveURL(/\/start\/consent$/);
  expect(srv.families.F1.country).toBe("US");
  expect(srv.consents.F1.region).toBe("us-coppa");
  await ctx.close();
});

test("content packs download and update lessons on the next launch (CNT-02, OFF-02)", async ({ page, context }, testInfo) => {
  const srv = seedServer(newServer());
  const unit = (await import("../../../packages/content/src/units/numbers/counting-1-5.json", { with: { type: "json" } })).default;
  const changed = structuredClone(unit);
  changed.lessons[0].title = "Meet one, two and three (updated)";
  const file = "numbers.0123456789abcdef.json";
  srv.packs[file] = {
    schema: "pack/1",
    subject: { id: "numbers", units: [{ id: "counting-1-5", title: "Counting 1 to 5", band: "seedling", status: "ready", lessons: 6 }] },
    units: [changed],
    release: "2027.03.1",
    hash: "0123456789abcdef",
  };
  srv.manifest.preview = {
    schema: "packs/1",
    release: "2027.03.1",
    channel: "preview",
    packs: [{ subject: "numbers", hash: "0123456789abcdef", bytes: 9000, file, units: ["counting-1-5"] }],
  };
  await fakeApi(context, srv);
  await signIn(page, srv);
  await page.goto("/family/settings");
  await passGate(page);
  const offline = page.getByRole("region", { name: "Play without internet" });
  await expect(offline.getByText("✓ Numbers")).toBeVisible({ timeout: 10_000 });
  await shot(page, testInfo, "s6-offline");
  // Next launch: the downloaded pack is used.
  await page.goto("/play");
  await page.getByRole("button", { name: /Wanjiru/ }).click();
  await page.goto("/play/trail/numbers");
  await page.getByRole("button", { name: /^Lesson 1/ }).first().click();
  await expect(page.getByRole("heading", { name: "Meet one, two and three (updated)" })).toBeVisible();
});
