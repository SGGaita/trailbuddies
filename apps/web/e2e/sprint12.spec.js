import { expect, test } from "@playwright/test";
import { noSideScroll, settled, shot, watchErrors } from "./helpers.js";
import { fakeApi, newServer } from "./fakeApi.js";

// Sprint 12: the staff area and content admin (CMS-01…04), at phone, tablet and desktop.
test.describe.configure({ timeout: 180_000 });

const ALLOW = [/Failed to load resource/];
const STEVE = "steve@trailbuddies.africa";
const WANJIRU = "wanjiru@trailbuddies.africa";
const PHOTO = new URL("./fixtures/dog-with-gps.jpg", import.meta.url).pathname;

async function staffDevice(browser, srv, email) {
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

test("staff roles, import, edit a unit with a new picture, preview as a child, approve and publish", async ({ browser }, testInfo) => {
  const srv = newServer();

  // CMS-01: someone who isn't staff can't open it.
  const grace = await staffDevice(browser, srv, "grace@example.com");
  await grace.goto("/admin");
  await expect(grace.getByText("only for Trailbuddies staff", { exact: false })).toBeVisible();

  // CMS-02: Steve (TB_ADMIN_EMAILS) imports the content files as version 1.
  const s = await staffDevice(browser, srv, STEVE);
  await s.goto("/admin");
  await expect(s).toHaveURL(/\/admin\/content$/);
  await s.getByRole("button", { name: "Import the content" }).click();
  await expect(s.getByText("Imported as version 1", { exact: false })).toBeVisible();
  await expect(s.getByTestId("version-banner")).toContainText("Children have version 1");
  expect(Object.keys(srv.cms.live.units).length).toBeGreaterThan(20);

  // CMS-01: he adds Wanjiru as an editor; it's in the audit log.
  await s.getByRole("link", { name: "Staff & roles" }).click();
  await s.getByLabel("Email").fill(WANJIRU);
  await s.getByRole("button", { name: "Add", exact: true }).click();
  await expect(s.getByText(`${WANJIRU} added as Editor`, { exact: false })).toBeVisible();
  await expect(s.getByTestId("audit-log")).toContainText(`Added ${WANJIRU} as Editor`);
  await settled(s);
  await noSideScroll(s);
  await shot(s, testInfo, "s12-staff");

  // CMS-03: Wanjiru edits Where animals live. Editors see Content only.
  const w = await staffDevice(browser, srv, WANJIRU);
  await w.goto("/admin");
  await expect(w).toHaveURL(/\/admin\/content$/);
  await expect(w.getByRole("link", { name: "Staff & roles" })).toHaveCount(0);
  await expect(w.getByText("An admin publishes the draft.")).toHaveCount(0); // no draft yet
  await w.locator('[data-unit="where-animals-live"]').click();
  await expect(w.getByRole("heading", { name: "Where animals live" })).toBeVisible();
  const dog = w.locator('[data-item="dog"]');
  // A problem shows next to the field, and Save stays off until it's fixed.
  await dog.getByLabel("Word").fill("");
  await expect(dog.getByRole("alert")).toContainText("can't be empty");
  await expect(w.getByRole("button", { name: "Save to draft" })).toBeDisabled();
  await dog.getByLabel("Word").fill("puppy");
  await dog.getByLabel("Fun fact").fill("A puppy sleeps up to 18 hours a day.");
  // A new item, with an uploaded picture (cropped and re-encoded here, then checked).
  await w.getByLabel("New item word").fill("Camel", { timeout: 15_000 });
  await w.getByRole("button", { name: "Add", exact: true }).click();
  const camel = w.locator('[data-item="camel"]');
  await expect(camel).toContainText("id camel");
  await camel.getByRole("button", { name: "Change the picture for camel" }).click();
  await w.getByTestId("picture-file").setInputFiles(PHOTO);
  await expect(camel).toContainText("Waiting for approval");
  await settled(w);
  await noSideScroll(w);
  await shot(w, testInfo, "s12-unit-editor");
  await w.getByRole("button", { name: "Save to draft" }).click();
  await expect(w.getByText("Saved to the draft", { exact: false })).toBeVisible();
  await expect(w.getByTestId("unit-status")).toContainText("added camel");
  // The child's published copy hasn't changed.
  expect(srv.cms.live.units["where-animals-live"].items[0].label).toBe("dog");
  expect(srv.cms.draft.units["where-animals-live"].items.map((i) => i.id)).toContain("dog"); // ids kept

  // CMS-04: preview lesson 1 in the real learner screens; nothing is recorded.
  const events = srv.events.length;
  await w.getByRole("button", { name: "Preview as a child" }).click();
  await expect(w).toHaveURL(/\/play\/go\?unit=where-animals-live&step=1&preview=1&admin=1/);
  await expect(w.getByText("Preview", { exact: false }).first()).toBeVisible();
  await w.reload(); // the draft survives a reload of the preview
  await expect(w.locator("main")).toBeVisible();
  await settled(w);
  await shot(w, testInfo, "s12-preview");
  expect(srv.events.length).toBe(events);

  // CMS-06: Wanjiru submits it for review.
  await w.goto("/admin/content/review");
  await w.getByRole("textbox", { name: "What changed" }).fill("Puppy fact, and a camel");
  await w.getByRole("button", { name: "Submit for review" }).click();
  await expect(w.getByText("Submitted. A reviewer will look at it.")).toBeVisible();

  // Steve (who didn't work on it) approves it, then publishes once the picture is approved.
  await s.goto("/admin/content");
  const banner = s.getByTestId("version-banner");
  await expect(banner).toContainText("Version 2");
  await expect(banner).toContainText("added camel");
  await expect(banner).toContainText("Waiting for review");
  const pic = s.getByTestId("approvals");
  await expect(pic).toContainText(`Uploaded by ${WANJIRU}`);
  await settled(s);
  await noSideScroll(s);
  await shot(s, testInfo, "s12-content");
  await s.getByRole("link", { name: "Review & publish" }).first().click();
  await s.getByRole("button", { name: "Approve" }).click();
  await expect(s.getByText("Approved. An admin can publish it now.")).toBeVisible();
  await s.getByRole("button", { name: "Publish" }).click();
  await expect(s.getByText("aren't approved yet", { exact: false })).toBeVisible();
  await s.goto("/admin/content");
  await s.getByTestId("approvals").getByRole("button", { name: "Approve" }).click();
  await expect(s.getByText("Picture approved", { exact: false })).toBeVisible();
  await s.goto("/admin/content/review");
  await s.getByRole("button", { name: "Publish" }).click();
  await expect(s.getByText("Version 2 is published", { exact: false })).toBeVisible();
  await s.goto("/admin/content");
  await expect(s.getByTestId("version-banner")).toContainText("Children have version 2");
  expect(srv.cms.live.units["where-animals-live"].items[0]).toMatchObject({ id: "dog", label: "puppy" });

  // The Export file refreshes the bundled copy (pnpm content export:apply).
  const download = s.waitForEvent("download");
  await s.getByRole("button", { name: "Export" }).click();
  expect((await download).suggestedFilename()).toBe("trailbuddies-content-v2.json");
});

test("nobody approves their own changes; moderation moved under the role", async ({ browser }) => {
  const srv = newServer();
  srv.staff["safety@trailbuddies.africa"] = { role: "moderator" };
  const s = await staffDevice(browser, srv, STEVE);
  await s.goto("/admin/content");
  await s.getByRole("button", { name: "Import the content" }).click();
  await s.locator('[data-unit="wild-animals"]').click();
  await s.getByLabel("Summary").fill("Big animals that live in the wild.");
  await s.getByRole("button", { name: "Save to draft" }).click();
  await expect(s.getByText("Saved to the draft", { exact: false })).toBeVisible();
  await s.getByRole("link", { name: "Review & publish" }).first().click();
  await s.getByRole("textbox", { name: "What changed" }).fill("Summary");
  await s.getByRole("button", { name: "Submit for review" }).click();
  await expect(s.getByText("You worked on these changes, so someone else must review them.")).toBeVisible();
  await expect(s.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(s.getByRole("button", { name: "Publish" })).toHaveCount(0);

  const m = await staffDevice(browser, srv, "safety@trailbuddies.africa");
  await m.goto("/admin");
  await expect(m).toHaveURL(/\/admin\/moderation$/);
  await expect(m.getByRole("heading", { name: "Moderation queue" })).toBeVisible();
  await m.goto("/admin/content");
  await expect(m.getByText("Your role doesn't include this screen.")).toBeVisible();
});
