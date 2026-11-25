import { expect, test } from "@playwright/test";
import { demo, noSideScroll, passGate, settled, shot } from "./helpers.js";

// PAR-09: a grown-up hides a trail or unit, or skips a lesson, for one child only.
test.describe.configure({ timeout: 120_000 });

test("hide Letter Forest for Amani and skip a lesson for Zawadi; others keep the standard trail", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/progress");
  await passGate(page);
  await page.getByRole("link", { name: "Amani" }).click();
  await page.getByRole("link", { name: "Choose lessons for Amani" }).click();
  await expect(page.getByRole("heading", { name: "Lessons for Amani" })).toBeVisible();
  await page.getByRole("switch", { name: "Show Letter Forest to Amani" }).click();
  await expect(page.getByText("Letter Forest is hidden for Amani.")).toBeVisible();

  // Zawadi (lessons 1 and 2 done): skip lesson 3 of Counting 1 to 5.
  await page.getByRole("link", { name: "Zawadi" }).click();
  await expect(page.getByRole("heading", { name: "Lessons for Zawadi" })).toBeVisible();
  const counting = page.locator('[data-plan-unit="counting-1-5"]');
  await counting.getByRole("button", { name: "Skip lesson 3 of Counting 1 to 5" }).click();
  await expect(page.getByText("Skipped. The next lesson opens", { exact: false })).toBeVisible();
  await expect(counting.getByRole("button", { name: "Undo skipping lesson 3 of Counting 1 to 5" })).toHaveAttribute("aria-pressed", "true");
  await settled(page);
  await noSideScroll(page);
  await shot(page, testInfo, "par09-lessons");

  // Zawadi's trail: lesson 3 shows skipped, without stars, and lesson 4 is next.
  await page.getByRole("button", { name: "Open the learner app as Zawadi" }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await expect(page.getByText("Letter Forest").filter({ visible: true }).first()).toBeVisible(); // only hidden for Amani
  await page.goto("/play/trail/numbers");
  const stones = page.locator('[data-unit="counting-1-5"]');
  await expect(stones.getByText("Skipped")).toHaveCount(1);
  await expect(stones.filter({ hasText: "Skipped" })).toHaveAccessibleName(/^Lesson 3.*skipped by a grown-up/);
  await expect(stones.filter({ hasText: "Start" })).toHaveAccessibleName(/^Lesson 4/);
  await settled(page);
  await shot(page, testInfo, "par09-trail");

  // Amani doesn't see Letter Forest, even from an old link.
  await page.goto("/family/progress/lessons");
  await passGate(page);
  await page.getByRole("link", { name: "Amani" }).click();
  await page.getByRole("button", { name: "Open the learner app as Amani" }).click();
  // Amani is new: she picks her buddy first.
  await page.getByRole("button", { name: "Pick Zip" }).click();
  await page.getByRole("button", { name: "Yes, Zip!" }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await expect(page.getByText("Numbers Mountain").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Letter Forest").filter({ visible: true })).toHaveCount(0);
  await page.goto("/play/trail/language");
  await expect(page).toHaveURL(/\/play\/map$/);

  // Undo: back to the standard trail.
  await page.goto("/family/progress/lessons");
  await passGate(page);
  await page.getByRole("link", { name: "Zawadi" }).click();
  await page.getByRole("button", { name: "Back to the standard trail" }).click();
  await expect(page.getByText("Zawadi has the standard trail again.")).toBeVisible();
  await expect(page.locator('[data-plan-unit="counting-1-5"]').getByRole("button", { name: "Skip lesson 3 of Counting 1 to 5" })).toHaveAttribute("aria-pressed", "false");
});
