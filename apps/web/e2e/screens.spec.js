import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { demo, passGate } from "./helpers.js";

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
  await expect(page.getByText("Who's playing today? Tap your picture!").first()).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "1-profiles");

  await page.getByRole("button", { name: /Zawadi/ }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await expect(page.getByText("Numbers Mountain").filter({ visible: true }).first()).toBeVisible();
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

  await page
    .getByRole("button", { name: /coming soon/ })
    .first()
    .click();
  await expect(page.getByText("This part of the trail is coming soon.")).toBeVisible();
});

test("a new learner meets the buddies, then starts at Numbers", async ({ page }, testInfo) => {
  await demo(page);
  await page.getByRole("button", { name: /Amani/ }).click(); // Amani has no buddy yet
  await expect(page).toHaveURL(/\/play\/buddies$/);
  await expect(page.getByRole("heading", { name: "Meet the buddies" })).toBeVisible();
  await page.getByRole("button", { name: "Say hello to Juma the elephant" }).click();
  await expect(page.locator('[data-mood="wave"]')).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "7-buddies");
  await page.getByRole("button", { name: "Pick Juma" }).click();
  await page.getByRole("button", { name: "Yes, Juma!" }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await expect(
    page
      .getByText(/Hi Amani! Let's start our trail together!/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Juma the elephant" }).filter({ visible: true }).first(),
  ).toHaveAttribute("data-mood", "point");
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
  await page.goto("/teach");
  await expect(page.getByRole("heading", { level: 1, name: "Good morning" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "6-teach");
  await demo(page);
  await page.goto("/play/more/room");
  await expect(page.getByRole("heading", { name: "Treasure room" }).first()).toBeVisible();
  await noSideScroll(page);
});

test("service worker and manifest are served", async ({ request }) => {
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBeTruthy();
  expect(await sw.text()).toContain("/play/trail/numbers");
  const m = await request.get("/manifest.webmanifest");
  expect((await m.json()).name).toBe("Trailbuddies");
});
