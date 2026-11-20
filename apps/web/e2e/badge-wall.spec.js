import { test, expect } from "@playwright/test";
import { wallWeek } from "@trailbuddies/domain";
import { shot, noSideScroll, watchErrors, passGate } from "./helpers.js";
import { newServer, fakeApi } from "./fakeApi.js";

// ASN-05 Badge wall at phone, tablet and desktop: every child by name, this week in the
// school's time zone, class and shared home badges, the class total, last week, full screen,
// pages for a big class, and a new badge arriving while it's projected.
test.describe.configure({ timeout: 120_000 });
// The service worker can answer requests that context.route() never sees; the wall doesn't need it.
test.use({ timezoneId: "Africa/Nairobi", serviceWorkers: "block" });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/]);
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

const CID = "01JC0000000000000000000001";
const ZONE = "Africa/Nairobi";
let n = 0;
const sid = () => `01JS00000000000000000${String(++n).padStart(5, "0")}`;

async function signIn(page, srv, email) {
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).not.toHaveURL(/\/auth\/verify/);
}

/** Ms Priya's Class 1B. `kids` is [first name, initial, colour] per child; returns their ids. */
function classOnServer(srv, kids) {
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
  const ids = {};
  for (const [name, initial, colour] of kids) {
    const id = sid();
    ids[initial ? `${name} ${initial}` : name] = id;
    srv.students[id] = {
      id,
      class_id: CID,
      first_name: name,
      initial,
      avatar_color: colour || "sky",
      pictures: ["cat", "sun", "moon"],
      learner_id: null,
      scope: "class",
    };
  }
  return ids;
}

/** A badge event `minutes` after the start of the week (`back` weeks ago, in Nairobi). */
const award = (srv, list, who, badgeId, { back = 0, minutes = 60, ...data } = {}) =>
  list.push({
    id: `01JE${String(++n).padStart(22, "0")}`,
    type: "badge_awarded",
    learnerId: who,
    at: new Date(Date.parse(wallWeek(new Date(), ZONE, back).from) + minutes * 60_000).toISOString(),
    data: { badgeId, ...data },
    seq: ++srv.seq,
  });

const tile = (page, name) => page.locator(`li[data-student="${name}"]`);

test("every child by name, with this week's class and shared home badges", async ({ page, context }, testInfo) => {
  const srv = newServer();
  const ids = classOnServer(srv, [
    ["Zawadi", "M", "berry"],
    ["Wanjiru", "K", "leaf"],
    ["Baraka", null, "coral"],
    ["Zawadi", "A", "sun"],
  ]);
  award(srv, srv.classEvents, ids.Baraka, "first-steps", { tier: "bronze" });
  award(srv, srv.classEvents, ids.Baraka, "perfect-ten", { tier: "silver", upgrade: true }); // not new
  award(srv, srv.classEvents, ids["Zawadi M"], "counting-champ", { minutes: 120 });
  award(srv, srv.classEvents, ids["Zawadi M"], "first-steps", { minutes: 180 });
  award(srv, srv.classEvents, ids["Wanjiru K"], "perfect-ten", { back: 1, tier: "bronze" }); // last week
  // Wanjiru's parent shares all progress: her badge from home shows; another child's doesn't.
  srv.students[ids["Wanjiru K"]].learner_id = "01JB0000000000000000000001";
  srv.students[ids["Wanjiru K"]].scope = "all";
  srv.students[ids["Zawadi A"]].learner_id = "01JB0000000000000000000002";
  award(srv, srv.events, "01JB0000000000000000000001", "counting-champ", { minutes: 300 });
  award(srv, srv.events, "01JB0000000000000000000002", "first-steps", { minutes: 300 });
  await fakeApi(context, srv);

  await signIn(page, srv, "priya@stmarys.sch.ke");
  await page.goto("/teach");
  await passGate(page);
  // From the teacher nav: Badges, then the class's wall.
  await page.getByRole("navigation", { name: "Teacher" }).getByRole("link", { name: "Badges" }).click();
  await page.getByRole("link", { name: "Badge wall for Class 1B" }).click();
  await expect(page.getByRole("heading", { name: "Class 1B · Badge wall" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Teacher" }).getByRole("link", { name: "Badges" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Everyone, sorted by name; initials only where first names are shared.
  await expect(page.locator("li[data-student]")).toHaveCount(4);
  expect(await page.locator("li[data-student]").evaluateAll((els) => els.map((e) => e.dataset.student))).toEqual([
    "Baraka",
    "Wanjiru",
    "Zawadi A.",
    "Zawadi M.",
  ]);
  await expect(page.getByText("Class 1B earned 4 badges this week!")).toBeVisible();
  await expect(tile(page, "Baraka")).toContainText("1 new badge");
  await expect(tile(page, "Baraka").locator("[data-badge]")).toHaveCount(1);
  await expect(tile(page, "Wanjiru")).toContainText("1 new badge"); // from home
  await expect(tile(page, "Wanjiru").locator('[data-badge="counting-champ"]')).toBeVisible();
  await expect(tile(page, "Zawadi M.")).toContainText("2 new badges");
  await expect(tile(page, "Zawadi A.")).toContainText("Keep going!"); // home badge not shared
  await expect(page.getByText("Sorted by name, never by count.", { exact: false })).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "badge-wall");

  // Last week.
  await page.getByRole("button", { name: "Last week" }).click();
  await expect(page.getByText("Class 1B earned 1 badge last week!")).toBeVisible();
  await expect(tile(page, "Wanjiru").locator('[data-badge="perfect-ten"]')).toBeVisible();
  await expect(tile(page, "Baraka")).toContainText("Keep going!");
  await page.getByRole("button", { name: "This week" }).click();
  await expect(page.getByText("Class 1B earned 4 badges this week!")).toBeVisible();

  // Full screen projects only the wall, with its own way out.
  await page.getByRole("button", { name: "Show full screen" }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.hasAttribute("data-wall"))).toBe(true);
  await expect(page.getByRole("button", { name: "Exit full screen" })).toBeVisible();
  await shot(page, testInfo, "badge-wall-full");
  await page.getByRole("button", { name: "Exit full screen" }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  // And the F key, for a teacher at the keyboard.
  await page.locator("body").press("f");
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.evaluate(() => document.exitFullscreen());

  await page.getByRole("link", { name: "Back to class" }).click();
  await expect(page).toHaveURL(new RegExp(`/teach/class\\?id=${CID}`));

  // Classroom mode links to the wall too, as in the prototype's T06.
  await page.getByRole("navigation", { name: "Teacher" }).getByRole("link", { name: "Classroom mode" }).click();
  await page.getByRole("region", { name: "Badge wall" }).getByRole("link", { name: "Badge wall for Class 1B" }).click();
  await expect(page.getByRole("heading", { name: "Class 1B · Badge wall" })).toBeVisible();
});

test("a big class turns pages, and a new badge pops in while it's projected", async ({ page, context }, testInfo) => {
  await page.clock.install();
  const srv = newServer();
  const names = [
    "Abdi", "Achieng", "Akinyi", "Amani", "Baraka", "Chebet", "Dalila", "Eshe", "Faraji", "Halima",
    "Imani", "Jabari", "Jelani", "Kamau", "Kesi", "Kito", "Lulu", "Makena", "Nia", "Njeri",
    "Otieno", "Pendo", "Rehema", "Sefu", "Tumaini", "Wanjiru", "Wekesa", "Yusuf", "Zawadi", "Zuri",
  ];
  const ids = classOnServer(srv, names.map((x, i) => [x, null, ["coral", "sky", "leaf", "berry", "sun"][i % 5]]));
  for (const [i, x] of names.entries()) if (i % 3 === 0) award(srv, srv.classEvents, ids[x], "first-steps");
  await fakeApi(context, srv);
  await signIn(page, srv, "priya@stmarys.sch.ke");
  await page.goto(`/teach/badge-wall?id=${CID}`);
  await passGate(page);
  await expect(page.getByText("Class 1B earned 10 badges this week!")).toBeVisible();

  const phone = testInfo.project.name === "phone";
  if (phone) {
    // On a phone it's a scrolling list, not a projector.
    await expect(page.locator("li[data-student]")).toHaveCount(30);
    await noSideScroll(page);
  } else {
    const pager = page.getByRole("navigation", { name: /^Page 1 of \d$/ });
    await expect(pager).toBeVisible();
    const pages = Number((await pager.getAttribute("aria-label")).split(" of ")[1]);
    expect(pages).toBeGreaterThan(1);
    expect(await page.locator("li[data-student]").count()).toBeLessThan(30);
    // Every tile fits: no tile is cut off at the bottom of the board.
    const fits = await page.evaluate(() => {
      const grid = document.querySelector("[data-wall] ul[aria-label]").parentElement.getBoundingClientRect();
      return [...document.querySelectorAll("li[data-student]")].every((li) => li.getBoundingClientRect().bottom <= grid.bottom + 1);
    });
    expect(fits).toBe(true);
    // Pages turn every 12 seconds…
    await page.clock.runFor(12_500);
    await expect(page.getByRole("navigation", { name: `Page 2 of ${pages}` })).toBeVisible();
    // …stop on Space, and move with the arrow keys.
    await page.locator("body").press(" ");
    await expect(page.getByRole("button", { name: /Turn pages/ })).toHaveAttribute("aria-pressed", "true");
    await page.clock.runFor(15_000);
    await expect(page.getByRole("navigation", { name: `Page 2 of ${pages}` })).toBeVisible();
    await page.locator("body").press("ArrowLeft");
    await expect(page.getByRole("navigation", { name: `Page 1 of ${pages}` })).toBeVisible();
    await shot(page, testInfo, "badge-wall-pages");
    // Full screen: bigger tiles, so fewer to a page, and still none cut off.
    await page.getByRole("button", { name: "Show full screen" }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    const big = page.getByRole("navigation", { name: /^Page \d of \d$/ });
    await expect(big).toBeVisible();
    expect(await page.evaluate(() => {
      const grid = document.querySelector("[data-wall] ul[aria-label]").parentElement.getBoundingClientRect();
      return [...document.querySelectorAll("li[data-student]")].every((li) => li.getBoundingClientRect().bottom <= grid.bottom + 1);
    })).toBe(true);
    await shot(page, testInfo, "badge-wall-pages-full");
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  }

  // Zuri (on the last page) earns a badge in class: within 30 s it shows, glowing, and her
  // page comes into view. Calm mode keeps it still.
  await page.emulateMedia({ reducedMotion: "reduce" });
  award(srv, srv.classEvents, ids.Zuri, "counting-champ", { minutes: 600 });
  await page.clock.runFor(31_000);
  const fresh = tile(page, "Zuri").locator('[data-badge="counting-champ"]');
  await expect(fresh).toHaveAttribute("data-fresh", "yes");
  if (!phone) await expect(fresh).toBeInViewport(); // its page turns into view; a phone just scrolls
  expect(await fresh.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await expect(page.getByText("Class 1B earned 11 badges this week!")).toBeVisible();
  await expect(page.locator("[aria-live=polite]")).toHaveText("Zuri earned Counting Champ!");
  await page.clock.runFor(9_000);
  await expect(fresh).not.toHaveAttribute("data-fresh", "yes");
});

test("a class with no children yet, and another teacher's class", async ({ page, context }) => {
  const srv = newServer();
  classOnServer(srv, []);
  srv.classes.OTHER = { ...srv.classes[CID], id: "OTHER", teacher: "T9" };
  await fakeApi(context, srv);
  await signIn(page, srv, "priya@stmarys.sch.ke");
  await page.goto(`/teach/badge-wall?id=${CID}`);
  await passGate(page);
  await expect(page.getByText("Add children to the class and their badges will show here.")).toBeVisible();
  await expect(page.getByText("Every lesson is a step towards a badge.", { exact: false })).toBeVisible();
  await page.goto("/teach/badge-wall?id=OTHER");
  await passGate(page);
  await expect(page.locator("[data-wall] [role=alert]")).toContainText("The badge wall could not load.");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
