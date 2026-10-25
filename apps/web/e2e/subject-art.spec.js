import { test, expect } from "@playwright/test";
import { demo, shot, noSideScroll, watchErrors } from "./helpers.js";

// Painted place art: on the world map, and as the trail header with tappable spots and a faint backdrop.
const PLACES = [
  {
    id: "numbers",
    file: "number-mountain",
    spots: ["Number five", "Number six", "Number seven", "Number eight", "Number ten"],
  },
  {
    id: "language",
    file: "letter-forest",
    spots: ["Letter A", "Letter B", "Letter C", "Small letter a", "Small letter b"],
  },
  { id: "animals", file: "animal-safari", spots: ["Elephant", "Giraffe", "Zebra"] },
];

test("place art on the map", async ({ page }) => {
  watchErrors(page);
  await demo(page);
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  for (const p of PLACES) {
    const art = page.locator(`img[src="/art/${p.file}-sm.webp"]`).filter({ visible: true });
    await expect(art).toHaveCount(1);
    await expect.poll(() => art.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await noSideScroll(page);
  expect(page.errors, "console errors").toEqual([]);
});

for (const p of PLACES)
  test(`${p.file} trail header`, async ({ page }, testInfo) => {
    watchErrors(page);
    await demo(page);
    await page.getByRole("button", { name: /Zawadi/ }).click();
    await expect(page).toHaveURL(/\/play\/map$/);
    await page.goto(`/play/trail/${p.id}`);
    for (const name of p.spots) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    const first = page.getByRole("button", { name: p.spots[0], exact: true });
    await first.scrollIntoViewIfNeeded();
    await first.click();
    expect((await first.boundingBox()).width).toBeGreaterThanOrEqual(48); // touch target
    await page.evaluate(() => window.scrollTo(0, 0));
    await noSideScroll(page);
    await shot(page, testInfo, `${p.file}-trail`);
    expect(page.errors, "console errors").toEqual([]);
  });
