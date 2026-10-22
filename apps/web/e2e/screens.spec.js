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

test("a new learner starts at Numbers", async ({ page }) => {
  await demo(page);
  await page.getByRole("button", { name: /Amani/ }).click();
  await expect(
    page
      .getByText(/Let's start with Numbers/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
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
  await page.goto("/play/more/shop");
  await expect(page.getByRole("heading", { name: "Buddy shop" }).first()).toBeVisible();
  await noSideScroll(page);
});

test("service worker and manifest are served", async ({ request }) => {
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBeTruthy();
  expect(await sw.text()).toContain("/play/trail/numbers");
  const m = await request.get("/manifest.webmanifest");
  expect((await m.json()).name).toBe("Trailbuddies");
});
