import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { demo, passGate } from "./helpers.js";

// Sprint 1: whole lessons played end to end at phone, tablet and desktop.
// `tb_e2e` makes exercises mark answers with data attributes (never set in normal use).
const shot = async (page, testInfo, name) => {
  mkdirSync("e2e/screenshots", { recursive: true });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-${name}.png` });
};
const noSideScroll = async (page) => {
  const [sw, cw] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(sw, "page scrolls sideways").toBeLessThanOrEqual(cw + 1);
};

// Whole lessons take a while: each right answer shows praise for about a second.
test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.errors = errors;
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
  if (process.env.DBG) console.log("ERRS", page.errors);
});

/** Pick a learner on the profile screen. */
async function as(page, name, { fresh = true } = {}) {
  if (fresh) await demo(page);
  await page.goto("/play");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
}

const DONE = /Lesson done!|Trophy won!|Practice done!/;

/** Answer every step correctly until the complete screen shows. Screenshots the first of each type. */
async function playThrough(page, testInfo, prefix, { stopAt } = {}) {
  const seen = new Set();
  for (let guard = 0; guard < 40; guard++) {
    if (await page.getByRole("heading", { level: 1, name: DONE }).isVisible()) return;
    const letsPlay = page.getByRole("button", { name: "Let's play!" });
    const answerTile = page.locator('[data-answer="yes"]');
    const pairs = page.locator('[data-side="l"]');
    const order = page.locator("[data-order]");
    // Wait for the next step to be on screen.
    await expect(
      letsPlay
        .or(answerTile)
        .or(pairs.first())
        .or(order.first())
        .or(page.getByRole("heading", { level: 1, name: DONE })),
    ).toBeVisible();
    const kind = (await letsPlay.isVisible())
      ? "intro"
      : (await answerTile.isVisible())
        ? "choice"
        : (await pairs.first().isVisible())
          ? "match"
          : (await order.first().isVisible())
            ? "sequence"
            : "done";
    if (kind === stopAt) return;
    if (prefix && kind !== "done" && !seen.has(kind)) {
      seen.add(kind);
      await noSideScroll(page);
      await shot(page, testInfo, `${prefix}-${kind}`);
    }
    const progress = await page.getByRole("progressbar").first().getAttribute("aria-valuenow");
    if (kind === "intro") await letsPlay.click();
    else if (kind === "choice") await answerTile.click();
    else if (kind === "match") {
      const ids = await pairs.evaluateAll((els) => els.map((e) => e.getAttribute("data-pair")));
      for (const id of ids) {
        await page.locator(`[data-side="l"][data-pair="${id}"]`).click();
        await page.locator(`[data-side="r"][data-pair="${id}"]`).click();
      }
    } else if (kind === "sequence") {
      const n = await order.count();
      for (let i = 0; i < n; i++) await page.locator(`[data-order="${i}"]`).click();
    } else return;
    // The step moves on after the praise; wait for the progress bar to change or the end screen.
    await expect
      .poll(async () =>
        (await page.getByRole("heading", { level: 1, name: DONE }).isVisible())
          ? "end"
          : await page.getByRole("progressbar").first().getAttribute("aria-valuenow"),
      )
      .not.toBe(kind === "intro" ? "__never" : progress);
  }
  throw new Error("lesson did not finish");
}

test("Zawadi plays lesson 3 from the trail and earns stars and treasures", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/trail/numbers");
  await page.getByRole("button", { name: "Lesson 3", exact: true }).click();
  await shot(page, testInfo, "l1-start");
  await page.getByRole("button", { name: "Let's go!" }).click();
  await expect(page).toHaveURL(/\/play\/lesson\/counting-1-5\/3$/);
  await playThrough(page, testInfo, "l2");
  await expect(page.getByRole("heading", { level: 1, name: "Lesson done!" })).toBeVisible();
  await expect(page.getByRole("img", { name: "3 of 3 stars" })).toBeVisible();
  // Today's goal was 1 of 2 before this lesson, so this one reaches it: 10 + 5 perfect + 10 goal.
  await expect(page.getByText("+25")).toBeVisible();
  await expect(page.getByText("Goal reached!")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "l3-complete");
  await page.getByRole("link", { name: "Back to the trail" }).click();
  await expect(page.getByRole("button", { name: "Lesson 3, 3 stars" })).toBeVisible();
});

test("the hint ladder: repeat, then remove a choice and glow, then show the answer", async ({
  page,
}, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/lesson/counting-1-5/4");
  // Play up to the first single-choice question.
  await playThrough(page, testInfo, null, { stopAt: "choice" });
  const wrong = page.locator('[data-answer="no"]:visible');
  await expect(page.locator('[data-answer="yes"]')).toBeVisible();
  const before = await wrong.count();
  await wrong.first().click(); // 1st miss: the buddy repeats the question
  await expect(page.getByRole("status")).not.toBeEmpty();
  await wrong.first().click(); // 2nd miss: one wrong choice disappears and the answer glows
  await expect(wrong).toHaveCount(before - 1);
  await expect(page.locator('[data-answer="yes"]')).toHaveClass(/glow/);
  await shot(page, testInfo, "h1-glow");
  if (before - 1 > 0) {
    await wrong.first().click(); // 3rd miss: the buddy shows the answer and the rest dim
    await expect(page.getByRole("status")).toContainText(/glowing one|this one/);
  }
  await page.locator('[data-answer="yes"]').click();
  await playThrough(page, testInfo);
  // That question was not right first time, so this can't be a 3-star lesson.
  await expect(page.getByRole("img", { name: /[12] of 3 stars/ })).toBeVisible();
});

test("keyboard: number keys answer; stopping keeps the answers given", async ({ page }) => {
  await as(page, "Zawadi");
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: "Let's play!" }).click();
  const answer = page.locator('[data-answer="yes"]');
  await expect(answer).toBeVisible();
  const n = await page
    .locator("[data-answer]")
    .evaluateAll((els) => els.findIndex((e) => e.getAttribute("data-answer") === "yes"));
  await page.keyboard.press(String(n + 1));
  await expect(page.getByRole("status")).toContainText(/Yes|right|Brilliant|got it|Great/);
  await page.getByRole("button", { name: "Stop the lesson" }).click();
  await expect(page.getByRole("heading", { name: "Do you want to stop?" })).toBeVisible();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/trail\/numbers$/);
  const answered = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("trailbuddies-demo");
        req.onsuccess = () => {
          const all = req.result.transaction("events").objectStore("events").getAll();
          all.onsuccess = () =>
            resolve(
              all.result.filter((e) => e.type === "item_answered" && e.data.lessonId === "counting-1-5-1")
                .length,
            );
        };
      }),
  );
  expect(answered).toBe(1); // the answer just given was saved, though the lesson was left
});

test("Joseph wins the Counting 1 to 5 trophy and it opens Counting 6 to 10", async ({ page }, testInfo) => {
  await as(page, "Joseph");
  await page.goto("/play/trail/numbers");
  await expect(page.getByRole("button", { name: /Lesson 1, .*locked/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Trophy", exact: true }).first().click();
  await page.getByRole("button", { name: "Let's go!" }).click();
  await expect(page).toHaveURL(/\/play\/lesson\/counting-1-5\/trophy$/);
  await playThrough(page, testInfo, "t1");
  await expect(page.getByRole("heading", { level: 1, name: "Trophy won!" })).toBeVisible();
  await shot(page, testInfo, "t2-trophy");
  await page.getByRole("link", { name: "Start Counting 6 to 10" }).click();
  await expect(page).toHaveURL(/\/play\/lesson\/counting-6-10\/1$/);
  await playThrough(page, testInfo, "t3");
  await expect(page.getByRole("heading", { level: 1, name: "Lesson done!" })).toBeVisible();
});

test("a practice stone appears when an item is due, and plays a review", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/trail/numbers");
  await page.getByRole("button", { name: "Practice stone" }).click();
  await page.getByRole("button", { name: "Let's go!" }).click();
  await expect(page).toHaveURL(/\/play\/review\/numbers$/);
  await playThrough(page, testInfo, "r1");
  await expect(page.getByRole("heading", { level: 1, name: "Practice done!" })).toBeVisible();
  await page.getByRole("link", { name: "Back to the trail" }).click();
  await expect(page.getByRole("button", { name: "Practice stone" })).toHaveCount(0);
});

test("locked lessons send you back to the trail", async ({ page }) => {
  await as(page, "Amani");
  await page.goto("/play/lesson/counting-6-10/1");
  await expect(page).toHaveURL(/\/play\/trail\/numbers$/);
  await page.goto("/play/lesson/counting-1-5/trophy");
  await expect(page).toHaveURL(/\/play\/trail\/numbers$/);
});

test("a grown-up fixes the difficulty and lessons show more choices", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/settings");
  await passGate(page);
  await expect(page.getByRole("heading", { name: "Difficulty" })).toBeVisible();
  await page.getByRole("group", { name: "Difficulty for Zawadi" }).getByRole("button", { name: "3" }).click();
  await expect(page.getByText(/Numbers: Now: Level 3/).first()).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s1-settings");
  await as(page, "Zawadi", { fresh: false });
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: "Let's play!" }).click();
  // Lesson 1 asks with 2 choices at level 2; level 3 adds one (all 3 items it has met).
  await expect(page.locator("[data-answer]")).toHaveCount(3);
});
