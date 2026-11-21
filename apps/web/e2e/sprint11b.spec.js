import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { noSideScroll, passGate, settled, shot, watchErrors } from "./helpers.js";
import { fakeApi, newServer, seedServer } from "./fakeApi.js";

// Sprint 11, part 2: share codes (SHR-01…05), the image check (SAF-08, BST-08) and the
// moderation queue (MOD-01…03), at phone, tablet and desktop.
test.describe.configure({ timeout: 180_000 });

const PHOTO = readFileSync(new URL("./fixtures/dog-with-gps.jpg", import.meta.url));
const M1 = "01JB0000000000000000000M01";
const L1 = "01JB0000000000000000000P01";
const ALLOW = [/Failed to load resource/];

/** Grace's family can add photos and has a lesson with one; Amina's is a second family. */
function world() {
  const srv = seedServer(newServer());
  srv.consents.F1.scopes = { progress: true, photos: true, voice: true };
  srv.media[M1] = { family: "F1", kind: "photo", type: "image/jpeg", bytes: PHOTO, status: "ready" };
  srv.lessons[L1] = {
    id: L1,
    family_id: "F1",
    title: "Our Farm",
    template: "learn",
    cards: [
      { id: "c1", label: "Daisy the cow", photo: M1 },
      { id: "c2", label: "Kuku the hen", emoji: "🐔" },
      { id: "c3", label: "Bee", emoji: "🐝" },
    ],
    assigned: ["01JB0000000000000000000001"],
    version: 2,
    options: {},
    updated_at: "2026-11-01T10:00:00Z",
  };
  srv.users.U2 = { id: "U2", email: "amina@example.com", name: "Amina" };
  srv.members.push({ family: "F2", user: "U2", role: "owner" });
  srv.families.F2 = { ...srv.families.F1, id: "F2", name: "Amina's family" };
  srv.consents.F2 = { ...srv.consents.F1, scopes: { progress: true, photos: true, voice: true } };
  srv.learners["01JB0000000000000000000002"] = {
    ...srv.learners["01JB0000000000000000000001"],
    id: "01JB0000000000000000000002",
    family_id: "F2",
    name: "Baraka",
  };
  srv.users.U9 = { id: "U9", email: "steve@trailbuddies.africa", name: "Steve" };
  return srv;
}

async function device(browser, srv, email, { faces = 0, flagged = false } = {}) {
  const context = await browser.newContext();
  await fakeApi(context, srv);
  const page = await context.newPage();
  watchErrors(page, ALLOW);
  // The image check answers for the models (they're tested on their own below).
  await page.addInitScript(
    ([n, f]) => {
      globalThis.__tbImageCheck = async () => ({ faces: n, flagged: f, reason: f ? "nudity" : null, scores: { porn: f ? 0.92 : 0.01 } });
    },
    [faces, flagged],
  );
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).not.toHaveURL(/\/auth\/verify/);
  return { context, page };
}

test("share a lesson by code: checklist, review, import a copy, report, stop sharing", async ({ browser }, testInfo) => {
  const srv = world();
  const grace = await device(browser, srv, "grace@example.com", { faces: 1 });
  const g = grace.page;

  // SHR-01 + SHR-03: Share → choose the lesson → the safety checklist.
  await settled(g);
  await g.goto("/family/create");
  await passGate(g);
  await g.getByRole("link", { name: "Share codes" }).click();
  await expect(g.getByText("None yet.")).toBeVisible();
  await g.getByRole("button", { name: "Share something" }).click();
  const dialog = g.getByRole("dialog");
  await dialog.getByRole("button", { name: "Our Farm" }).click();
  await dialog.getByRole("button", { name: "Next: safety check" }).click();
  await expect(dialog.getByText("We found a face in the photos below.", { exact: false })).toBeVisible();
  const make = dialog.getByRole("button", { name: "Make the code" });
  await dialog.getByRole("checkbox", { name: "No names or addresses" }).check();
  await expect(make).toBeDisabled(); // the face still needs an answer
  await dialog.getByRole("button", { name: "This isn't a child" }).click();
  await expect(dialog.getByText("checked by our safety team first", { exact: false })).toBeVisible();
  await noSideScroll(g);
  await shot(g, testInfo, "s11b-share-checklist");
  await make.click();
  const code = (await dialog.getByTestId("share-code").textContent()).trim();
  expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  await expect(dialog.getByRole("img", { name: "QR code for this share code" }).locator("svg")).toBeVisible();
  await expect(dialog.getByText("Being checked by our safety team.", { exact: false })).toBeVisible();
  await shot(g, testInfo, "s11b-share-code");
  // SHR-04: the package has the cards and nothing about the children; the checklist is logged.
  const share = Object.values(srv.shares)[0];
  expect(JSON.stringify(share.package)).not.toMatch(/01JB0000000000000000000001|assigned|Wanjiru/);
  expect(share.checklist).toMatchObject({ no_names: true, faces_checked: true, not_child: [M1] });
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(g.locator(`[data-share="${code}"]`)).toContainText("Being checked");

  // Amina types the code before it's reviewed.
  const amina = await device(browser, srv, "amina@example.com");
  const a = amina.page;
  await settled(a);
  await a.goto(`/family/create/import?code=${code.replace("-", "")}`);
  await passGate(a);
  await a.getByRole("button", { name: "Find it" }).click();
  await expect(a.getByText("still being checked by our safety team", { exact: false })).toBeVisible();

  // MOD-01: the safety team sees it in the queue, the photo blurred until they choose to look.
  const steve = await device(browser, srv, "steve@trailbuddies.africa");
  const s = steve.page;
  await s.goto("/admin/moderation");
  await expect(s.getByText("1 open · target: reviewed within 24 hours")).toBeVisible();
  const detail = s.getByTestId("mod-detail");
  await expect(detail).toContainText("Our Farm");
  await expect(detail).toContainText(code);
  await expect(detail.getByRole("img", { name: "Photo under review" })).toHaveCSS("filter", /blur/);
  await detail.getByRole("button", { name: "Show images" }).click();
  await expect(detail.getByRole("img", { name: "Photo under review" })).toHaveCSS("filter", "none");
  await detail.getByRole("button", { name: "Approve" }).click();
  await expect(s.getByText("Write a reason first", { exact: false })).toBeVisible();
  await detail.getByRole("textbox", { name: /Reason/ }).fill("A cow and a hen, no people.");
  await noSideScroll(s);
  await shot(s, testInfo, "s11b-moderation");
  await detail.getByRole("button", { name: "Approve" }).click();
  await expect(s.getByText("Approved: the code works now.")).toBeVisible();
  await s.getByRole("button", { name: "Audit log" }).click();
  await expect(s.getByRole("row", { name: /steve@trailbuddies.africa.*Approve/ })).toBeVisible();

  // SHR-02: the preview, then Amina's own copy.
  await a.getByRole("button", { name: "Find it" }).click();
  const preview = a.getByTestId("share-preview");
  await expect(preview).toContainText("Our Farm");
  await expect(preview).toContainText("3 cards");
  await expect(preview.getByRole("img", { name: "Daisy the cow" })).toBeVisible();
  await noSideScroll(a);
  await shot(a, testInfo, "s11b-import-preview");
  await preview.getByRole("button", { name: "Import a copy" }).click();
  await a.getByRole("link", { name: "Choose who gets it" }).click();
  await expect(a.getByLabel("Lesson name")).toHaveValue("Our Farm");
  const copy = Object.values(srv.lessons).find((l) => l.family_id === "F2");
  expect(copy.assigned).toEqual([]);
  expect(copy.cards[0].photo).not.toBe(M1); // a copy of the photo, not the original

  // SHR-05: report it with a reason.
  await a.getByRole("button", { name: "Report this lesson" }).click();
  const report = a.getByRole("dialog");
  await report.getByRole("radio", { name: "Names or personal details" }).check();
  await report.getByRole("button", { name: "Send report" }).click();
  await expect(a.getByText("Our safety team will look at it and email you", { exact: false })).toBeVisible();
  expect(srv.reports).toEqual([{ share_id: share.id, family_id: "F2", reason: "personal-details" }]);

  // SHR-01 scenario 2: Grace stops the code; Amina's copy stays.
  await g.getByRole("button", { name: "Stop sharing" }).click();
  await expect(g.getByText("Copies people already made stay with them.")).toBeVisible();
  await expect(g.locator(`[data-share="${code}"]`)).toContainText("Stopped");
  await a.goto(`/family/create/import?code=${code}`);
  await passGate(a);
  await a.getByRole("button", { name: "Find it" }).click();
  await expect(a.getByText("This code is no longer available.", { exact: false })).toBeVisible();
  await a.goto("/family/create");
  await passGate(a);
  await expect(a.getByText("Our Farm")).toBeVisible();

  for (const p of [g, a, s]) expect(p.errors, "console errors").toEqual([]);
  for (const d of [grace, amina, steve]) await d.context.close();
});

test("the image check hides a flagged photo until the safety team looks (SAF-08, BST-08)", async ({ browser }, testInfo) => {
  const srv = world();
  const { context, page } = await device(browser, srv, "grace@example.com", { flagged: true });
  await settled(page);
  await page.goto("/family/create/lesson");
  await passGate(page);
  await page.getByLabel("Lesson name").fill("Garden");
  await page.getByRole("button", { name: "Add a card" }).click();
  await page.getByTestId("photo-input").setInputFiles({ name: "x.jpg", mimeType: "image/jpeg", buffer: PHOTO });
  await expect(page.getByText("This photo is hidden for now.")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s11b-flagged-photo");
  // It uploads flagged, and the queue gets an entry for it.
  await page.getByLabel("Name on the card").fill("Rose");
  await page.getByRole("button", { name: "Save card" }).click();
  await settled(page);
  await page.reload(); // opening the app uploads waiting photos
  await expect
    .poll(() => Object.values(srv.modItems).map((i) => i.kind), { timeout: 30_000 })
    .toContain("upload");
  expect(Object.values(srv.media).some((m) => m.status === "flagged" && m.scan?.flagged)).toBe(true);

  // BST-08: on a badge, a flagged photo is refused with the reason.
  await settled(page);
  await page.goto("/family/create/badge");
  await passGate(page);
  await page.getByRole("textbox", { name: "Badge name" }).fill("Gardener");
  await page.locator('input[type="file"]').setInputFiles({ name: "x.jpg", mimeType: "image/jpeg", buffer: PHOTO });
  await expect(page.getByText("That photo can't go on a badge", { exact: false })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Badge preview" }).locator("img")).toHaveCount(0);
  expect(page.errors, "console errors").toEqual([]);
  await context.close();
});

test("the open-source models load from our own site and check photos on the device", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one size is enough for the real models");
  const srv = world();
  const context = await browser.newContext();
  await fakeApi(context, srv);
  const page = await context.newPage();
  watchErrors(page, ALLOW);
  const outside = new Set();
  const models = new Set();
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.hostname !== "localhost") outside.add(u.hostname);
    if (u.pathname.startsWith("/models/")) models.add(u.pathname);
  });
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill("grace@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).not.toHaveURL(/\/auth\/verify/);
  await settled(page);
  await page.goto("/family/create/shares");
  await passGate(page);
  await page.getByRole("button", { name: "Share something" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Our Farm" }).click();
  await dialog.getByRole("button", { name: "Next: safety check" }).click();
  // No stand-in here: TensorFlow.js runs NSFWJS and the face detector in this browser.
  await expect(dialog.getByText("Checking photos for faces", { exact: false })).toHaveCount(0, { timeout: 90_000 });
  // The dog photo has no person in it, so the check passes (a failed check would ask about it).
  await expect(dialog.getByText("We found a face", { exact: false })).toHaveCount(0);
  await dialog.getByRole("checkbox", { name: "No names or addresses" }).check();
  await expect(dialog.getByRole("button", { name: "Make the code" })).toBeEnabled();
  expect([...models].sort()).toEqual([
    "/models/face/tiny_face_detector_model-weights_manifest.json",
    "/models/face/tiny_face_detector_model.bin",
    "/models/nsfw/group1-shard1of1.bin",
    "/models/nsfw/model.json",
  ]);
  expect([...outside]).toEqual([]); // no photo, and no model request, leaves Trailbuddies
  expect(page.errors, "console errors").toEqual([]);
  await context.close();
});

test("a teacher shares the class's badges and imports a set into another class", async ({ browser }, testInfo) => {
  const srv = world();
  srv.users.T1 = { id: "T1", email: "priya@stmarys.sch.ke", name: "Ms Priya" };
  srv.schools.SC1 = { id: "SC1", name: "St Mary's Primary", domain: "stmarys.sch.ke", consent: { name: "Grace Achieng", role: "Head teacher" } };
  srv.teachers.T1 = { school_id: "SC1", tips: {} };
  for (const [id, name] of [["C1", "Class 1B"], ["C2", "Class 2A"]])
    srv.classes[id] = { id, teacher: "T1", school_id: "SC1", name, year_group: "Grade 1", band: "sprout", join_code: `ABC23${id.at(-1)}` };
  srv.badges["01JB0000000000000000000B01"] = {
    id: "01JB0000000000000000000B01",
    class_id: "C1",
    name: "Kind class",
    shape: "circle",
    colour: "blue",
    icon: "heart",
    rule: { type: "assignment" },
    treasures: 20,
    audience: "class",
    updated_at: "2026-11-01T10:00:00Z",
  };
  const { context, page } = await device(browser, srv, "priya@stmarys.sch.ke");
  await page.goto("/teach/class-badges?id=C1");
  await passGate(page);
  const sharing = page.getByRole("region", { name: "Share badges" }).or(page.getByLabel("Share badges"));
  await page.getByRole("button", { name: "Share these badges" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Kind class" }).click();
  await dialog.getByRole("button", { name: "Next: safety check" }).click();
  await dialog.getByRole("checkbox", { name: "No names or addresses" }).check();
  await dialog.getByRole("button", { name: "Make the code" }).click();
  const code = (await dialog.getByTestId("share-code").textContent()).trim();
  await expect(dialog.getByText("Works for 30 days.", { exact: false })).toBeVisible(); // no photos: works at once
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(sharing.locator(`[data-share="${code}"]`)).toContainText("Working");

  await page.goto("/teach/class-badges?id=C2");
  await passGate(page);
  await page.getByLabel("Share code").fill(code);
  await page.getByRole("button", { name: "Find it" }).click();
  await expect(page.getByTestId("share-preview")).toContainText("Kind class");
  await page.getByRole("button", { name: "Import a copy" }).click();
  await expect(page.getByText("Imported into this class (badges: 1).")).toBeVisible();
  expect(Object.values(srv.badges).filter((b) => b.class_id === "C2").map((b) => b.name)).toEqual(["Kind class"]);
  await noSideScroll(page);
  await shot(page, testInfo, "s11b-class-share");
  expect(page.errors, "console errors").toEqual([]);
  await context.close();
});
