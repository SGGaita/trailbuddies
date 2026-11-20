import { test, expect } from "@playwright/test";
import { getUnit } from "@trailbuddies/content";
import { shot, noSideScroll, watchErrors, passGate } from "./helpers.js";
import { newServer, fakeApi, seedServer } from "./fakeApi.js";

// Sprint 10: groups (CLS-07), assigning work (ASN-01), Class Island and the map signpost
// (MAP-06b), the class progress heatmap, hardest items and export (ASN-02..04), and classroom
// mode with picture sign-in, 'Ask my teacher' and auto sign-out (CRM-01..03), at phone,
// tablet and desktop.
test.describe.configure({ timeout: 180_000 });
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

const CID = "01JC0000000000000000000001";
const WANJIRU = "01JS0000000000000000000001";
const BARAKA = "01JS0000000000000000000002";
const ZAWADI = "01JS0000000000000000000003";

async function signIn(page, srv, email) {
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).not.toHaveURL(/\/auth\/verify/);
}

/** Ms Priya's Class 1B with three children; the school has agreed to the terms. */
function classOnServer(srv) {
  srv.users.T1 = { id: "T1", email: "priya@stmarys.sch.ke", name: "Ms Priya" };
  srv.schools.SC1 = {
    id: "SC1",
    name: "St Mary's Primary",
    domain: "stmarys.sch.ke",
    consent: { name: "Grace Achieng", role: "Head teacher" },
  };
  srv.teachers.T1 = { school_id: "SC1", tips: {} };
  srv.classes[CID] = {
    id: CID,
    teacher: "T1",
    school_id: "SC1",
    name: "Class 1B",
    year_group: "Grade 1",
    band: "sprout",
    join_code: "ABC234",
  };
  for (const [id, name, initial] of [
    [WANJIRU, "Wanjiru", "K"],
    [BARAKA, "Baraka", null],
    [ZAWADI, "Zawadi", null],
  ])
    srv.students[id] = {
      id,
      class_id: CID,
      first_name: name,
      initial,
      avatar_color: "sky",
      pictures: ["cat", "sun", "moon"],
      learner_id: null,
      scope: "class",
    };
}

test("groups, assigning work, Class Island at home and the class progress heatmap (CLS-07, ASN-01..04, MAP-06b)", async ({
  page,
  context,
  browser,
}, testInfo) => {
  const srv = seedServer(newServer());
  classOnServer(srv);
  srv.students[WANJIRU].learner_id = "01JB0000000000000000000001"; // Grace linked Wanjiru in Sprint 9
  await fakeApi(context, srv);

  // --- The teacher: a group, then work for it ---
  await signIn(page, srv, "priya@stmarys.sch.ke");
  await page.goto(`/teach/class?id=${CID}`);
  await passGate(page);
  const groups = page.getByRole("region", { name: "Groups" });
  await groups.getByRole("button", { name: "New group" }).click();
  const dlg = page.getByRole("dialog", { name: "New group" });
  await dlg.getByRole("textbox", { name: "Group name" }).fill("Readers");
  await dlg.getByRole("button", { name: "Wanjiru K." }).click();
  await dlg.getByRole("button", { name: "Zawadi" }).click();
  await expect(dlg.getByRole("button", { name: "Zawadi" })).toHaveAttribute("aria-pressed", "true");
  await dlg.getByRole("button", { name: "Save group" }).click();
  await expect(groups.locator('[data-group="Readers"]').getByText("Wanjiru K., Zawadi")).toBeVisible();

  await page.getByRole("navigation", { name: "Teacher" }).getByRole("link", { name: "Assign work" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Assign work" })).toBeVisible();
  await page.getByRole("button", { name: /Counting 6 to 10/ }).click();
  await page.getByRole("button", { name: "Readers", exact: true }).click();
  await expect(page.getByText("Wanjiru K., Zawadi", { exact: true })).toBeVisible();
  await page.getByLabel("Due date").fill("2030-01-04");
  await noSideScroll(page);
  await shot(page, testInfo, "s10-assign");
  await page.getByRole("button", { name: "Assign to 2 children" }).click();
  await expect(page.getByText('Assigned "Counting 6 to 10" to 2.')).toBeVisible();
  const open = page.locator('[data-open-work="Counting 6 to 10"]');
  await expect(open.getByText(/Readers · due .* · 0 of 2 done/)).toBeVisible();
  expect(Object.values(srv.assignments)[0]).toMatchObject({
    unit_id: "counting-6-10",
    target: { type: "group" },
    due_on: "2030-01-04",
  });

  // --- At home: Wanjiru sees it on Class Island (MAP-06b) ---
  const home = await browser.newContext({
    viewport: testInfo.project.use.viewport,
    isMobile: testInfo.project.use.isMobile,
    hasTouch: testInfo.project.use.hasTouch,
  });
  await fakeApi(home, srv);
  const hp = await home.newPage();
  watchErrors(hp, [/Failed to load resource/]);
  await hp.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
  await signIn(hp, srv, "grace@example.com");
  await hp.goto("/play");
  await hp.getByRole("button", { name: /Wanjiru/ }).click();
  await expect(hp).toHaveURL(/\/play\/map$/);
  await expect(hp.getByTestId("teacher-signpost").first()).toHaveText(/From your teacher/);
  await shot(hp, testInfo, "s10-map-signpost");
  await hp.goto("/play/more/island");
  const work = hp.locator('[data-assignment="Counting 6 to 10"]');
  await expect(work).toHaveAttribute("data-done", "no");
  await expect(work.getByText("To do")).toBeVisible();
  await expect(work.getByTestId("due-badge")).toHaveText(/Due /);
  await expect(work.getByText("From Ms Priya · Class 1B")).toBeVisible();
  await noSideScroll(hp);
  await shot(hp, testInfo, "s10-island");
  // Assigned work opens even though it's further along her trail than she's reached.
  await work.click();
  await expect(hp).toHaveURL(/\/play\/lesson\/counting-6-10\/1$/);
  await hp.waitForTimeout(800);
  await expect(hp).toHaveURL(/\/play\/lesson\/counting-6-10\/1$/);

  // She finishes it in class; the number seven tripped her up.
  const at = new Date().toISOString();
  for (const [i, l] of getUnit("counting-6-10").lessons.entries())
    srv.classEvents.push({
      id: `01JE${String(i).padStart(22, "0")}`,
      type: "lesson_completed",
      learnerId: WANJIRU,
      at,
      data: { lessonId: l.id, unitId: "counting-6-10", subjectId: "numbers", kind: "lesson", stars: 3 },
      seq: ++srv.seq,
      class_id: CID,
    });
  for (const [i, firstTry] of [false, false, true].entries())
    srv.classEvents.push({
      id: `01JF${String(i).padStart(22, "0")}`,
      type: "item_answered",
      learnerId: WANJIRU,
      at,
      data: { itemId: "seven", unitId: "counting-6-10", firstTry },
      seq: ++srv.seq,
      class_id: CID,
    });
  await hp.goto("/play/map");
  await hp.goto("/play/more/island");
  await expect(work).toHaveAttribute("data-done", "yes", { timeout: 10_000 });
  await expect(work.getByText("Done · 3 stars")).toBeVisible();
  await home.close();

  // --- The teacher's heatmap, cell detail, hardest items and export (ASN-02..04) ---
  await page.getByRole("navigation", { name: "Teacher" }).getByRole("link", { name: "Progress" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Class progress" })).toBeVisible();
  const row = (n) => page.locator(`[data-row="${n}"]`);
  await expect(
    row("Wanjiru K.").getByRole("button", { name: /Wanjiru K\., Counting 6 to 10: 3 stars, 1 tricky items/ }),
  ).toBeVisible();
  await expect(row("Zawadi").getByRole("button", { name: /not started/ })).toBeVisible();
  await expect(row("Baraka").getByRole("button")).toHaveCount(0); // not set for him
  await noSideScroll(page);
  await shot(page, testInfo, "s10-progress");
  await row("Wanjiru K.").getByRole("button").click();
  const cell = page.getByRole("dialog", { name: "Wanjiru K. · Counting 6 to 10" });
  await expect(cell.getByText("6 of 6 lessons done · 3 stars")).toBeVisible();
  await expect(cell.getByText("right first time 1 of 3")).toBeVisible();
  await expect(cell.getByText("Tricky")).toBeVisible();
  await shot(page, testInfo, "s10-cell");
  await cell.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Shows once 10 children have finished it (1 so far).")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export CSV" }).click(),
  ]);
  const csv = await (await import("node:fs/promises")).readFile(await download.path(), "utf8");
  expect(csv.split("\r\n")[0]).toBe("First name,Assignment,Stars,Completed");
  expect(csv).toContain(`Wanjiru K.,Counting 6 to 10,3,${at.slice(0, 10)}`);
  expect(csv).toContain("Zawadi,Counting 6 to 10,,");
  expect(csv).not.toContain("Baraka");

  await page.getByRole("link", { name: "Print or save as PDF" }).click();
  await expect(page.getByRole("heading", { name: "Class 1B: class progress" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Wanjiru K." })).toBeVisible();
  await shot(page, testInfo, "s10-report");
  await page.getByRole("button", { name: "Print or save as PDF" }).click();
  expect(await page.evaluate(() => window.__printed)).toBe(true);
});

test("classroom mode: the class list, picture sign-in, 'Ask my teacher' and auto sign-out (CRM-01..03)", async ({
  page,
  context,
}, testInfo) => {
  const srv = newServer();
  classOnServer(srv);
  await fakeApi(context, srv);
  await page.clock.install();
  await signIn(page, srv, "priya@stmarys.sch.ke");
  await page.goto(`/teach/classroom?id=${CID}`);
  await passGate(page);
  await expect(page.getByRole("heading", { level: 1, name: "Classroom mode" })).toBeVisible();
  await page.getByLabel("Name for this device").fill("Tablet 3");
  await page.getByLabel("Classroom PIN (4 digits)").fill("4826");
  await page.getByLabel("PIN again").fill("4827");
  await expect(page.getByText("The PINs don't match.")).toBeVisible();
  await page.getByLabel("PIN again").fill("4826");
  await noSideScroll(page);
  await shot(page, testInfo, "s10-classroom-setup");
  await page.getByRole("button", { name: "Set this device to Class 1B" }).click();

  // CRM-01: the tablet opens on the class list.
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByText("Class 1B · who are you?")).toBeVisible();
  await expect(page.getByText("Signs out after each lesson or 3 minutes without a tap.")).toBeVisible();
  expect(Object.values(srv.classDevices)).toEqual([
    expect.objectContaining({ class_id: CID, label: "Tablet 3", removed: false }),
  ]);
  await noSideScroll(page);
  await shot(page, testInfo, "s10-classroom-list");

  // CRM-02: Baraka forgot his pictures and asks the teacher, then remembers them.
  await page.getByRole("button", { name: /Baraka/ }).click();
  const lock = page.getByRole("dialog", { name: "Baraka, tap your 3 pictures" });
  await lock.getByRole("button", { name: "Ask my teacher" }).click();
  await expect(lock.getByText("Your teacher knows. They'll show you your pictures.")).toBeVisible();
  expect(srv.students[BARAKA].help).toBe(true);
  await shot(page, testInfo, "s10-ask-teacher");
  for (const p of ["cat", "sun", "moon"]) await page.locator(`[data-picture="${p}"]`).click();
  await expect(page).toHaveURL(/\/play\/buddies$/); // a first visit meets the buddies

  // CRM-03: 3 minutes without a tap, with a warning first.
  await page.clock.fastForward(171_000);
  await expect(page.getByRole("dialog", { name: "Still there?" })).toBeVisible();
  await page.getByRole("button", { name: "I'm here!" }).click();
  await expect(page.getByRole("dialog", { name: "Still there?" })).toHaveCount(0);
  await page.clock.fastForward(181_000);
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByText("Class 1B · who are you?")).toBeVisible();

  // The grown-up zone needs the classroom PIN; the teacher sees Baraka asked.
  await page.getByRole("link", { name: "Grown-ups" }).click();
  await expect(page.getByText("Enter your grown-up PIN.")).toBeVisible();
  for (const d of "4826") await page.getByRole("button", { name: d, exact: true }).click(); // the keypad
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toHaveCount(0);
  const help = page.locator('[data-help="Baraka"]');
  await expect(help.getByText("Baraka tapped 'Ask my teacher'. Show them their pictures:")).toBeVisible();
  await shot(page, testInfo, "s10-help");
  await help.getByRole("button", { name: "Done" }).click();
  await expect(help).toHaveCount(0);
  expect(srv.students[BARAKA].help).toBe(false);
});
