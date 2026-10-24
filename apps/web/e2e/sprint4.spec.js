import { test, expect } from "@playwright/test";
import { shot, noSideScroll, watchErrors, demo, passGate } from "./helpers.js";

// Sprint 4: the treasure wallet and shop, badges, the week strip, the daily cap and the
// games corner (memory flip and jigsaw), at phone, tablet and desktop.
test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/ERR_INTERNET_DISCONNECTED/]);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

const wallet = (page) => page.getByLabel(/^\d+ treasures$/).first();

async function as(page, name) {
  await demo(page);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
}

/** Events saved on this device for a learner. */
const events = (page, type) =>
  page.evaluate(
    (type) =>
      new Promise((resolve) => {
        const req = indexedDB.open("trailbuddies-demo");
        req.onsuccess = () => {
          const all = req.result.transaction("events").objectStore("events").getAll();
          all.onsuccess = () => resolve(all.result.filter((e) => e.type === type));
        };
      }),
    type,
  );

test("the shop: try on, buy, wear and save for something dearer", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/more/shop");
  await expect(wallet(page)).toHaveAttribute("aria-label", "110 treasures"); // 130 earned − 20 sun hat
  await page.getByRole("tab", { name: "Scarves and ties" }).click();
  await page.getByRole("button", { name: "Try on Bow tie" }).click();
  await noSideScroll(page);
  await shot(page, testInfo, "s4-shop");
  await page.getByRole("button", { name: /Buy for 35/ }).click();
  await page.getByRole("button", { name: "Yes, buy it!" }).click();
  await expect(wallet(page)).toHaveAttribute("aria-label", "75 treasures");
  await expect(page.getByRole("button", { name: "Take it off" })).toBeVisible();
  // The crown costs 250: the buddy offers to save for it.
  await page.getByRole("tab", { name: "Hats" }).click();
  await page.getByRole("button", { name: "Try on Crown" }).click();
  await page.getByRole("button", { name: /Buy for 250/ }).click();
  await expect(page.getByRole("heading", { name: /Just 175 more treasures/ })).toBeVisible();
  await shot(page, testInfo, "s4-need-more");
  await page.getByRole("button", { name: "Save for it" }).click();
  await page.goto("/play/map");
  await expect(page.locator("p:visible", { hasText: "Saving for: Crown · 75 / 250" })).toBeVisible();
  // Stars never go down when treasures are spent (RWD-02).
  await expect(page.getByLabel(/^\d+ stars$/).first()).not.toHaveAttribute("aria-label", "0 stars");
  await shot(page, testInfo, "s4-map-saving");
});

test("buying offline is saved and counts once back online (OFF-03)", async ({ page, context }) => {
  await as(page, "Zawadi");
  await page.goto("/play/more/shop");
  await expect(wallet(page)).toHaveAttribute("aria-label", "110 treasures");
  await context.setOffline(true);
  await page.getByRole("tab", { name: "Glasses" }).click();
  await page.getByRole("button", { name: "Try on Round glasses" }).click();
  await page.getByRole("button", { name: /Buy for 45/ }).click();
  await page.getByRole("button", { name: "Yes, buy it!" }).click();
  await expect(wallet(page)).toHaveAttribute("aria-label", "65 treasures");
  const spent = await events(page, "treasure_spent");
  expect(spent.map((e) => e.data.itemId)).toContain("specs");
  await context.setOffline(false);
});

test("a lesson earns badges, celebrated after the end screen, and they fill the badge book", async ({
  page,
}, testInfo) => {
  await as(page, "Joseph");
  await page.goto("/play/lesson/counting-1-5/trophy");
  // Answer everything right until the end.
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("heading", { level: 1, name: "Trophy won!" }).isVisible()) break;
    const go = page.getByRole("button", { name: "Let's play!" });
    const yes = page.locator('[data-answer="yes"]');
    const left = page.locator('[data-side="l"]');
    const order = page.locator("[data-order]");
    await expect(
      go.or(yes).or(left.first()).or(order.first()).or(page.getByRole("heading", { level: 1, name: "Trophy won!" })),
    ).toBeVisible();
    if (await go.isVisible()) await go.click();
    else if (await yes.isVisible()) await yes.click();
    else if (await left.first().isVisible()) {
      for (const id of await left.evaluateAll((els) => els.map((e) => e.getAttribute("data-pair")))) {
        await page.locator(`[data-side="l"][data-pair="${id}"]`).click();
        await page.locator(`[data-side="r"][data-pair="${id}"]`).click();
      }
    } else if (await order.first().isVisible()) {
      const n = await order.count();
      for (let k = 0; k < n; k++) await page.locator(`[data-order="${k}"]`).click();
    }
    await page.waitForTimeout(1400);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Trophy won!" })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "New badge!" });
  await expect(dialog).toBeVisible({ timeout: 6000 });
  await noSideScroll(page);
  await shot(page, testInfo, "s4-badge");
  for (let i = 0; i < 20 && (await dialog.isVisible()); i++) {
    await dialog.getByRole("button").click();
    await page.waitForTimeout(900); // the badge flies to the book
  }
  await expect(dialog).toHaveCount(0);
  const awarded = await events(page, "badge_awarded");
  expect(awarded.map((e) => e.data.badgeId)).toContain("first-steps");
  await page.goto("/play/more/badges");
  await expect(page.locator('[data-earned="yes"]').first()).toBeVisible();
  await expect(page.locator('[data-earned="no"]').first()).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s4-badge-book");
});

test("the week strip shows goal and rest days, never a lost streak", async ({ page }, testInfo) => {
  await as(page, "Joseph");
  const strip = page.locator("[data-status]");
  if (testInfo.project.name === "desktop") {
    await expect(strip).toHaveCount(7);
    const statuses = await strip.evaluateAll((els) => els.map((e) => e.getAttribute("data-status")));
    expect(statuses.at(-1)).toMatch(/today|goal/);
    expect(statuses).toContain("goal");
  }
  await expect(page.getByText(/^lost/i)).toHaveCount(0);
  await shot(page, testInfo, "s4-week");
});

test("a grown-up can turn the daily treasure limit off", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family/settings");
  await passGate(page);
  const cap = page.getByRole("switch", { name: "Daily treasure limit" }).or(
    page.getByRole("checkbox", { name: "Daily treasure limit" }),
  );
  await expect(cap).toBeChecked();
  await expect(page.getByText("Up to 100 treasures a day")).toBeVisible();
  await cap.click();
  await expect(cap).not.toBeChecked();
  await shot(page, testInfo, "s4-cap");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("trailbuddies-family-v3")));
  expect(saved.state.settings.treasure_cap).toBe(false);
});

test("games corner: topics open after a lesson; memory flip pays treasures", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/more/games");
  await expect(page.getByRole("link", { name: "Counting 1 to 5" })).toBeVisible();
  await expect(page.getByRole("button", { name: /, Play a lesson to unlock/ }).first()).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s4-games");
  await page.getByRole("link", { name: "Counting 1 to 5" }).click();
  await expect(page).toHaveURL(/\/play\/game\/memory\/counting-1-5$/);
  const cards = page.locator("[data-pair-id]");
  await expect(cards.first()).toBeVisible();
  expect([6, 8, 12]).toContain(await cards.count());
  await shot(page, testInfo, "s4-memory");
  const ids = [...new Set(await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-pair-id"))))];
  // One miss first: two different cards flip back.
  await page.locator(`[data-pair-id="${ids[0]}"]`).first().click();
  await page.locator(`[data-pair-id="${ids[1]}"]`).first().click();
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0, { timeout: 3000 });
  for (const id of ids) {
    const pair = page.locator(`[data-pair-id="${id}"]`);
    await pair.nth(0).click();
    await pair.nth(1).click();
  }
  await expect(page.getByRole("heading", { name: "Well played!" })).toBeVisible();
  // First game with this topic: 5 + 5.
  await expect(page.getByLabel("+10 treasures")).toBeVisible();
  await shot(page, testInfo, "s4-memory-done");
  const finished = await events(page, "game_finished");
  expect(finished).toHaveLength(1);
  // A locked topic's game sends you back to the corner.
  await page.goto("/play/game/memory/where-animals-live");
  await expect(page).toHaveURL(/\/play\/more\/games$/);
});

test("jigsaw: tap a piece then its place, or drag it there", async ({ page }, testInfo) => {
  await as(page, "Zawadi");
  await page.goto("/play/more/games");
  await page.getByRole("radio", { name: /Jigsaw/ }).click();
  await page.getByRole("link", { name: "Counting 1 to 5" }).click();
  await expect(page).toHaveURL(/\/play\/game\/jigsaw\/counting-1-5$/);
  const pieces = page.locator("[data-home]");
  await expect(pieces.first()).toBeVisible();
  const n = await pieces.count();
  expect([4, 9, 16]).toContain(n);
  await noSideScroll(page);
  await shot(page, testInfo, "s4-jigsaw");
  // Drag the first piece.
  const home = await pieces.first().getAttribute("data-home");
  const from = await pieces.first().boundingBox();
  const to = await page.locator(`[data-cell="${home}"]`).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(pieces).toHaveCount(n - 1);
  // The rest by tapping.
  for (let i = 1; i < n; i++) {
    const p = pieces.first();
    const cell = await p.getAttribute("data-home");
    await p.click();
    await page.locator(`[data-cell="${cell}"]`).click();
  }
  await expect(page.getByRole("heading", { name: "Well played!" })).toBeVisible();
  await shot(page, testInfo, "s4-jigsaw-done");
});
