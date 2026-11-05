import { test, expect } from "@playwright/test";
import { shot, noSideScroll, watchErrors, passGate } from "./helpers.js";
import { newServer, fakeApi, seedServer } from "./fakeApi.js";

// Sprint 9: the teacher path (ONB-01, ONB-13), classes and rosters (CLS-01..03), class play and
// school consent (CLS-06), the first-week checklist (HLP-03) and parents linking a child with
// control over what the teacher sees (CLS-04, CLS-05, PAR-08), at phone, tablet and desktop.
test.describe.configure({ timeout: 150_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/, /ERR_INTERNET_DISCONNECTED/]);
  await page.addInitScript(() => {
    localStorage.setItem("tb_e2e", "1");
    window.print = () => (window.__printed = true);
  });
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

async function verify(page, srv) {
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).not.toHaveURL(/\/auth\/verify/);
}

/** A teacher with a class and two children, set up on the server. */
function classOnServer(srv) {
  srv.users.T1 = { id: "T1", email: "priya@stmarys.sch.ke", name: "Ms Priya" };
  srv.schools.SC1 = { id: "SC1", name: "St Mary's Primary", domain: "stmarys.sch.ke", consent: null };
  srv.teachers.T1 = { school_id: "SC1", tips: {} };
  const cid = "01JC0000000000000000000001";
  srv.classes[cid] = {
    id: cid,
    teacher: "T1",
    school_id: "SC1",
    name: "Class 1B",
    year_group: "Grade 1",
    band: "sprout",
    join_code: "ABC234",
  };
  for (const [i, [name, initial]] of [
    ["Wanjiru", "K"],
    ["Baraka", null],
  ].entries()) {
    const id = `01JS000000000000000000000${i + 1}`;
    srv.students[id] = {
      id,
      class_id: cid,
      first_name: name,
      initial,
      avatar_color: "sky",
      pictures: ["cat", "sun", "moon"],
      learner_id: null,
      scope: "class",
    };
  }
  return cid;
}

test("a teacher signs up, makes a class, adds children and prints parent letters (ONB-13, CLS-01..03, HLP-03)", async ({
  page,
  context,
}, testInfo) => {
  const srv = newServer();
  await fakeApi(context, srv);
  await page.goto("/start");
  await page.getByRole("button", { name: "I'm a teacher" }).click();
  await expect(page.getByRole("heading", { name: "Your teacher account" })).toBeVisible();
  await page.getByLabel("Email address").fill("priya@stmarys.sch.ke");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await verify(page, srv);
  await expect(page).toHaveURL(/\/teach\/start$/);
  await page.getByLabel("Your name").fill("Ms Priya");
  await page.getByLabel("School name").fill("St Mary's Primary");
  await noSideScroll(page);
  await shot(page, testInfo, "s9-teacher-start");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/teach$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hello, Ms Priya" })).toBeVisible();
  await expect(page.getByText("Start by creating your first class.")).toBeVisible();
  const checklist = page.getByRole("region", { name: "Your first week" });
  await expect(checklist.locator('[data-done="yes"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Create a class" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Create a class" });
  await dialog.getByLabel("Class name").fill("Class 1B");
  await dialog.getByLabel("Year group (optional)").fill("Grade 1");
  await dialog.getByRole("button", { name: "Create class" }).click();
  await expect(page).toHaveURL(/\/teach\/class\?id=/);
  await expect(page.getByTestId("join-code")).toHaveText(/^[A-HJ-NP-Z2-9]{6}$/);
  await expect(page.getByRole("img", { name: /QR code for class code/ })).toBeVisible();

  // Paste a list: a surname becomes an initial, and two Amanis need telling apart.
  await page.getByLabel("First names").fill("Zawadi\nAmani\nBaraka Otieno\nAmani");
  await expect(page.getByText("Some children share a name.")).toBeVisible();
  await page.getByRole("textbox", { name: "Initial for Amani 2" }).fill("W");
  // One initial is enough to tell them apart.
  await expect(page.getByRole("textbox", { name: "Initial for Amani 4" })).toHaveCount(0);
  await page.getByRole("button", { name: "Add 4 children" }).click();
  const roster = page.getByRole("region", { name: "Children" });
  for (const n of ["Zawadi", "Amani W.", "Amani", "Baraka O."])
    await expect(roster.locator(`[data-student="${n}"]`)).toBeVisible();
  await expect(roster.getByRole("img", { name: /Zawadi's pictures: Cat, Sun, Moon/ })).toBeVisible();
  // CLS-06: their play waits for the school's agreement.
  const terms = page.getByRole("region", { name: "Children without a parent account" });
  await expect(terms).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s9-class");
  await terms.getByLabel("Your full name").fill("Grace Achieng");
  await terms.getByLabel("Your role").fill("Head teacher");
  await terms.getByRole("checkbox").check();
  await terms.getByRole("button", { name: "Agree for the school" }).click();
  await expect(terms).toHaveCount(0);
  expect(srv.schools.SC1.consent).toMatchObject({ name: "Grace Achieng", role: "Head teacher" });

  await page.getByRole("link", { name: "Print parent letters" }).click();
  await expect(page.locator("[data-letter]")).toHaveCount(4);
  const letter = page.locator('[data-letter="Amani W."]');
  await expect(letter.getByText("Dear parent or carer of Amani W.,")).toBeVisible();
  await expect(letter.getByText("Never your family's own lessons, photos or recordings.")).toBeVisible();
  await expect(letter.locator("[data-qr]")).toHaveAttribute("data-qr", /\/family\/join\?code=/);
  await shot(page, testInfo, "s9-letters");
  await page.getByRole("button", { name: "Print or save as PDF" }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
  await expect.poll(() => srv.teachers[Object.keys(srv.teachers)[0]].tips.printed).toBe(true);
  await page.goto("/teach");
  await passGate(page);
  await expect(checklist.locator('[data-step="students"]')).toHaveAttribute("data-done", "yes");
  await expect(checklist.locator('[data-step="letters"]')).toHaveAttribute("data-done", "yes");
  await shot(page, testInfo, "s9-teacher-home");
});

test("play as class on the teacher's device, with picture passwords (CLS-06)", async ({
  page,
  context,
}, testInfo) => {
  const srv = newServer();
  const cid = classOnServer(srv);
  srv.schools.SC1.consent = { name: "Grace Achieng", role: "Head teacher" };
  await fakeApi(context, srv);
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill("priya@stmarys.sch.ke");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await verify(page, srv);
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto(`/teach/class?id=${cid}`);
  await passGate(page);
  await page.getByRole("button", { name: "Play as class on this device" }).click();
  await expect(page).toHaveURL(/\/play$/);
  await page.getByRole("button", { name: /Baraka/ }).click();
  await expect(page.getByRole("dialog", { name: "Baraka, tap your 3 pictures" })).toBeVisible();
  for (const p of ["cat", "sun", "moon"]) await page.locator(`[data-picture="${p}"]`).click();
  await expect(page).not.toHaveURL(/\/play$/);
  await shot(page, testInfo, "s9-class-play");
  // Back to the class (behind the grown-ups' gate) and end class play.
  await page.goto("/play");
  await page.getByRole("link", { name: "Grown-ups" }).click();
  await passGate(page);
  await expect(page.getByText("This device is in class play.")).toBeVisible();
  await page.getByRole("button", { name: "End class play" }).click();
  await expect(page.getByText("This device is in class play.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play as class on this device" })).toBeVisible();
});

test("a parent links a child to a class and decides what the teacher sees (CLS-04, CLS-05, PAR-08)", async ({
  page,
  context,
  browser,
}, testInfo) => {
  const srv = seedServer(newServer());
  const cid = classOnServer(srv);
  srv.classEvents.push({
    id: "CE1",
    learnerId: "01JS0000000000000000000001",
    type: "lesson_completed",
    at: "2026-11-01T10:00:00Z",
    data: { subjectId: "letters", stars: 2 },
    seq: ++srv.seq,
    class_id: cid,
  });
  await fakeApi(context, srv);
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill("grace@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await verify(page, srv);
  await page.goto("/family/join?code=zzz999");
  await passGate(page);
  await page.getByRole("button", { name: "Find class" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "couldn't find that class code" })).toBeVisible();
  await page.getByLabel("Class code").fill("abc234");
  await page.getByRole("button", { name: "Find class" }).click();
  await expect(page.getByText("Class 1B, Ms Priya, St Mary's Primary")).toBeVisible();
  await page.getByLabel("Their name on the class list").click();
  await page.getByRole("option", { name: "Wanjiru K." }).click();
  await expect(page.getByText("Total lessons and stars at home.")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s9-join");
  await page.getByRole("button", { name: "Link to this class" }).click();
  await expect(page.getByText("Wanjiru is linked to Class 1B.")).toBeVisible();
  expect(srv.students["01JS0000000000000000000001"]).toMatchObject({
    learner_id: "01JB0000000000000000000001",
    scope: "class",
  });
  const link = page.locator('[data-link="Wanjiru"]');
  await expect(link.getByText("Wanjiru in Class 1B, Ms Priya, St Mary's Primary")).toBeVisible();
  await shot(page, testInfo, "s9-linked");

  // The teacher sees class play and home totals only, then everything once Grace shares it.
  const tctx = await browser.newContext({ viewport: testInfo.project.use.viewport });
  await fakeApi(tctx, srv);
  const tp = await tctx.newPage();
  watchErrors(tp, [/Failed to load resource/]);
  await tp.goto("/start/account");
  await tp.getByLabel("Email address").fill("priya@stmarys.sch.ke");
  await tp.getByRole("button", { name: "Email me a sign-in link" }).click();
  await verify(tp, srv);
  await tp.goto(`/teach/class?id=${cid}`);
  await passGate(tp);
  await expect(tp.locator('[data-student="Wanjiru K."]').getByText("linked")).toBeVisible();
  await tp.getByRole("button", { name: "Progress for Wanjiru K." }).click();
  const prog = tp.getByRole("dialog");
  await expect(prog.getByText("Totals only. The family can choose to share more.")).toBeVisible();
  await prog.getByRole("button", { name: "Done" }).click();
  await link
    .getByRole("checkbox", { name: "Share all of Wanjiru's progress" })
    .or(link.getByRole("switch", { name: "Share all of Wanjiru's progress" }))
    .click();
  await expect.poll(() => srv.students["01JS0000000000000000000001"].scope).toBe("all");
  await tp.getByRole("button", { name: "Progress for Wanjiru K." }).click();
  await expect(
    tp.getByRole("dialog").getByText(/Numbers Mountain: 1 lessons, 3 stars|Numbers: 1 lessons, 3 stars/),
  ).toBeVisible();
  await tctx.close();

  // PAR-08: unlink at any time.
  await link.getByRole("button", { name: "Unlink Wanjiru from Class 1B" }).click();
  await expect(page.getByText("No classes linked yet.")).toBeVisible();
  expect(srv.students["01JS0000000000000000000001"].learner_id).toBeNull();
});

test("a teacher's sign-in link opens teacher set-up in any browser, and parents' set-up has a way out (ONB-13)", async ({
  page,
  context,
  browser,
}, testInfo) => {
  const srv = newServer();
  await fakeApi(context, srv);
  await page.goto("/start");
  await page.getByRole("button", { name: "I'm a teacher" }).click();
  await page.getByLabel("Email address").fill("priya@stmarys.sch.ke");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect.poll(() => srv.sent.at(-1)?.role).toBe("teacher");
  // The link opens in another browser (a phone's mail app): nothing remembered there.
  const other = await browser.newContext({ viewport: testInfo.project.use.viewport });
  await fakeApi(other, srv);
  const mail = await other.newPage();
  await mail.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}&role=teacher`);
  await expect(mail).toHaveURL(/\/teach\/start$/);
  await expect(mail.getByLabel("School name")).toBeVisible();
  await other.close();

  // Someone who started as a parent can switch from the first family step.
  await page.goto("/start");
  await page.getByRole("button", { name: "I'm a parent or carer" }).click();
  await page.getByLabel("Email address").fill("james@hill.sc.ke");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  expect(srv.sent.at(-1).role).toBeNull();
  await verify(page, srv);
  await expect(page).toHaveURL(/\/start\/about$/);
  await page.getByRole("button", { name: "I'm a teacher, not a parent" }).click();
  await expect(page).toHaveURL(/\/teach\/start$/);
  await expect(page.getByLabel("School name")).toBeVisible();
});

test("a teacher who went through the parent wizard to consent can still switch (ONB-13)", async ({
  page,
  context,
}, testInfo) => {
  const srv = newServer();
  await fakeApi(context, srv);
  await page.goto("/start");
  await page.getByRole("button", { name: "I'm a parent or carer" }).click();
  await expect(page.getByText(/Step 2 of 7/)).toBeVisible();
  await page.getByLabel("Email address").fill("priya@stmarys.sch.ke");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await verify(page, srv);
  await expect(page).toHaveURL(/\/start\/about$/);
  await page.getByLabel("Your first name").fill("Ms Priya");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/start\/consent$/);
  await shot(page, testInfo, "s9-switch-from-consent");
  await page.getByRole("button", { name: "I'm a teacher, not a parent" }).click();
  await expect(page).toHaveURL(/\/teach\/start$/);
  await page.getByLabel("School name").fill("St Mary's Primary");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/teach$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hello, Ms Priya" })).toBeVisible();
});

test("the teacher's sign-in screen doesn't show the parent wizard's steps (ONB-13)", async ({
  page,
  context,
}) => {
  await fakeApi(context, newServer());
  await page.goto("/start");
  await page.getByRole("button", { name: "I'm a teacher" }).click();
  await expect(page.getByRole("heading", { name: "Your teacher account" })).toBeVisible();
  await expect(page.getByText(/Step \d of 7/)).toHaveCount(0);
});
