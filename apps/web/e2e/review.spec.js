import { test, expect } from "@playwright/test";
import { shot, noSideScroll, watchErrors, demo } from "./helpers.js";

// Content review (CNT-04): outside production a grown-up can play any unit, locked or not,
// without saving anything, then mark it ready with `pnpm content unit:ready`.
test.beforeEach(async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

const eventCount = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("trailbuddies-demo");
        req.onsuccess = () => {
          const all = req.result.transaction("events").objectStore("events").count();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );

test("the review page opens any unit's lessons and saves nothing", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Review units" })).toBeVisible();
  const wild = page.locator('[data-unit="wild-animals"]');
  await expect(wild.getByText("pictures approved 0 of 8")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "review");
  const before = await eventCount(page);
  await wild.getByRole("link", { name: /^3\./ }).click();
  await expect(page).toHaveURL(/\/play\/go\?unit=wild-animals&step=3&preview=1/);
  await page.getByRole("button", { name: "Let's play!" }).click();
  await page.locator('[data-answer="yes"], [data-item]').first().waitFor();
  await page.getByRole("button", { name: "Stop the lesson" }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page).toHaveURL(/\/review$/);
  expect(await eventCount(page)).toBe(before);
});
