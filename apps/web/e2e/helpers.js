import { expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

export const shot = async (page, testInfo, name) => {
  mkdirSync("e2e/screenshots", { recursive: true });
  await page.waitForTimeout(700); // let entrance animations finish
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-${name}.png` });
};

export const noSideScroll = async (page) => {
  const [sw, cw] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(sw, "page scrolls sideways").toBeLessThanOrEqual(cw + 1);
};

/** Fail on console errors and uncaught exceptions. */
export function watchErrors(page, ignore = []) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (!ignore.some((re) => re.test(text))) errors.push(text);
  });
  page.errors = errors;
}

/** Load the demo family from the welcome screen. */
export async function demo(page) {
  await page.goto("/start");
  await page.getByRole("button", { name: "Try the demo family" }).click();
  await expect(page).toHaveURL(/\/play$/);
}

/** Answer the parent gate's sum (or type a PIN). */
export async function passGate(page, pin) {
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
  let answer = pin;
  if (!pin) {
    const q = await page.locator("[data-gate-question]").getAttribute("data-gate-question");
    const [a, b] = q.match(/\d+/g).map(Number);
    answer = String(a * b);
  }
  await page.keyboard.type(answer);
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toHaveCount(0);
}
