import { test, expect } from "@playwright/test";
import { shot, noSideScroll, watchErrors, demo, PRAISE } from "./helpers.js";

// Sprint 3: the new exercises (case-match, build a word, sort, drag-to-order), the buddy's
// explanations and celebrations, the greeting, Meet the buddies, and unit unlocking.
test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

async function as(page, name) {
  await demo(page);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
}

const DONE = /Lesson done!|Trophy won!|Practice done!/;

/** Answer one step by tapping; returns the kind of step it was. */
async function answerStep(page) {
  if (await page.getByRole("heading", { level: 1, name: DONE }).isVisible()) return "done";
  const letsPlay = page.getByRole("button", { name: "Let's play!" });
  if (await letsPlay.isVisible()) {
    await letsPlay.click();
    return "intro";
  }
  if (await page.locator('[data-answer="yes"]').isVisible()) {
    await page.locator('[data-answer="yes"]').click();
    return "choice";
  }
  if (await page.locator('[data-side="l"]').first().isVisible()) {
    for (const id of await page
      .locator('[data-side="l"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-pair")))) {
      await page.locator(`[data-side="l"][data-pair="${id}"]`).click();
      await page.locator(`[data-side="r"][data-pair="${id}"]`).click();
    }
    return "match";
  }
  if (await page.locator("[data-word]").isVisible()) {
    const word = await page.locator("[data-word]").getAttribute("data-word");
    for (const ch of word) await page.locator(`[data-letter="${ch}"]`).first().click();
    return "word";
  }
  if (await page.locator("[data-item]").first().isVisible()) {
    for (const [id, bin] of await page
      .locator("[data-item]")
      .evaluateAll((els) => els.map((e) => [e.getAttribute("data-item"), e.getAttribute("data-bin")]))) {
      await page.locator(`[data-item="${id}"]`).click();
      await page.locator(`[data-binid="${bin}"]`).click();
    }
    return "sort";
  }
  if (await page.locator("[data-order]").first().isVisible()) {
    const n = await page.locator("[data-order]").count();
    for (let i = 0; i < n; i++) await page.locator(`[data-order="${i}"]`).click();
    return "order";
  }
  return "waiting";
}

const progressOf = (page) =>
  page
    .getByRole("progressbar")
    .first()
    .getAttribute("aria-valuenow", { timeout: 1500 })
    .catch(() => null);

/** Play to the end, tapping "Next" to skip each celebration (BUD-06). */
async function playThrough(page, testInfo, prefix) {
  const seen = new Set();
  for (let guard = 0; guard < 60; guard++) {
    await page.waitForTimeout(150);
    // The complete screen has no progress bar, so check for it first and never wait long.
    if (await page.getByRole("heading", { level: 1, name: DONE }).isVisible()) return;
    const before = await progressOf(page);
    const kind = await answerStep(page);
    if (kind === "done") return;
    if (prefix && !["waiting", "intro"].includes(kind) && !seen.has(kind)) {
      seen.add(kind);
      await shot(page, testInfo, `${prefix}-${kind}`);
    }
    const next = page.getByRole("button", { name: "Next ›" });
    if (kind !== "waiting" && kind !== "intro" && (await next.isVisible())) await next.click();
    await expect
      .poll(async () =>
        (await page.getByRole("heading", { level: 1, name: DONE }).isVisible())
          ? "end"
          : await progressOf(page),
      )
      .not.toBe(kind === "waiting" || kind === "intro" ? "__never" : before);
  }
  throw new Error("lesson did not finish");
}

test("Letters A to E: case-match and building words", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/lesson/letters-a-e/2");
  // BUD-04: the intro shows and says every new letter without being tapped.
  const introTiles = page.getByRole("button", { name: /^Hear (see|dee|ee)$/ });
  await expect(introTiles).toHaveCount(3);
  // Each turns green once the buddy has said it (speech has a time-out in headless browsers).
  await expect(introTiles.and(page.locator(".popin"))).toHaveCount(3, { timeout: 45_000 });
  await shot(page, testInfo, "s1-intro");
  await playThrough(page, testInfo, "s2-letters");
  await expect(page.getByRole("heading", { level: 1, name: "Lesson done!" })).toBeVisible();

  await page.goto("/play/lesson/letters-a-e/4");
  await page.getByRole("button", { name: "Let's play!" }).click({ timeout: 15_000 });
  await expect(page.locator("[data-word]")).toBeVisible();
  // Drag the first letter into the first slot; a wrong letter wiggles back.
  const word = await page.locator("[data-word]").getAttribute("data-word");
  const wrong = await page
    .locator("[data-letter]")
    .evaluateAll((els, w) => els.map((e) => e.getAttribute("data-letter")).find((l) => l !== w[0]), word);
  if (wrong) {
    await page.locator(`[data-letter="${wrong}"]`).first().click();
    await expect(page.getByRole("button", { name: "Letter 1: empty" })).toBeVisible();
  }
  const tile = await page.locator(`[data-letter="${word[0]}"]`).first().boundingBox();
  const slot = await page.getByRole("button", { name: "Letter 1: empty" }).boundingBox();
  await page.mouse.move(tile.x + tile.width / 2, tile.y + tile.height / 2);
  await page.mouse.down();
  await page.mouse.move(slot.x + slot.width / 2, slot.y + slot.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: `Letter 1: ${word[0]}` })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s3-word");
  for (const ch of word.slice(1)) await page.locator(`[data-letter="${ch}"]`).first().click();
  // LES-11: the finished word is read out.
  await expect(page.getByRole("status")).toContainText(word);
});

test("Where animals live: sort into baskets and the odd one out explains itself", async ({
  page,
}, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/lesson/where-animals-live/3");
  await page.getByRole("button", { name: "Let's play!" }).click({ timeout: 15_000 });
  // Answer up to the first sort.
  for (let i = 0; i < 5 && !(await page.locator("[data-item]").first().isVisible()); i++) {
    await answerStep(page);
    const next = page.getByRole("button", { name: "Next ›" });
    if (await next.isVisible()) await next.click();
    await page.waitForTimeout(300);
  }
  const items = page.locator("[data-item]");
  await expect(items.first()).toBeVisible();
  const [id, bin] = await items
    .first()
    .evaluate((e) => [e.getAttribute("data-item"), e.getAttribute("data-bin")]);
  const other = await page
    .locator("[data-binid]")
    .evaluateAll((els, b) => els.map((e) => e.getAttribute("data-binid")).find((x) => x !== b), bin);
  // A wrong drop bounces back.
  const drag = async (to) => {
    const from = await page.locator(`[data-item="${id}"]`).boundingBox();
    const target = await page.locator(`[data-binid="${to}"]`).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  await drag(other);
  await expect(page.locator(`[data-item="${id}"]`)).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s4-sort");
  await drag(bin);
  await expect(page.locator(`[data-item="${id}"]`)).toHaveCount(0);
  // Finish the lesson; the odd-one-out praise says why.
  let explained = false;
  for (let guard = 0; guard < 40; guard++) {
    if (await page.getByRole("heading", { level: 1, name: "Lesson done!" }).isVisible()) break;
    const odd = await page.getByText("Which one is different?").first().isVisible();
    const kind = await answerStep(page);
    if (odd && kind === "choice") {
      await expect(page.getByRole("status")).toContainText(/lives|is different/);
      explained = true;
      await shot(page, testInfo, "s5-odd");
    }
    const next = page.getByRole("button", { name: "Next ›" });
    if (await next.isVisible()) await next.click();
    await page.waitForTimeout(250);
  }
  expect(explained).toBe(true);
});

test("sequence: cards fill the slots and are checked when the last one is in", async ({ page }) => {
  await as(page, "Zawadi");
  await page.goto("/play/lesson/counting-1-5/6");
  for (let i = 0; i < 6 && !(await page.locator("[data-order]").first().isVisible()); i++) {
    await answerStep(page);
    const next = page.getByRole("button", { name: "Next ›" });
    if (await next.isVisible()) await next.click();
    await page.waitForTimeout(300);
  }
  const cards = page.locator("[data-order]");
  const n = await cards.count();
  // Put them in reverse: nothing is checked until the last slot is filled.
  for (let i = n - 1; i >= 0; i--) await page.locator(`[data-order="${i}"]`).click();
  await expect(page.getByRole("status")).not.toContainText(PRAISE);
  // Wrong cards go back to the tray; then do it right.
  await expect(cards.first()).toBeVisible();
  for (let i = 0; i < n; i++) {
    const c = page.locator(`[data-order="${i}"]`);
    if (await c.isVisible()) await c.click();
  }
  await expect(page.getByRole("status")).toContainText(PRAISE);
});

test("compare explains by counting, and grown-up learners get quick praise", async ({ page }) => {
  await as(page, "Zawadi");
  await page.goto("/play/lesson/counting-1-5/5");
  for (let i = 0; i < 8; i++) {
    const compare = await page
      .getByText(/Which has (more|fewer)\?/)
      .first()
      .isVisible();
    await answerStep(page);
    if (compare) {
      await expect(page.getByRole("status")).toContainText(/is more|is fewer|more than|fewer than/);
      break;
    }
    const next = page.getByRole("button", { name: "Next ›" });
    if (await next.isVisible()) await next.click();
    await page.waitForTimeout(300);
  }
  // Joseph is an adult: "✓ Right!" with no speech, and Next to move on at once.
  await page.goto("/play");
  await page.getByRole("button", { name: /Joseph/ }).click();
  await page.goto("/play/lesson/counting-1-5/4");
  await page.locator('[data-answer="yes"]').waitFor(); // lesson 4 starts on a question
  await page.locator('[data-answer="yes"]').click();
  await expect(page.getByRole("status")).toHaveText("✓ Right!");
});

test("the map greets by name with last time and what's next, once a day", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  const bubble = page.getByText(
    /^Hi Zawadi! Last time we did .+\. Shall we try .+ today\?$|^Hello Zawadi! Remember .+\? Next up: .+!$|Beep! Welcome back, Zawadi!/,
  );
  await expect(bubble.filter({ visible: true }).first()).toBeVisible();
  await expect(
    page
      .getByText(/Last time we did|Remember/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await shot(page, testInfo, "s6-greeting");
  await page.reload();
  await expect(
    page
      .getByText(/Welcome back, Zawadi/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});

test("locked stones point at their trophy; winning it unlocks the next unit", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/trail/numbers");
  await page
    .getByRole("button", { name: /Lesson 1, locked/ })
    .first()
    .click();
  await expect(page.locator('[data-unit="counting-1-5"].glow')).toHaveCount(1);
  await shot(page, testInfo, "s7-locked");

  // Joseph has every Counting 1 to 5 lesson: win the trophy, then come back to the trail.
  await page.goto("/play");
  await page.getByRole("button", { name: /Joseph/ }).click();
  await page.goto("/play/trail/numbers");
  await expect(page.locator(".unlock-in")).toHaveCount(0);
  await page.goto("/play/lesson/counting-1-5/trophy");
  await playThrough(page, testInfo);
  await expect(page.getByRole("heading", { level: 1, name: "Trophy won!" })).toBeVisible();
  await page.getByRole("link", { name: "Back to the trail" }).click();
  await expect(page.locator('[data-unit="counting-6-10"].unlock-in').first()).toBeVisible();
  await shot(page, testInfo, "s8-unlocked");
  await page.reload();
  await expect(page.locator(".unlock-in")).toHaveCount(0); // only once
});
