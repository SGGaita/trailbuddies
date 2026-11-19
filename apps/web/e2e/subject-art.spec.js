import { test, expect } from "@playwright/test";
import { demo, shot, noSideScroll, watchErrors } from "./helpers.js";

test.describe.configure({ timeout: 60_000 });

// Painted place art: on the world map, and as the trail header with tappable spots and a faint backdrop.
const PLACES = [
  {
    id: "numbers",
    file: "number-mountain",
    spots: ["Number one", "Number two", "Number three"],
  },
  {
    id: "language",
    file: "letter-forest",
    spots: ["Letter A", "Letter B", "Letter C", "Small letter a", "Small letter b"],
  },
  { id: "animals", file: "animal-safari", spots: ["Elephant", "Giraffe", "Zebra", "Sun"] },
  {
    id: "colours",
    file: "colour-garden",
    spots: ["Red", "Yellow", "Blue", "Green", "Purple", "Orange", "Rainbow"],
  },
  { id: "shapes", file: "shape-town", spots: ["Triangle", "Circle", "Square", "Rectangle", "Star"] },
];
// Family & Class Island has art on the map only (it has no trail).
const MAP_ONLY = ["family-island"];
const NEW_TRAILS = [
  { id: "time", file: "time-tower", unit: "clocks-and-my-day" },
  { id: "space", file: "space-station", unit: "my-first-space-mission" },
  { id: "feelings", file: "feelings-trail", unit: "meet-the-feelings" },
  { id: "weather", file: "weather-valley", unit: "watch-the-weather" },
];

test("place art on the map", async ({ page }) => {
  watchErrors(page);
  await demo(page);
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  for (const file of [...PLACES, ...NEW_TRAILS].map((p) => p.file).concat(MAP_ONLY)) {
    const art = page.locator(`img[src="/art/${file}-sm.webp"]`).filter({ visible: true });
    await expect(art).toHaveCount(1);
    await art.scrollIntoViewIfNeeded();
    await expect.poll(() => art.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await noSideScroll(page);
  expect(page.errors, "console errors").toEqual([]);
});

for (const trail of NEW_TRAILS)
  test(`${trail.file} opens its first lesson from the map`, async ({ page }, testInfo) => {
    watchErrors(page);
    await page.clock.setFixedTime(new Date("2026-11-19T12:00:00Z"));
    await demo(page);
    await page.getByRole("button", { name: /Zawadi/ }).click();
    await expect(page).toHaveURL(/\/play\/map$/);

    const destination = page.locator(`a[href="/play/trail/${trail.id}"]`).filter({ visible: true });
    if (trail.id === "time" && testInfo.project.name !== "phone") {
      await page.getByRole("link", { name: /More trails/ }).click();
      await expect(page).toHaveURL(/#more-trails$/);
      await shot(page, testInfo, "new-trails-map");
    }
    await destination.scrollIntoViewIfNeeded();
    await destination.click();
    await expect(page).toHaveURL(/\/play\/map(?:#more-trails)?$/); // The first tap names the place for Sprouts.
    await destination.click();
    await expect(page).toHaveURL(`/play/trail/${trail.id}`, { timeout: 15_000 });
    await page.getByRole("button", { name: "Lesson 1", exact: true }).click();
    await page.getByRole("button", { name: "Let's go!" }).click();
    await expect(page).toHaveURL(`/play/lesson/${trail.unit}/1`, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Let's play!" })).toBeVisible();
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
