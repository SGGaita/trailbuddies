import { expect, test } from "@playwright/test";
import { noSideScroll, passGate, settled, shot, watchErrors } from "./helpers.js";
import { fakeApi, newServer, seedServer } from "./fakeApi.js";

// Sprint 13: trails and islands, review and publish, roll back, badges (CMS-05…08).
test.describe.configure({ timeout: 240_000 });

const ALLOW = [/Failed to load resource/];
const STEVE = "steve@trailbuddies.africa";
const WANJIRU = "wanjiru@trailbuddies.africa";
const OTIENO = "otieno@trailbuddies.africa";
const PHOTO = new URL("./fixtures/dog-with-gps.jpg", import.meta.url).pathname;

async function device(browser, srv, email) {
  const context = await browser.newContext();
  await fakeApi(context, srv);
  const page = await context.newPage();
  watchErrors(page, ALLOW);
  await page.addInitScript(() => {
    globalThis.__tbImageCheck = async () => ({ faces: 0, flagged: false, reason: null, scores: { porn: 0.01 } });
  });
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).not.toHaveURL(/\/auth\/verify/);
  return page;
}

test("a new trail and badge go through review, reach children's maps, and can be rolled back", async ({ browser }, testInfo) => {
  const srv = seedServer(newServer());
  srv.staff[WANJIRU] = { role: "editor" };
  srv.staff[OTIENO] = { role: "reviewer" };

  // Someone who isn't staff sees which email they're signed in with.
  const grace = await device(browser, srv, "grace@example.com");
  await grace.goto("/admin/content");
  await expect(grace.getByTestId("signed-in-as")).toHaveText("You're signed in as grace@example.com.");

  const s = await device(browser, srv, STEVE);
  await s.goto("/admin/content");
  await s.getByRole("button", { name: "Import the content" }).click();
  await expect(s.getByText("Imported as version 1", { exact: false })).toBeVisible();
  expect(srv.cms.live.badges.length).toBeGreaterThan(10); // the badges came in too

  // CMS-05: Wanjiru adds Rain Hill with its island art and first unit, then puts it first.
  const w = await device(browser, srv, WANJIRU);
  await w.goto("/admin/content/map");
  const add = w.getByTestId("add-trail");
  await add.getByLabel("Trail name").fill("Rain");
  await add.getByLabel("Place on the map").fill("Rain Hill");
  await add.getByTestId("island-file").setInputFiles(PHOTO);
  await expect(add.getByText("Waiting for approval")).toBeVisible();
  await add.getByLabel("Unit name").fill("Clouds");
  await add.getByRole("button", { name: "Add the trail" }).click();
  await expect(w.getByText("“Rain” added to the draft.")).toBeVisible();
  const rain = w.locator('[data-trail="rain-hill"]');
  for (let i = 0; i < 9; i++) {
    await rain.getByRole("button", { name: "Move Rain up" }).click();
    await expect(w.getByText("Moved in the draft.")).toBeVisible();
    await w.getByRole("status").getByRole("button", { name: "Close" }).click();
  }
  await expect(w.locator("[data-trail]").first()).toHaveAttribute("data-trail", "rain-hill");
  // A second unit, blank.
  await rain.getByRole("button", { name: "+ Add a unit" }).click();
  await w.getByRole("dialog").getByLabel("Unit name").fill("Rainbows");
  await w.getByRole("dialog").getByTestId("dlg-copy").click();
  await expect(w.getByRole("dialog").getByText("Unit to copy")).toBeVisible();
  await settled(w);
  await shot(w, testInfo, "s13-dialog-unit");
  await w.getByRole("dialog").getByTestId("dlg-blank").click();
  await w.getByRole("dialog").getByRole("button", { name: "Add unit" }).click();
  await expect(rain).toContainText("Rainbows");
  // Archive Feelings: it leaves the map; children keep their stars.
  await w.locator('[data-trail="feelings"]').getByRole("button", { name: "Archive" }).click();
  await expect(w.getByRole("dialog")).toContainText("Children keep their stars, badges and treasure");
  await shot(w, testInfo, "s13-dialog-archive");
  await w.getByRole("dialog").getByRole("button", { name: "Archive trail" }).click();
  await expect(w.locator('[data-trail="feelings"]')).toContainText("Archived");
  await settled(w);
  await noSideScroll(w);
  await shot(w, testInfo, "s13-map");

  // CMS-08: a new badge, and Puzzle Pro retired.
  await w.goto("/admin/content/badges");
  await w.getByRole("button", { name: "Add a badge" }).click();
  const dlg = w.getByRole("dialog");
  await dlg.getByLabel("Name").fill("Rain Explorer");
  await dlg.getByLabel("How to earn it (children hear this)").fill("Finish your first unit");
  await dlg.getByTestId("badge-file").setInputFiles(PHOTO);
  await expect(dlg.getByText("Uploaded. It shows once a reviewer or admin approves it.")).toBeVisible();
  await expect(dlg.getByTestId("badge-preview")).toContainText("Rain Explorer");
  await settled(w);
  await shot(w, testInfo, "s13-dialog-badge");
  await dlg.getByRole("button", { name: "Save" }).click();
  await expect(w.getByText("“Rain Explorer” added to the draft.")).toBeVisible();
  await w.locator('[data-badge="puzzle-pro"]').getByRole("button", { name: "Retire" }).click();
  await expect(w.locator('[data-badge="puzzle-pro"]')).toContainText("Retired");
  await settled(w);
  await noSideScroll(w);
  await shot(w, testInfo, "s13-badges");

  // Steve marks Clouds ready for children (admins only).
  await s.goto("/admin/content/unit?id=clouds");
  await s.locator("#u-status").click();
  await s.getByRole("option", { name: "Ready for children" }).click();
  await s.getByRole("button", { name: "Save to draft" }).click();
  await expect(s.getByText("Saved to the draft", { exact: false })).toBeVisible();

  // CMS-06: Wanjiru submits; Dr Otieno sends it back with a comment; she resubmits; he approves.
  await w.goto("/admin/content/review");
  await w.getByRole("textbox", { name: "What changed" }).fill("Rain Hill, a new badge, Feelings archived");
  await w.getByRole("button", { name: "Submit for review" }).click();
  await expect(w.getByText("Submitted. A reviewer will look at it.")).toBeVisible();

  const o = await device(browser, srv, OTIENO);
  await o.goto("/admin/content/review");
  await expect(o.locator('[data-doc="unit:clouds"]')).toContainText("Not there before");
  await expect(o.locator('[data-doc="catalogue:catalogue"]')).toContainText("Rain");
  await expect(o.locator('[data-doc="badges:built-in"]')).toContainText("Rain Explorer");
  await settled(o);
  await noSideScroll(o);
  await shot(o, testInfo, "s13-review");
  await o.getByRole("textbox", { name: "Comment for the editor" }).fill("Please check the Rainbows words.");
  await o.getByRole("button", { name: "Send back" }).click();
  await expect(o.getByText("Sent back to the editor with your comment.")).toBeVisible();

  await w.goto("/admin/content");
  await expect(w.getByTestId("version-banner")).toContainText("Please check the Rainbows words.");
  await w.goto("/admin/content/review");
  await w.getByRole("textbox", { name: "What changed" }).fill("Rain Hill, checked");
  await w.getByRole("button", { name: "Submit for review" }).click();
  await o.goto("/admin/content/review");
  await o.getByRole("button", { name: "Approve" }).click();
  await expect(o.getByText("Approved. An admin can publish it now.")).toBeVisible();
  await expect(o.getByRole("button", { name: "Publish" })).toHaveCount(0); // two steps: an admin publishes

  // Steve publishes once the island and badge art are approved.
  await s.goto("/admin/content/review");
  await s.getByRole("button", { name: "Publish" }).click();
  await expect(s.getByText("isn't approved yet", { exact: false }).first()).toBeVisible();
  await s.goto("/admin/content");
  const pics = s.getByTestId("approvals");
  await pics.getByRole("button", { name: "Approve" }).first().click();
  await expect(s.getByText("Picture approved", { exact: false })).toBeVisible();
  await pics.getByRole("button", { name: "Approve" }).first().click();
  await expect(pics).toHaveCount(0);
  await s.goto("/admin/content/review");
  await s.getByRole("button", { name: "Publish" }).click();
  await expect(s.getByText("Version 2 is published", { exact: false })).toBeVisible();
  await expect(s.getByTestId("versions")).toContainText(`approved by ${OTIENO}`);

  // On a child's device: Rain Hill is on the map, Feelings isn't, and Puzzle Pro is gone.
  await grace.goto("/family/settings");
  await passGate(grace);
  await expect(grace.getByRole("region", { name: "Play without internet" })).toBeVisible();
  await expect.poll(() => grace.evaluate(async () => (await indexedDB.databases()).length), { timeout: 10_000 }).toBeGreaterThan(0);
  await grace.waitForTimeout(1500); // let the background download finish
  await grace.goto("/play");
  await grace.getByRole("button", { name: /Wanjiru/ }).click();
  await expect(grace).toHaveURL(/\/play\/map$/);
  await expect(grace.getByText("Rain Hill").filter({ visible: true }).first()).toBeVisible();
  await expect(grace.getByText("Feelings Trail")).toHaveCount(0);
  await settled(grace);
  await shot(grace, testInfo, "s13-child-map");
  await grace.goto("/play/more/badges");
  await expect(grace.getByText("Rain Explorer")).toBeVisible();
  await expect(grace.getByText("Puzzle Pro")).toHaveCount(0);

  // CMS-07: Steve rolls back to version 1; it's published again as version 3.
  await s.goto("/admin/content/review");
  await s.locator('[data-version="1"]').getByRole("button", { name: "Roll back" }).click();
  await s.getByRole("textbox", { name: "Why" }).fill("Rain Hill isn't ready");
  await s.getByRole("button", { name: "Roll back to version 1" }).click();
  await expect(s.getByText("Version 1's content is live again", { exact: false })).toBeVisible();
  await expect(s.locator('[data-version="3"]')).toContainText("version 1 again");
  expect(srv.cms.live.catalogue.subjects.some((x) => x.id === "rain-hill")).toBe(false);
  await settled(s);
  await noSideScroll(s);
  await shot(s, testInfo, "s13-history");
});
