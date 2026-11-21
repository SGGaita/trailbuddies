import { expect, test } from "@playwright/test";
import { demo, watchErrors } from "./helpers.js";

// C01: "Who's playing today?" is asked in a recorded voice when the picker opens, and again
// from the speak button.
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/]);
  // Note what audio the page starts playing.
  await page.addInitScript(() => {
    globalThis.__played = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      globalThis.__played.push(new URL(this.src, location.href).pathname);
      return play.call(this);
    };
  });
});
const played = (page) => page.evaluate(() => globalThis.__played);
test.afterEach(({ page }) => expect(page.errors, "console errors").toEqual([]));

test("the welcome screen asks who's playing in a real voice", async ({ page }) => {
  await demo(page); // lands on the picker
  await expect(page.getByRole("heading", { name: "Who's playing today?" })).toBeVisible();
  await expect.poll(() => played(page)).toEqual(["/voice/who-is-playing.mp3"]);
  await page.getByRole("button", { name: "Hear it" }).click();
  await expect.poll(() => played(page)).toEqual(["/voice/who-is-playing.mp3", "/voice/who-is-playing.mp3"]);
});

test("with Voice off, the screen stays quiet", async ({ page }) => {
  await demo(page);
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("trailbuddies-family-v3"));
    raw.state.settings.voice = false;
    localStorage.setItem("trailbuddies-family-v3", JSON.stringify(raw));
  });
  await page.goto("/play");
  await expect(page.getByRole("heading", { name: "Who's playing today?" })).toBeVisible();
  await page.waitForTimeout(800);
  expect(await played(page)).toEqual([]);
});
