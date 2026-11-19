import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { demo, passGate } from "./helpers.js";
import { fakeApi, newServer, seedServer } from "./fakeApi.js";

// Every Sprint 0 screen at phone, tablet and desktop: renders, no console errors,
// no sideways scrolling, and a screenshot for the pull request.
const shot = async (page, testInfo, name) => {
  mkdirSync("e2e/screenshots", { recursive: true });
  await page.waitForTimeout(700); // let entrance animations finish
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-${name}.png`, fullPage: false });
};
const noSideScroll = async (page) => {
  const [sw, cw] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(sw, "page scrolls sideways").toBeLessThanOrEqual(cw + 1);
};

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.errors = errors;
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

test("profile picker → map → numbers trail", async ({ page }, testInfo) => {
  await demo(page);
  await expect(page.getByRole("heading", { name: "Who's playing today?" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "1-profiles");

  await page.getByRole("button", { name: /Zawadi/ }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await expect(page.getByText("Numbers Mountain").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Change buddy" })).toHaveAttribute(
    "href",
    "/play/buddies",
  );
  await page.locator('main img[src="/art/world-valley.webp"]').first().evaluate((image) => image.decode());
  await page.locator("main a img").filter({ visible: true }).evaluateAll(async (images) => {
    await Promise.all(images.map((image) => image.decode()));
  });
  await noSideScroll(page);
  await shot(page, testInfo, "2-map");

  // Zawadi is a Sprout (can't read yet): the first tap says the place's name, the second opens it.
  const place = page
    .getByRole("link", { name: /Numbers Mountain/ })
    .filter({ visible: true })
    .first();
  await place.click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await place.click();
  await expect(page).toHaveURL(/\/play\/trail\/numbers$/);
  const next = page.getByRole("button", { name: "Lesson 3", exact: true });
  await expect(next).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "3-trail");

  await next.click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Meet 4 and 5" })).toBeVisible();
  await shot(page, testInfo, "4-lesson-dialog");
  await page.getByRole("button", { name: "Not now" }).click();

  // Sprint 6 drafts (shown outside production) fill the rest of the trail, locked until reached.
  // MAP-05: stones further down are mounted as the trail scrolls to them.
  const far = page.getByText("Number shapes 0 to 10 · locked");
  for (let i = 0; i < 30 && !(await far.isVisible()); i++) {
    await page.locator("[data-stones]").evaluate((el) => {
      el.parentElement.scrollBy(0, 400);
      window.scrollBy(0, 400);
    });
    await page.waitForTimeout(150);
  }
  await expect(far).toBeVisible();
});

test("a single learner gets a compact profile card", async ({ page, context }, testInfo) => {
  const srv = seedServer(newServer());
  await fakeApi(context, srv);
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill("grace@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).toHaveURL(/\/play$/);
  const profile = page.getByRole("button", { name: /Wanjiru/ });
  await expect(profile).toBeVisible();
  const bounds = await profile.boundingBox();
  expect(bounds.width).toBeLessThan(400);
  expect(bounds.height).toBeLessThan(260);
  await expect(page.getByRole("link", { name: "Grown-ups" })).toHaveAttribute("href", "/family");
  await noSideScroll(page);
  await shot(page, testInfo, "profile-picker-one-learner");
  await profile.click();
  await expect(page).toHaveURL(/\/play\/(map|buddies)$/);
});

test("a new learner meets the buddies, then starts at Numbers", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  // Headless Chrome may have no system voice. Drive the same speech events that a voice emits.
  await page.addInitScript(() => {
    let timers = [];
    speechSynthesis.cancel = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    speechSynthesis.speak = (line) => {
      timers = [
        setTimeout(() => line.onstart?.(), 40),
        setTimeout(() => line.onboundary?.({ charIndex: 7 }), 450),
        setTimeout(() => line.onend?.(), 1000),
      ];
    };
  });
  await page.goto("/start");
  for (const id of ["zip", "tumi", "jumbo", "kiki"])
    await expect(page.locator(`svg image[href="/buddy-picker/${id}.webp"]`).last()).toBeVisible();
  await page.getByRole("button", { name: "Try the demo family" }).click();
  await expect(page).toHaveURL(/\/play$/);
  await page.getByRole("button", { name: /Amani/ }).click(); // Amani has no buddy yet
  await expect(page).toHaveURL(/\/play\/buddies$/);
  await expect(page.getByRole("heading", { name: "Choose your buddy" })).toBeVisible();
  await page.getByRole("button", { name: "Jumbo, elephant" }).click();
  await page.getByRole("button", { name: "Say hello to Jumbo the elephant" }).click();
  const stage = page.locator(".buddy-motion-stage");
  await expect(stage).toHaveAttribute("data-speaking", "true");
  const talkingFrame = await stage.evaluate((canvas) => canvas.toDataURL());
  await expect.poll(() => stage.evaluate((canvas) => canvas.toDataURL())).not.toBe(talkingFrame);
  await expect(stage).not.toHaveAttribute("data-speaking", "true");
  await page.getByRole("button", { name: "Walk", exact: true }).click();
  const walk = page.locator('canvas[data-action="walk"]');
  await expect(walk).toHaveAttribute("data-motion-ready", "true");
  const firstFrame = await walk.evaluate((canvas) => canvas.toDataURL());
  await expect.poll(() => walk.evaluate((canvas) => canvas.toDataURL())).not.toBe(firstFrame);
  await page.getByRole("button", { name: "Wave", exact: true }).click();
  await expect(stage).toHaveAttribute("data-action", "wave");
  await expect(stage).toHaveAttribute("data-motion-ready", "true");
  const firstWaveFrame = await stage.evaluate((canvas) => canvas.toDataURL());
  await expect.poll(() => stage.evaluate((canvas) => canvas.toDataURL())).not.toBe(firstWaveFrame);
  await expect.poll(() => stage.getAttribute("data-blinking"), { intervals: [30], timeout: 7000 }).toBe("true");
  await noSideScroll(page);
  await shot(page, testInfo, "7-buddies");
  await page.getByRole("button", { name: "Pick Jumbo" }).click();
  await page.getByRole("button", { name: "Yes, Jumbo!" }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await expect(
    page
      .getByText(/Hi Amani! Let's start our trail together!/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Jumbo the elephant" }).filter({ visible: true }).first(),
  ).toHaveAttribute("data-mood", "point");
  await expect(page.locator('svg[data-mood="point"] image[href="/buddy-picker/jumbo.webp"]').first()).toBeAttached();
  await page.getByRole("link", { name: "Change buddy" }).click();
  await expect(page.getByRole("button", { name: "Jumbo, elephant" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Kiki, turtle" }).click();
  await page.getByRole("button", { name: "Pick Kiki" }).click();
  await page.getByRole("button", { name: "Yes, Kiki!" }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await page.reload();
  await expect(page.getByRole("img", { name: "Kiki the turtle" }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Change buddy" }).click();
  await expect(page.getByRole("button", { name: "Kiki, turtle" })).toHaveAttribute("aria-pressed", "true");
});

test("parent home", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family");
  await passGate(page);
  await expect(page.getByRole("heading", { name: "Hello, Grace" })).toBeVisible();
  await expect(page.getByText("Waiting for you")).toBeVisible();
  for (const name of ["Zawadi", "Amani", "Joseph"])
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await noSideScroll(page);
  // The content column fills the main area (no centred 1100px cap), like the prototype.
  const fill = await page.locator("main").evaluate((m) => {
    const cs = getComputedStyle(m);
    const inner = m.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return m.firstElementChild.getBoundingClientRect().width / inner;
  });
  expect(fill).toBeGreaterThan(0.99);
  await shot(page, testInfo, "5-family");
  await page.getByRole("link", { name: "Settings" }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/family\/settings$/);
  await expect(page.getByRole("heading", { name: "Difficulty" })).toBeVisible();
});

test("teacher and placeholder screens", async ({ page }, testInfo) => {
  // Teacher home is real since Sprint 9 (sprint9.spec.js); later teacher screens are placeholders.
  await demo(page);
  await page.goto("/teach/assign");
  await passGate(page);
  await expect(page.getByRole("heading", { level: 1, name: "Assign work" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "6-teach");
  await page.goto("/play/more/room");
  await expect(page.getByRole("heading", { name: "Treasure room" }).first()).toBeVisible();
  await noSideScroll(page);
});

test("service worker and manifest are served", async ({ request }) => {
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBeTruthy();
  expect(await sw.text()).toContain("/play/trail/numbers");
  const m = await request.get("/manifest.webmanifest");
  const manifest = await m.json();
  expect(manifest.name).toBe("Trailbuddies");
  // App icons: every size the manifest lists is served, including the maskable one.
  expect(manifest.icons.map((i) => i.purpose || "any")).toContain("maskable");
  for (const icon of [...manifest.icons, { src: "/favicon.ico" }, { src: "/icons/apple-touch-icon.png" }])
    expect((await request.get(icon.src)).ok(), icon.src).toBeTruthy();
});
