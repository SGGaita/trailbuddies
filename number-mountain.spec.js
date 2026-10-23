import { test, expect } from "@playwright/test";
import { demo, shot, noSideScroll, watchErrors } from "./helpers.js";

// Numbers Mountain artwork: on the map, as the trail header with tappable peaks, and behind the trail.
test("Numbers Mountain art on the map and trail", async ({ page }, testInfo) => {
  watchErrors(page);
  await demo(page);
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  const art = page.locator('img[src="/art/number-mountain-sm.webp"]').filter({ visible: true });
  await expect(art).toHaveCount(1);
  await expect.poll(() => art.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);

  await page.goto("/play/trail/numbers");
  const ten = page.getByRole("button", { name: "Number ten" });
  await expect(ten).toBeVisible();
  for (const n of ["five", "six", "seven", "eight"])
    await expect(page.getByRole("button", { name: `Number ${n}` })).toBeVisible();
  await ten.scrollIntoViewIfNeeded();
  await ten.click();
  const box = await ten.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(48); // touch target
  await page.evaluate(() => window.scrollTo(0, 0));
  await noSideScroll(page);
  await shot(page, testInfo, "number-mountain-trail");
  expect(page.errors, "console errors").toEqual([]);
});
