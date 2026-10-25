import { test, expect } from "@playwright/test";
import { demo, shot, watchErrors } from "./helpers.js";

// Painted nav icons (normal + selected) and the painted speaker on "hear it" buttons.
test("nav and speaker icons", async ({ page }, testInfo) => {
  watchErrors(page);
  await demo(page);
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  const nav = page.locator("nav").filter({ visible: true }).last();
  for (const n of ["games", "shop", "room", "badges", "wishes"]) {
    const img = nav.locator(`img[src="/icons/ui/${n}.webp"]`);
    await expect(img).toHaveCount(1);
    await expect.poll(() => img.evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
  }
  // The map's speak button is on tablet and web (the phone map has none).
  if (testInfo.project.name !== "phone") {
    const hear = page.getByRole("button", { name: "Hear it" }).filter({ visible: true }).first();
    await expect(hear.locator('img[src="/icons/ui/sound.webp"]')).toHaveCount(1);
  }
  await shot(page, testInfo, "ui-icons-map");

  // The page you're on shows the selected picture.
  await page.goto("/play/more/badges");
  await expect(nav.locator('img[src="/icons/ui/badges-on.webp"]')).toHaveCount(1);
  await expect(nav.locator('img[src="/icons/ui/games.webp"]')).toHaveCount(1);
  await shot(page, testInfo, "ui-icons-badges");
  expect(page.errors, "console errors").toEqual([]);
});
