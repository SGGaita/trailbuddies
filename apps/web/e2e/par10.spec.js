import { expect, test } from "@playwright/test";
import { demo, noSideScroll, passGate, settled, shot } from "./helpers.js";

// PAR-10: a grown-up changes the order of units in a trail for one child.
test.describe.configure({ timeout: 120_000 });

test("move 'Shapes around us' first for Amani; Zawadi keeps the standard order", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/progress/lessons");
  await passGate(page);
  await page.getByRole("link", { name: "Amani" }).click();
  await expect(page.getByRole("heading", { name: "Lessons for Amani" })).toBeVisible();
  const shapes = page.locator('[data-plan-trail="shapes"]');
  for (let i = 0; i < 3; i++) await shapes.getByRole("button", { name: "Move Shapes around us earlier" }).click();
  await expect(page.getByText("Shapes around us is now number 1 for Amani.")).toBeVisible();
  await expect(shapes.locator("[data-plan-unit]").first()).toHaveAttribute("data-plan-unit", "shapes-around-us");
  await expect(shapes.getByRole("button", { name: "Move Shapes around us earlier" })).toBeDisabled();
  await expect(shapes.getByRole("button", { name: "Standard order" })).toBeVisible();
  await settled(page);
  await noSideScroll(page);
  await shot(page, testInfo, "par10-order");

  // Amani's trail follows the order: Shapes around us comes first and is open.
  await page.getByRole("button", { name: "Open the learner app as Amani" }).click();
  await page.getByRole("button", { name: "Pick Zip" }).click();
  await page.getByRole("button", { name: "Yes, Zip!" }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  await page.goto("/play/trail/shapes");
  await expect(page.locator("[data-banner]").first()).toHaveAttribute("data-banner", "shapes-around-us");
  await expect(page.locator('[data-banner="shapes-around-us"]')).not.toContainText("locked");
  await expect(page.locator('[data-banner="circle-square-triangle"]')).toContainText("locked");
  await settled(page);
  await shot(page, testInfo, "par10-trail");

  // Zawadi keeps the standard order.
  await page.goto("/play");
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await page.goto("/play/trail/shapes");
  await expect(page.locator("[data-banner]").first()).toHaveAttribute("data-banner", "circle-square-triangle");

  // Back to the standard order for Amani.
  await page.goto("/family/progress/lessons");
  await passGate(page);
  await page.getByRole("link", { name: "Amani" }).click();
  await page.locator('[data-plan-trail="shapes"]').getByRole("button", { name: "Standard order" }).click();
  await expect(page.getByText("Shape Town is back in the standard order.")).toBeVisible();
  await expect(page.locator('[data-plan-trail="shapes"] [data-plan-unit]').first()).toHaveAttribute("data-plan-unit", "circle-square-triangle");
});
