import { test, expect } from "@playwright/test";
import { shot, noSideScroll, watchErrors, demo, passGate } from "./helpers.js";
import { newServer, fakeApi, seedServer } from "./fakeApi.js";

// Sprint 7: privacy and safety for the closed beta. Privacy policy and terms (SAF-10), data
// export and family deletion (SAF-03, SAF-04), editing and removing learners with undo
// (FAM-03), US signed consent (ONB-06b), beta tools and flags (OPS-06), calm errors (OFF-07),
// "What's new" (OFF-06), the virtual trail (MAP-05) and big touch targets (ACC-01).
test.describe.configure({ timeout: 150_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/, /ERR_INTERNET_DISCONNECTED/, /e2e crash/]);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

async function signIn(page, srv) {
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill("grace@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).not.toHaveURL(/\/auth\/verify/);
}

async function settings(page) {
  await page.goto("/family/settings");
  await passGate(page);
}

test("the privacy summary, full policy and terms, with version and a draft banner (SAF-10)", async ({
  page,
}, testInfo) => {
  await demo(page);
  await settings(page);
  const privacy = page.getByRole("region", { name: "Privacy" });
  await expect(privacy.getByText("Version 2026-10 · updated 2026-10-25")).toBeVisible();
  await privacy.getByRole("link", { name: "Privacy summary and policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await expect(page.getByTestId("legal-version")).toHaveText("Version 2026-10 · updated 2026-10-25");
  await expect(page.getByText(/first draft, waiting for review by our lawyer/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "The short version" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The full privacy policy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "7. How long we keep it" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s7-privacy");
  await page.getByRole("link", { name: "Terms of use" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s7-terms");
});

test("a learner is edited, then removed with two confirmations and brought back (FAM-03)", async ({
  page,
}, testInfo) => {
  await demo(page);
  await settings(page);
  const section = page.getByRole("region", { name: "Learners" });
  await section.getByRole("button", { name: "Edit Zawadi" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Zawadi" });
  await dialog.getByLabel("First name or nickname").fill("Zawi");
  await dialog.getByLabel("Birth year").click();
  await page.getByRole("option", { name: "2018", exact: true }).click();
  await expect(dialog.getByTestId("new-band")).toContainText("Explorer");
  await shot(page, testInfo, "s7-edit-learner");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(section.getByText("Zawi", { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("trailbuddies-family-v3")).state);
  const zawi = saved.learners.find((l) => l.name === "Zawi");
  expect(zawi.birth.year).toBe(2018);

  await section.getByRole("button", { name: "Remove Zawi?" }).click();
  const ask = page.getByRole("dialog");
  await expect(ask.getByRole("heading", { name: "Remove Zawi?" })).toBeVisible();
  await ask.getByRole("button", { name: "Remove" }).click();
  await expect(ask.getByRole("heading", { name: "Are you sure?" })).toBeVisible();
  await ask.getByRole("button", { name: "Yes, remove" }).click();
  await expect(section.getByText(/Will be deleted on .* \(7 days left\)/)).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s7-removing");
  // Gone from the children's profile picker...
  await page.goto("/play");
  await expect(page.getByRole("button", { name: /Zawi/ })).toHaveCount(0);
  // ...until a grown-up brings them back.
  await settings(page);
  await page.getByRole("button", { name: "Bring Zawi back" }).click();
  await page.goto("/play");
  await expect(page.getByRole("button", { name: /Zawi/ })).toBeVisible();
});

test("download our data and delete our family, with the email link and undo (SAF-03, SAF-04)", async ({
  page,
  context,
}, testInfo) => {
  const srv = seedServer(newServer());
  await fakeApi(context, srv);
  await signIn(page, srv);
  await settings(page);
  const privacy = page.getByRole("region", { name: "Privacy" });
  await privacy.getByRole("button", { name: "Email me a download link" }).click();
  await expect(privacy.getByText("Done! We sent the link to grace@example.com.")).toBeVisible();
  expect(srv.exports).toHaveLength(1);

  await privacy.getByRole("button", { name: "Delete our family" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Email me the link" }).click();
  await expect(privacy.getByText("Check your email and tap the link to confirm.")).toBeVisible();
  await shot(page, testInfo, "s7-delete-sent");
  const link = srv.sent.find((x) => x.kind === "delete");
  await page.goto(`/delete?token=${link.token}`);
  await expect(page.getByRole("heading", { name: "Delete your Trailbuddies family?" })).toBeVisible();
  await noSideScroll(page);
  await page.getByRole("button", { name: "Yes, delete our family" }).click();
  await expect(page.getByRole("heading", { name: "Your family will be deleted" })).toBeVisible();
  await shot(page, testInfo, "s7-delete-confirmed");
  await page.getByRole("link", { name: "Open Settings" }).click();
  await passGate(page);
  const banner = page.getByRole("region", { name: "Privacy" }).getByText(/Your family will be deleted on/);
  await expect(banner).toBeVisible();
  await page.getByRole("button", { name: "Keep our family" }).click();
  await expect(banner).toHaveCount(0);
  expect(srv.deletions.F1).toBeUndefined();
});

test("US families sign a consent form; nothing syncs until it's approved (ONB-06b)", async ({
  page,
  context,
}, testInfo) => {
  const srv = newServer();
  await fakeApi(context, srv);
  await signIn(page, srv);
  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
  await page.getByLabel("Your first name").fill("Grace");
  await page.getByLabel("Country").click();
  await page.getByRole("option", { name: "United States" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("group", { name: "Parent's consent form (United States)" })).toBeVisible();
  await page.getByLabel(/I'm this child's parent or legal guardian/).check();
  const go = page.getByRole("button", { name: "Continue" });
  await page.getByLabel("Your full name", { exact: true }).fill("Grace Miller");
  await page.getByLabel("Type your full name again to sign").fill("G M");
  await expect(go).toBeDisabled(); // the signature must be the full name
  await page.getByLabel("Type your full name again to sign").fill("grace miller");
  await noSideScroll(page);
  await shot(page, testInfo, "s7-us-consent");
  await go.click();
  await expect(page.getByRole("heading", { name: "Thank you! We're checking your form" })).toBeVisible();
  expect(srv.consents.F1).toMatchObject({ method: "signed_form", status: "pending" });
  expect(srv.consents.F1.evidence).toMatchObject({ parent_name: "Grace Miller", relationship: "parent" });
  await shot(page, testInfo, "s7-us-waiting");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Who's learning?" })).toBeVisible();
  await page.getByLabel("First name or nickname").fill("Ava");
  await page.getByLabel("Birth month").click();
  await page.getByRole("option", { name: "June" }).click();
  await page.getByLabel("Birth year").click();
  await page.getByRole("option", { name: "2020", exact: true }).click();
  await page.getByRole("button", { name: "Add learner" }).click();
  await page.waitForTimeout(2500);
  expect(Object.keys(srv.learners)).toHaveLength(0); // still only on this device
  // Steve approves the form (python -m app.admin consents --approve N); the next sync sends it.
  srv.consents.F1.status = "approved";
  await page.reload();
  await expect.poll(() => Object.values(srv.learners).map((l) => l.name), { timeout: 15_000 }).toEqual(["Ava"]);
});

test("beta: invite code, feedback button and questions (OPS-06)", async ({ page, context }, testInfo) => {
  const srv = seedServer(newServer());
  await fakeApi(context, srv);
  await signIn(page, srv);
  await settings(page);
  // Flags are off until the family joins the beta cohort.
  await expect(page.getByRole("button", { name: "Feedback" })).toHaveCount(0);
  const beta = page.getByRole("region", { name: "Closed beta" });
  await beta.getByLabel("Invite code").fill("tb-nope");
  await beta.getByRole("button", { name: "Join the beta" }).click();
  await expect(beta.getByText(/can't be used/)).toBeVisible();
  await beta.getByLabel("Invite code").fill("tb-beta22");
  await beta.getByRole("button", { name: "Join the beta" }).click();
  await expect(beta.getByText("Welcome to the beta!")).toBeVisible();
  await page.getByRole("button", { name: "Feedback" }).click();
  const dialog = page.getByRole("dialog", { name: "Tell us what you think" });
  await dialog.getByRole("button", { name: "Idea" }).click();
  await dialog.getByLabel("Your message").fill("More animal sounds please!");
  await shot(page, testInfo, "s7-feedback");
  await dialog.getByRole("button", { name: "Send" }).click();
  await expect(dialog.getByText("Thank you! We read every message.")).toBeVisible();
  expect(srv.feedback).toEqual([
    expect.objectContaining({ kind: "idea", message: "More animal sounds please!", screen: "/family/settings" }),
  ]);
  await dialog.getByRole("button", { name: "Done" }).click();
  await beta.getByRole("link", { name: "Beta questions and answers" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Beta questions" })).toBeVisible();
  await page.getByRole("button", { name: "Does it work without the internet?" }).click();
  await expect(page.getByText(/Lessons on the device work offline/)).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s7-faq");
});

test("something breaks mid-lesson: the buddy stays calm, answers are kept, the report has no names (OFF-07)", async ({
  page,
  context,
}, testInfo) => {
  const srv = newServer();
  await fakeApi(context, srv); // catches the scrubbed report at /api/errors
  await demo(page);
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await page.evaluate(() => sessionStorage.setItem("tb_crash", "1"));
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("trailbuddies-family-v3")).state.activeId);
  expect(before).toBeTruthy();
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: "Let's play!" }).click();
  await expect(page.getByText("Oops, let's try that again!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s7-oops");
  await expect.poll(() => srv.errors.length).toBeGreaterThan(0);
  const report = srv.errors[0];
  expect(report.message).toContain("[child]");
  expect(JSON.stringify(report)).not.toContain("Zawadi");
  expect(report.screen).toBe("/play/lesson/counting-1-5/1");
  await page.evaluate(() => sessionStorage.removeItem("tb_crash"));
  await page.getByRole("link", { name: "Back to the map" }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
});

test("grown-ups see what's new after an update, once (OFF-06)", async ({ page }, testInfo) => {
  await demo(page);
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("trailbuddies-family-v3"));
    raw.state.seenVersion = "0.6.0";
    localStorage.setItem("trailbuddies-family-v3", JSON.stringify(raw));
  });
  await page.goto("/family");
  await passGate(page);
  const note = page.getByRole("region", { name: "What's new" });
  await expect(note).toBeVisible();
  await expect(note.getByText(/Settings now has Privacy/)).toBeVisible();
  await shot(page, testInfo, "s7-whats-new");
  await note.getByRole("button", { name: "Got it" }).click();
  await expect(note).toHaveCount(0);
  await page.goto("/family");
  await passGate(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "What's new" })).toHaveCount(0);
});

test("the trail mounts only the stones near the screen (MAP-05)", async ({ page }, testInfo) => {
  await demo(page);
  await page.getByRole("button", { name: /Joseph/ }).click();
  await page.goto("/play/trail/numbers");
  const trail = page.locator("[data-stones]");
  await expect(trail).toBeVisible();
  const total = Number(await trail.getAttribute("data-stones"));
  const stones = trail.locator("button");
  await expect(stones.first()).toBeVisible();
  await page.waitForTimeout(500);
  const mounted = await stones.count();
  expect(total).toBeGreaterThan(20);
  expect(mounted).toBeLessThan(total);
  // Scroll to the far end: the last trophy is mounted then.
  await page.evaluate(() => {
    const el = document.querySelector("[data-stones]").parentElement;
    el.scrollTop = el.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(500);
  await expect(trail.locator("button").last()).toBeVisible();
  // Every stone is a big touch target (ACC-01).
  for (const box of await stones.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON())))
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(48);
  await shot(page, testInfo, "s7-trail");
});

test("children's screens have touch targets of at least 48 px (ACC-01)", async ({ page }) => {
  await demo(page);
  const small = async (where) =>
    page.evaluate((where) => {
      const out = [];
      for (const el of document.querySelectorAll("main button, main a[href], main [role=button], main [role=radio]")) {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (!r.width || !r.height || s.visibility === "hidden" || el.closest("[aria-hidden=true]")) continue;
        if (r.width < 47.5 || r.height < 47.5)
          out.push(`${where}: ${el.getAttribute("aria-label") || el.textContent.trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return out;
    }, where);
  const found = [];
  await page.goto("/play");
  found.push(...(await small("profiles")));
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
  found.push(...(await small("map")));
  for (const path of ["/play/trail/numbers", "/play/more/shop", "/play/more/games", "/play/more/badges", "/play/buddies"]) {
    await page.goto(path);
    await page.waitForTimeout(600);
    found.push(...(await small(path)));
  }
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: "Let's play!" }).click();
  await page.waitForTimeout(600);
  found.push(...(await small("lesson")));
  expect(found).toEqual([]);
});
