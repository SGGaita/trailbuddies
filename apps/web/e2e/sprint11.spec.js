import { expect, test } from "@playwright/test";
import { demo, noSideScroll, passGate } from "./helpers.js";

test("Badge Studio previews and restores a parent's local draft", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install();
  await demo(page);
  await page.goto("/family");
  await passGate(page);
  await page.getByRole("link", { name: "Make a badge" }).click();

  const name = page.getByRole("textbox", { name: "Badge name" });
  const preview = page.getByRole("figure", { name: "Badge preview" });
  const diamond = page.getByRole("button", { name: "Diamond" });
  const green = page.getByRole("button", { name: "Green" });
  const plant = page.getByRole("button", { name: "Plant" });
  await name.fill("Garden Helper");
  await diamond.click();
  await green.click();
  await plant.click();
  await expect(preview).toContainText("Garden Helper");
  await expect(preview).toContainText("🌱");
  await expect(preview.locator("[aria-hidden=true]").first()).toHaveCSS(
    "clip-path",
    "polygon(50% 0px, 100% 50%, 50% 100%, 0px 50%)",
  );
  await noSideScroll(page);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();

  await page.reload();
  await expect(name).toHaveValue("Garden Helper");
  for (const option of [diamond, green, plant]) await expect(option).toHaveAttribute("aria-pressed", "true");
  await page.clock.fastForward(10 * 60_000);
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
  await passGate(page);
  await page.goto("/play");
  await page.getByRole("link", { name: "Grown-ups" }).click();
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
});
