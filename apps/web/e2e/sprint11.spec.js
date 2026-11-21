import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { demo, noSideScroll, passGate, shot, watchErrors } from "./helpers.js";
import { fakeApi, newServer, seedServer } from "./fakeApi.js";

// Sprint 11, part 1: Badge Studio (BST-01…06, BDG-07), wishes (BST-07), real-world rewards (BST-04),
// awards from another device (BST-05), class badges (T05) and parents' class links.
test.describe.configure({ timeout: 150_000 });
test.beforeEach(({ page }) => watchErrors(page, [/Failed to load resource/]));
test.afterEach(({ page }) => expect(page.errors, "console errors").toEqual([]));

const wallet = (page) => page.getByLabel(/^\d+ treasures$/).first();
const tile = (page, title) => page.locator(`[data-wish="${title}"]`);

async function asChild(page, name) {
  await page.goto("/play");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
}

test("Badge Studio: design, how it's earned, the reward, and a child who already earned it", async ({ page }, testInfo) => {
  await page.clock.install();
  await demo(page);
  await page.goto("/family");
  await passGate(page);
  await page.getByRole("link", { name: "Make a badge" }).first().click();

  // Step 1, the design (BST-01): live preview, kept on this device while it's being made.
  const name = page.getByRole("textbox", { name: "Badge name" });
  const preview = page.getByRole("figure", { name: "Badge preview" });
  await name.fill("Garden Helper");
  await page.getByRole("button", { name: "Diamond" }).click();
  await page.getByRole("button", { name: "Green" }).click();
  await page.getByRole("button", { name: "Plant" }).click();
  await expect(preview).toContainText("Garden Helper");
  await expect(preview).toContainText("🌱");
  await expect(preview.locator("[data-custom-badge]")).toHaveCSS("clip-path", "polygon(50% 0px, 100% 50%, 50% 100%, 0px 50%)");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved on this device.")).toBeVisible();
  await page.reload();
  await passGate(page);
  await expect(name).toHaveValue("Garden Helper");
  await expect(page.getByRole("button", { name: "Diamond" })).toHaveAttribute("aria-pressed", "true");

  // A photo instead of the icon: refused if it isn't a picture; cropped square with no EXIF.
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") });
  await expect(page.getByText("That photo couldn’t be used.", { exact: false })).toBeVisible();
  await file.setInputFiles(fileURLToPath(new URL("./fixtures/dog-with-gps.jpg", import.meta.url)));
  const photo = preview.locator("img");
  await expect(photo).toBeVisible();
  expect(
    await photo.evaluate(async (img) => {
      await img.decode();
      const blob = await fetch(img.src).then((r) => r.blob());
      return { square: img.naturalWidth === img.naturalHeight, exif: new TextDecoder().decode(await blob.arrayBuffer()).includes("Exif\0\0") };
    }),
  ).toEqual({ square: true, exif: false });
  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByRole("button", { name: "Plant" })).toHaveAttribute("aria-pressed", "true");
  await noSideScroll(page);
  await page.getByRole("button", { name: "Next: how it’s earned" }).click();

  // Step 2 (BST-02…06): the rule, read back in plain English.
  const summary = page.locator("#rule-summary");
  await expect(summary).toHaveText("A grown-up awards it.");
  await page.getByRole("button", { name: "A combination" }).click();
  await expect(summary).toHaveText("Earned when they reach 50 stars and meet the daily goal on 5 days in a week.");
  await page.getByRole("button", { name: "Add a condition" }).click();
  await expect(page.getByRole("button", { name: "Add a condition" })).toHaveCount(0); // 3 at most
  await page.getByRole("button", { name: "Any of these (or)" }).click();
  await expect(summary).toContainText(", or reach 50 stars.");
  await page.getByRole("button", { name: "Finish a lesson" }).click();
  await expect(summary).toHaveText("Earned when they finish “Around our house”.");
  await page.getByRole("button", { name: "Reach a number" }).click();
  await page.getByRole("spinbutton", { name: "How many" }).fill("5");
  await expect(summary).toHaveText("Earned when they reach 5 stars.");

  // BST-03: treasures are capped, with the reason.
  const treasures = page.getByRole("spinbutton", { name: "Treasures when earned" });
  await treasures.fill("60");
  await expect(page.getByText("The most is 50 treasures, so the shop stays fair for everyone.").first()).toBeVisible();
  await page.getByRole("button", { name: "Save badge" }).click();
  await expect(page).toHaveURL(/\/family\/create\/badge/); // not saved
  await treasures.fill("20");
  await page.getByRole("textbox", { name: "Real-world reward (optional)" }).fill("Pick Friday's movie");
  await page.getByRole("textbox", { name: "Message from you (optional)" }).fill("Well done, gardener!");
  // BST-06: only Zawadi can earn this one.
  const who = page.getByRole("group", { name: "Who can earn it?" });
  await who.getByRole("button", { name: "Amani" }).click();
  await who.getByRole("button", { name: "Joseph" }).click();
  await expect(who.getByRole("button", { name: "Zawadi" })).toHaveAttribute("aria-pressed", "true");
  await noSideScroll(page);
  await shot(page, testInfo, "s11-badge-studio-earn");
  await page.getByRole("button", { name: "Save badge" }).click();

  // Zawadi has 5 stars already: she gets it now and sees it next time.
  await expect(page).toHaveURL(/\/family\/rewards\?tab=award/);
  await expect(page.getByText("“Garden Helper” is saved. Zawadi already earned it and will see a celebration next time.")).toBeVisible();
  await expect(page.locator('[data-badge-row="Garden Helper"]')).toContainText("Earned when they reach 5 stars.");
  await shot(page, testInfo, "s11-rewards-award");

  // The child: a celebration with the grown-up's message, the treasures, then the badge book.
  await asChild(page, "Zawadi");
  const party = page.getByRole("dialog", { name: "New badge!" });
  await expect(party).toBeVisible();
  await expect(party).toContainText("Garden Helper");
  await expect(party).toContainText("“Well done, gardener!”");
  await expect(party.getByLabel("+20", { exact: true })).toBeVisible();
  await shot(page, testInfo, "s11-award-celebration");
  await party.getByRole("button", { name: /badge book/i }).click();
  await page.goto("/play/map");
  await expect(party).toHaveCount(0); // celebrated once on this device
  await page.goto("/play/more/badges");
  await expect(page.locator('[data-custom="Garden Helper"]')).toBeVisible();
  // BST-04: the real-world reward is on her wishes, waiting.
  await page.goto("/play/more/wishes");
  await expect(tile(page, "Pick Friday's movie")).toHaveAttribute("data-status", "earned");
  await expect(tile(page, "Pick Friday's movie")).toContainText("Your grown-up will bring it");

  // The grown-up delivers it; the child sees the thank-you.
  await page.goto("/family/rewards");
  await passGate(page);
  await page.getByRole("button", { name: "Pick Friday's movie delivered to Zawadi" }).click();
  await expect(page.getByText("Marked as delivered. Zawadi will see a thank-you.")).toBeVisible();
  await asChild(page, "Zawadi");
  await page.goto("/play/more/wishes");
  await expect(tile(page, "Pick Friday's movie")).toHaveAttribute("data-status", "delivered");
  await expect(tile(page, "Pick Friday's movie")).toContainText("Delivered! Thank you!");
});

test("wishes: save up, ask, 'not now' gives treasures back, approve and deliver", async ({ page }, testInfo) => {
  await demo(page);
  await page.getByRole("button", { name: /Zawadi/ }).click();
  await page.goto("/play/more/wishes");
  await expect(wallet(page)).toHaveAttribute("aria-label", "110 treasures");
  const story = tile(page, "Bedtime story of my choice");
  const park = tile(page, "Extra park time");
  await expect(park).toContainText("40 more to go");
  await expect(park.getByRole("progressbar", { name: "73% saved" })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s11-wishes");
  await story.getByRole("button", { name: "Ask for it!" }).click();
  await expect(story).toHaveAttribute("data-status", "asked");
  await expect(story).toContainText("Waiting for your grown-up");
  await expect(wallet(page)).toHaveAttribute("aria-label", "10 treasures"); // held

  // The grown-up sees it on the home screen, then says "not now": the treasures come back.
  await page.goto("/family");
  await passGate(page);
  const waiting = page.getByRole("heading", { name: "Waiting for you" }).locator("..");
  await expect(waiting).toContainText("Zawadi asked for “Bedtime story of my choice”");
  await waiting.getByRole("link", { name: "Review" }).first().click();
  const request = page.locator('[data-request="Bedtime story of my choice"]');
  await expect(request).toContainText("100 treasures are kept safe until you answer.");
  await shot(page, testInfo, "s11-rewards-requests");
  await request.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByText("Zawadi’s treasures are back. The wish stays on the list.")).toBeVisible();

  await asChild(page, "Zawadi");
  await expect(wallet(page)).toHaveAttribute("aria-label", "110 treasures");
  await page.goto("/play/more/wishes");
  await story.getByRole("button", { name: "Ask for it!" }).click();

  // Approve, then deliver: the treasures stay spent.
  await page.goto("/family/rewards");
  await passGate(page);
  await page.locator('[data-request="Bedtime story of my choice"]').getByRole("button", { name: "Yes, approve" }).click();
  await expect(page.getByText("Zawadi will see “Approved! Coming soon”.")).toBeVisible();
  await asChild(page, "Zawadi");
  await page.goto("/play/more/wishes");
  await expect(story).toContainText("Approved! Coming soon");
  await page.goto("/family/rewards");
  await passGate(page);
  await page.getByRole("button", { name: "Bedtime story of my choice delivered to Zawadi" }).click();
  await asChild(page, "Zawadi");
  await page.goto("/play/more/wishes");
  await expect(story).toContainText("Delivered! Thank you!");
  await expect(wallet(page)).toHaveAttribute("aria-label", "10 treasures");

  // A new wish for Amani, from the wish list.
  await page.goto("/family/rewards?tab=lists");
  await passGate(page);
  await page.getByRole("group", { name: "Which child" }).getByRole("button", { name: "Amani" }).click();
  await expect(page.getByText("Amani has no wishes yet.")).toBeVisible();
  const form = page.getByRole("form", { name: "Add a wish for Amani" });
  await form.getByRole("textbox", { name: "The wish" }).fill("Ice cream on Saturday");
  await form.getByRole("button", { name: "🍦" }).click();
  await form.getByRole("button", { name: "50", exact: true }).click();
  await form.getByRole("button", { name: "Add wish" }).click();
  await expect(page.locator('[data-wish="Ice cream on Saturday"]')).toContainText("50 treasures · saving up");
  await noSideScroll(page);
});

test("a grown-up awards a badge from their phone; the child celebrates on the family tablet", async ({ browser }, testInfo) => {
  const srv = seedServer(newServer());
  const phone = await browser.newContext();
  const tablet = await browser.newContext();
  await fakeApi(phone, srv);
  await fakeApi(tablet, srv);
  const p = await phone.newPage();
  const k = await tablet.newPage();
  for (const page of [p, k]) {
    watchErrors(page, [/Failed to load resource/]);
    await page.goto("/start/account");
    await page.getByLabel("Email address").fill("grace@example.com");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
    await expect(page).not.toHaveURL(/\/auth\/verify/);
  }
  // The tablet opens Wanjiru's map once (nothing to celebrate yet).
  await asChild(k, "Wanjiru");

  // The phone makes a hand-given badge, then awards it.
  await p.goto("/family/create/badge");
  await passGate(p);
  await p.getByRole("textbox", { name: "Badge name" }).fill("Tidy Champion");
  await p.getByRole("button", { name: "Broom" }).click();
  await p.getByRole("button", { name: "Next: how it’s earned" }).click();
  await p.getByRole("textbox", { name: "Message from you (optional)" }).fill("Your room looks great!");
  await p.getByRole("button", { name: "Save badge" }).click();
  await expect(p.getByText("“Tidy Champion” is saved.")).toBeVisible();
  await expect.poll(() => Object.values(srv.badges).map((b) => b.name)).toEqual(["Tidy Champion"]);
  await p.getByRole("button", { name: "Award Tidy Champion to Wanjiru" }).click();
  await expect(p.getByText("Wanjiru will see the Tidy Champion celebration next time they open the app.")).toBeVisible();
  await expect.poll(() => srv.events.filter((e) => e.type === "badge_awarded").length).toBe(1);

  // Next time the tablet opens the app, Wanjiru celebrates.
  await k.reload();
  const party = k.getByRole("dialog", { name: "New badge!" });
  await expect(party).toContainText("Tidy Champion");
  await expect(party).toContainText("“Your room looks great!”");
  await expect(party.getByLabel("+10", { exact: true })).toBeVisible();
  await party.getByRole("button", { name: /badge book/i }).click();

  // BDG-07: deleting the badge keeps it in her badge book; a grown-up can hide it instead.
  await p.goto("/family/create/badge?id=" + Object.keys(srv.badges)[0]);
  await passGate(p);
  await p.getByRole("button", { name: "Next: how it’s earned" }).click();
  await p.getByRole("button", { name: "Delete badge" }).click();
  await expect(p.getByText("Children who already earned it keep it in their badge book.", { exact: false })).toBeVisible();
  await p.getByRole("button", { name: "Delete", exact: true }).click();
  await expect.poll(() => Object.keys(srv.badges).length).toBe(0);
  await k.goto("/play/more/badges");
  await expect(k.locator('[data-custom="Tidy Champion"]')).toBeVisible();
  await p.getByRole("button", { name: "Hide Tidy Champion from the badge book" }).click();
  await expect.poll(() => srv.events.filter((e) => e.type === "badge_hidden").length).toBe(1);
  await k.reload();
  await expect(k.locator('[data-custom="Tidy Champion"]')).toHaveCount(0);
  await shot(p, testInfo, "s11-rewards-hide");
  for (const page of [p, k]) expect(page.errors, "console errors").toEqual([]);
  await phone.close();
  await tablet.close();
});

test("teachers make class badges, award them, and they show on the badge wall and to linked parents", async ({ browser }, testInfo) => {
  const srv = seedServer(newServer());
  srv.users.T1 = { id: "T1", email: "priya@stmarys.sch.ke", name: "Ms Priya" };
  srv.schools.SC1 = { id: "SC1", name: "St Mary's Primary", domain: "stmarys.sch.ke", consent: { name: "Grace Achieng", role: "Head teacher" } };
  srv.teachers.T1 = { school_id: "SC1", tips: {} };
  srv.classes.C1 = { id: "C1", teacher: "T1", school_id: "SC1", name: "Class 1B", year_group: "Grade 1", band: "sprout", join_code: "ABC234" };
  const kids = { Zawadi: "01JS0000000000000000000011", Amani: "01JS0000000000000000000012", Baraka: "01JS0000000000000000000013" };
  for (const [first, id] of Object.entries(kids))
    srv.students[id] = { id, class_id: "C1", first_name: first, initial: null, avatar_color: "sky", pictures: ["cat", "sun", "moon"], learner_id: null, scope: "class" };
  // Zawadi is Grace's Wanjiru at home.
  srv.students[kids.Zawadi].learner_id = "01JB0000000000000000000001";

  const teacher = await browser.newContext();
  const parent = await browser.newContext();
  await fakeApi(teacher, srv);
  await fakeApi(parent, srv);
  const page = await teacher.newPage();
  watchErrors(page, [/Failed to load resource/]);
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill("priya@stmarys.sch.ke");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).not.toHaveURL(/\/auth\/verify/);
  await page.goto("/teach/badges");
  await passGate(page);
  await page.getByRole("link", { name: "Class badges for Class 1B" }).click();

  const make = page.getByRole("form", { name: "Make a class badge" });
  await make.getByRole("textbox", { name: "Badge name" }).fill("Reading Rocket");
  await make.getByRole("button", { name: /Rocket/ }).click();
  await make.getByRole("button", { name: "Pink" }).click();
  await expect(make.getByRole("status")).toHaveText("You award it.");
  await make.getByRole("button", { name: "Everything assigned this week" }).click();
  await expect(make.getByRole("status")).toHaveText("Earned when they finish everything assigned this week.");
  await make.getByRole("button", { name: "I award it" }).click();
  await make.getByRole("spinbutton", { name: "Treasures when earned" }).fill("15");
  await make.getByRole("button", { name: "Save badge" }).click();
  await expect(page.getByText("“Reading Rocket” is saved.")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s11-class-badges");

  // Award to two children; again, and Zawadi already has it.
  const awardBox = page.getByRole("region", { name: "Award Reading Rocket" });
  await awardBox.getByRole("group", { name: "Award to" }).getByRole("button", { name: "Zawadi" }).click();
  await awardBox.getByRole("group", { name: "Award to" }).getByRole("button", { name: "Amani" }).click();
  await awardBox.getByRole("button", { name: "Award to 2" }).click();
  await expect(page.getByText("Reading Rocket awarded to 2. They’ll see it on the class device.")).toBeVisible();
  await awardBox.getByRole("button", { name: "Whole class" }).click();
  await awardBox.getByRole("button", { name: "Award to 3" }).click();
  await expect(page.getByText("Reading Rocket awarded to 1.", { exact: false })).toBeVisible();
  await expect(page.getByText("Already had it: Zawadi, Amani.", { exact: false })).toBeVisible();
  expect(srv.classEvents.filter((e) => e.type === "badge_awarded").length).toBe(3);

  // The badge wall shows the class's own badge.
  await page.getByRole("link", { name: "Badge wall" }).click();
  await expect(page.locator('li[data-student="Amani"] [data-badge]').first()).toBeVisible();
  await expect(page.locator('li[data-student="Amani"] [data-custom-badge]')).toBeVisible();

  // Grace, a linked parent, sees it on her Classes page.
  const g = await parent.newPage();
  watchErrors(g, [/Failed to load resource/]);
  await g.goto("/start/account");
  await g.getByLabel("Email address").fill("grace@example.com");
  await g.getByRole("button", { name: "Email me a sign-in link" }).click();
  await g.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(g).not.toHaveURL(/\/auth\/verify/);
  await g.goto("/family/classes");
  await passGate(g);
  const badges = g.getByLabel("Badges Wanjiru earned in class");
  await expect(badges).toContainText("Reading Rocket");
  await noSideScroll(g);
  for (const x of [page, g]) expect(x.errors, "console errors").toEqual([]);
  await teacher.close();
  await parent.close();
});
