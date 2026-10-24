import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { shot, noSideScroll, watchErrors, demo, passGate } from "./helpers.js";
import { newServer, fakeApi, seedServer } from "./fakeApi.js";

// Sprint 5: the grown-up zone (dashboard, child progress, limits, settings) and the Lesson
// Builder (cards with photos, library pictures and voice; templates; preview; assign;
// Family Island; picture puzzles; offline uploads), at phone, tablet and desktop.
test.describe.configure({ timeout: 150_000 });
test.beforeEach(async ({ page }) => {
  watchErrors(page, [/Failed to load resource/, /ERR_INTERNET_DISCONNECTED/]);
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});
test.afterEach(async ({ page }) => {
  expect(page.errors, "console errors").toEqual([]);
});

const PHOTO = readFileSync(new URL("./fixtures/dog-with-gps.jpg", import.meta.url));
const DONE = /Lesson done!/;

async function as(page, name, { fresh = true } = {}) {
  if (fresh) await demo(page);
  await page.goto("/play");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/play\/map$/);
}

/** Events saved on this device. */
const events = (page, db = "trailbuddies-demo") =>
  page.evaluate(
    (db) =>
      new Promise((resolve) => {
        const req = indexedDB.open(db);
        req.onsuccess = () => {
          const all = req.result.transaction("events").objectStore("events").getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
    db,
  );

/** Answer whatever step is showing (tb_e2e marks the answers). */
async function answerStep(page) {
  if (await page.getByRole("heading", { level: 1, name: DONE }).isVisible()) return "done";
  const go = page.getByRole("button", { name: "Let's play!" });
  if (await go.isVisible()) return go.click().then(() => "intro");
  if (await page.locator('[data-answer="yes"]').isVisible())
    return page
      .locator('[data-answer="yes"]')
      .click()
      .then(() => "choice");
  if (await page.locator("[data-home]").first().isVisible()) {
    const n = await page.locator("[data-home]").count();
    for (let i = 0; i < n; i++) {
      const p = page.locator("[data-home]").first();
      const cell = await p.getAttribute("data-home");
      await p.click();
      await page.locator(`[data-cell="${cell}"]`).click();
    }
    return "jigsaw";
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
  if (await page.locator("[data-item]").first().isVisible()) {
    for (const [id, bin] of await page
      .locator("[data-item]")
      .evaluateAll((els) => els.map((e) => [e.getAttribute("data-item"), e.getAttribute("data-bin")]))) {
      await page.locator(`[data-item="${id}"]`).click();
      await page.locator(`[data-binid="${bin}"]`).click();
    }
    return "sort";
  }
  return "waiting";
}

async function playThrough(page, { stopAfter } = {}) {
  for (let i = 0; i < 80; i++) {
    const kind = await answerStep(page);
    if (kind === "done") return;
    if (kind !== "waiting") {
      if (stopAfter && kind === stopAfter) return;
      const next = page.getByRole("button", { name: /Next/ });
      await next.click({ timeout: 4000 }).catch(() => {});
    }
    await page.waitForTimeout(250);
  }
  throw new Error("lesson did not finish");
}

/** Add a card from the picture library. */
async function libraryCard(page, query, name, group) {
  await page.getByRole("button", { name: "Add a card" }).click();
  await page.getByRole("button", { name: "Picture" }).click();
  await page.getByLabel("Search pictures").fill(query);
  await page.getByRole("button", { name: query, exact: true }).click();
  await page.getByLabel("Name on the card").fill(name);
  if (group) await page.getByLabel("Group, for sorting games (optional)").fill(group);
  await page.getByRole("button", { name: "Save card" }).click();
}

test("Grace builds a lesson from photos, pictures and her voice, previews it and gives it to two children", async ({
  page,
}, testInfo) => {
  await demo(page);
  await page.goto("/family/create");
  await passGate(page);
  await expect(page.getByText("Around our house")).toBeVisible(); // made earlier, on the list
  await noSideScroll(page);
  await shot(page, testInfo, "s5-builder");
  await page.getByRole("link", { name: "Make a lesson" }).click();
  await page.getByLabel("Lesson name").fill("Our Pets");
  // A photo: cropped, resized and stripped of its GPS data on the device.
  await page.getByRole("button", { name: "Add a card" }).click();
  await page
    .getByTestId("photo-input")
    .setInputFiles({ name: "dog.jpg", mimeType: "image/jpeg", buffer: PHOTO });
  await expect(page.getByText("Ready · location data removed")).toBeVisible();
  await page.getByLabel("Name on the card").fill("Simba the dog");
  await page.getByLabel("A fun fact (optional)").fill("Simba loves chasing balls.");
  await page.getByRole("button", { name: "home", exact: true }).click();
  await expect(page.getByRole("button", { name: "home", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Hold to record (the test browser has a fake microphone).
  const mic = page.getByRole("button", { name: "Hold to record the name" });
  await mic.hover();
  await page.mouse.down();
  await expect(page.getByText("Recording… let go to stop")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await expect(page.getByText("Your voice is saved")).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s5-card");
  await page.getByRole("button", { name: "Save card" }).click();
  // The saved photo is a fresh JPEG with no EXIF at all.
  const stripped = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("trailbuddies-demo");
        req.onsuccess = () => {
          const all = req.result.transaction("media").objectStore("media").getAll();
          all.onsuccess = async () => {
            const photo = all.result.find((m) => m.kind === "photo");
            const bytes = new Uint8Array(await photo.blob.arrayBuffer());
            const text = new TextDecoder("latin1").decode(bytes);
            const img = await createImageBitmap(photo.blob);
            resolve({
              exif: text.includes("Exif"),
              w: img.width,
              h: img.height,
              voice: all.result.some((m) => m.kind === "voice"),
            });
          };
        };
      }),
  );
  expect(stripped).toEqual({ exif: false, w: 600, h: 600, voice: true });
  await expect(page.getByText("Your voice · home · Simba loves chasing balls.")).toBeVisible();
  await libraryCard(page, "giraffe", "Giraffe");
  await expect(page.getByText("Add 1 more card")).toBeVisible();
  await libraryCard(page, "cat", "Tom the cat");
  await expect(page.getByText("Your voice", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Next: choose a game" }).click();
  // Sort needs groups (BLD-04 scenario 2).
  await expect(page.getByText("Give the cards at least 2 groups")).toBeVisible();
  await page.getByRole("radio", { name: /Sort into groups/ }).click();
  await expect(page.getByRole("button", { name: "Publish to …" })).toBeDisabled();
  await page.getByRole("radio", { name: /Learn the names/ }).click();
  await page.getByRole("button", { name: "Zawadi" }).click();
  await page.getByRole("button", { name: "Amani" }).click();
  await noSideScroll(page);
  await shot(page, testInfo, "s5-template");
  // Preview as a child: plays for real, records nothing (BLD-07).
  const before = (await events(page)).length;
  await page.getByRole("button", { name: "Preview as a child" }).click();
  await expect(page.getByText("Preview: nothing is saved")).toBeVisible();
  await shot(page, testInfo, "s5-preview");
  await playThrough(page);
  await expect(page.getByRole("heading", { level: 1, name: DONE })).toBeVisible();
  expect((await events(page)).length).toBe(before);
  await page.getByRole("link", { name: "Back to the builder" }).click();
  await page.getByRole("button", { name: "Next: choose a game" }).click();
  await page.getByRole("button", { name: "Publish to Zawadi & Amani" }).click();
  await expect(page.getByRole("heading", { name: "“Our Pets” is ready" })).toBeVisible();
  await page.getByRole("link", { name: "Done" }).click();
  await expect(page.getByRole("link", { name: /Our Pets/ })).toContainText("For Zawadi, Amani");
  const pets = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("trailbuddies-family-v3")).state.lessons.find(
      (l) => l.title === "Our Pets",
    ),
  );
  expect(pets.cards[0]).toMatchObject({
    label: "Simba the dog",
    group: "home",
    fact: "Simba loves chasing balls.",
  });

  // Zawadi sees it on Family Island, glowing (MAP-06, BLD-08).
  await as(page, "Zawadi", { fresh: false });
  await expect(page.getByTestId("island-new").first()).toHaveText("2 new");
  await page.goto("/play/more/island");
  await expect(page.locator('[data-new="yes"]')).toHaveCount(2);
  await noSideScroll(page);
  await shot(page, testInfo, "s5-island");
  await page.getByRole("link", { name: /Our Pets/ }).click();
  await playThrough(page);
  await page.getByRole("link", { name: "Back to Family Island" }).click();
  await expect(page.locator('[data-new="yes"]')).toHaveCount(1);
  const done = (await events(page)).filter(
    (e) => e.type === "lesson_completed" && e.data.lessonId.startsWith("custom-"),
  );
  expect(done).toHaveLength(1);
});

test("editing a played lesson keeps progress; new cards appear next time (BLD-09)", async ({ page }) => {
  await as(page, "Zawadi");
  await page.goto("/play/custom?id=demo-house");
  await playThrough(page);
  await page.goto("/family/create/lesson?id=demo-house");
  await passGate(page);
  await libraryCard(page, "sun", "Sun", "Outside");
  await libraryCard(page, "spoon", "Spoon", "Inside");
  await expect(page.getByText("Cards (8)")).toBeVisible();
  await page.getByRole("button", { name: "Next: choose a game" }).click();
  await page.getByRole("button", { name: /Publish to/ }).click();
  await page.getByRole("link", { name: "Done" }).click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("trailbuddies-family-v3")).state.lessons,
  );
  const house = saved.find((l) => l.id === "demo-house");
  expect(house.cards.slice(0, 6).map((c) => c.id)).toEqual(["h1", "h2", "h3", "h4", "h5", "h6"]);
  expect(house.version).toBe(2);
  await as(page, "Zawadi", { fresh: false });
  await page.goto("/play/more/island");
  await expect(page.locator('[data-new="no"]')).toHaveCount(1); // still played, stars kept
});

test("a picture puzzle: a jigsaw of the photo, then the grown-up's question (GAM-02)", async ({
  page,
}, testInfo) => {
  await demo(page);
  await page.goto("/family/create/lesson");
  await passGate(page);
  await page.getByLabel("Lesson name").fill("Who's this?");
  await page.getByRole("button", { name: "Add a card" }).click();
  await page
    .getByTestId("photo-input")
    .setInputFiles({ name: "dog.jpg", mimeType: "image/jpeg", buffer: PHOTO });
  await expect(page.getByText("Ready · location data removed")).toBeVisible();
  await page.getByLabel("Name on the card").fill("Simba");
  await page.getByRole("button", { name: "Save card" }).click();
  await libraryCard(page, "cat", "Tom");
  await libraryCard(page, "rabbit", "Bun");
  await page.getByRole("button", { name: "Next: choose a game" }).click();
  await page.getByRole("radio", { name: /Picture puzzle/ }).click();
  await page.getByLabel("Question after the puzzle").fill("Who is this?");
  await page.getByRole("button", { name: "Zawadi" }).click();
  await page.getByRole("button", { name: "Publish to Zawadi" }).click();
  await page.getByRole("link", { name: "Done" }).click();
  await as(page, "Zawadi", { fresh: false });
  await page.goto("/play/more/island");
  await page.getByRole("link", { name: /Who's this\?/ }).click();
  await expect(page.locator("[data-home]")).toHaveCount(9); // Sprout: 3 x 3
  await shot(page, testInfo, "s5-puzzle");
  await playThrough(page, { stopAfter: "jigsaw" });
  await expect(page.getByRole("status")).toContainText("Who is this?");
  await expect(page.locator("[data-answer]")).toHaveCount(3);
  await playThrough(page);
  await expect(page.getByRole("heading", { level: 1, name: DONE })).toBeVisible();
});

test("the parent dashboard and a child's progress (PAR-01, PAR-02)", async ({ page }, testInfo) => {
  await demo(page);
  await page.goto("/family");
  await passGate(page);
  await expect(page.getByText(/This week: \d+ min · \d+ lessons/).first()).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s5-home");
  await page
    .getByRole("link", { name: /Zawadi/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/family\/progress\?learner=zawadi$/);
  await expect(page.getByText("Minutes this week")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: /Numbers: \d+ of \d+/ })).toBeVisible();
  const two = page.getByRole("button", { name: /^2, \d+%$/ });
  await two.click();
  await expect(page.getByText(/Right first time 0 of 2 \(0%\)/)).toBeVisible();
  await expect(page.getByText(/Tip: practise it together/)).toBeVisible();
  await expect(page.locator("ol > li")).toHaveCount(6);
  // Full width like the prototype; on two columns, Minutes and Subjects share a row height.
  const [mins, subs] = await Promise.all(
    ["Minutes this week", "Subjects"].map((h) =>
      page.locator(".MuiCard-root").filter({ hasText: h }).first().boundingBox(),
    ),
  );
  if (mins.x !== subs.x) expect(Math.abs(mins.height - subs.height)).toBeLessThan(2);
  await expect(page.getByText(/^\d+ earned$/)).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s5-progress");
});

test("the time limit ends a lesson after the current activity; bedtime leaves only the grown-ups button (PAR-03)", async ({
  page,
}, testInfo) => {
  await page.clock.install();
  await demo(page);
  await page.goto("/family/settings");
  await passGate(page);
  await page
    .getByRole("group", { name: "Screen-time limit" })
    .getByRole("button", { name: "20 min" })
    .click();
  await as(page, "Zawadi", { fresh: false }); // 12 minutes today
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: "Let's play!" }).click();
  await page.clock.fastForward("10:00");
  await page.locator('[data-answer="yes"]').click(); // the activity finishes…
  await expect(page.getByRole("heading", { name: "Time for a rest!" })).toBeVisible({ timeout: 8000 }); // …then the break
  const answered = (await events(page)).filter(
    (e) => e.type === "item_answered" && e.data.lessonId === "counting-1-5-1",
  );
  expect(answered.length).toBeGreaterThanOrEqual(1);
  await shot(page, testInfo, "s5-rest");
});

test("at bedtime the buddy sleeps and only the grown-ups button works", async ({ page }) => {
  await demo(page);
  await page.evaluate(() => {
    const k = "trailbuddies-family-v3";
    const s = JSON.parse(localStorage.getItem(k));
    s.state.settings.bedtime = { on: true, start: "00:00", end: "23:59" };
    localStorage.setItem(k, JSON.stringify(s));
  });
  await as(page, "Zawadi", { fresh: false });
  await expect(page.getByRole("heading", { name: "Sleepy time" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Grown-ups" })).toBeVisible();
});

test("voice speed: slow makes all speech slower (PAR-05)", async ({ page }) => {
  await page.addInitScript(() => {
    window.__rates = [];
    const fake = {
      speak: (u) => window.__rates.push(u.rate),
      cancel() {},
      getVoices: () => [],
      addEventListener() {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake });
  });
  await as(page, "Zawadi");
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: "Hear it again" }).click();
  const normal = await page.evaluate(() => window.__rates.at(-1));
  await page.goto("/family/settings");
  await passGate(page);
  await page.getByRole("group", { name: "Voice speed" }).getByRole("button", { name: "Slow" }).click();
  await as(page, "Zawadi", { fresh: false });
  await page.goto("/play/lesson/counting-1-5/1");
  await page.getByRole("button", { name: "Hear it again" }).click();
  const slow = await page.evaluate(() => window.__rates.at(-1));
  expect(slow).toBeCloseTo(normal * 0.8, 3);
});

test("offline: a photo card works at once, waits to upload, and uploads on Retry (BLD-15, BLD-16)", async ({
  page,
  context,
}, testInfo) => {
  const srv = seedServer(newServer());
  await fakeApi(context, srv);
  await page.goto("/start/account");
  await page.getByLabel("Email address").fill("grace@example.com");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.goto(`/auth/verify?token=${encodeURIComponent(srv.sent.at(-1).token)}`);
  await expect(page).toHaveURL(/\/play$/);
  await page.goto("/family/create/lesson");
  await passGate(page);
  await page.getByLabel("Lesson name").fill("Our dog");
  await page.getByRole("button", { name: "Add a card" }).click();
  // Photos need the family's permission first.
  await page.getByRole("button", { name: "Photo" }).click();
  await expect(page.getByRole("heading", { name: "Allow photos in lessons?" })).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Allow" }).click();
  await (await chooser).setFiles({ name: "dog.jpg", mimeType: "image/jpeg", buffer: PHOTO });
  expect(srv.consents.F1.scopes.photos).toBe(true);
  await expect(page.getByText("Ready · location data removed")).toBeVisible();
  srv.offline = true;
  await page.getByLabel("Name on the card").fill("Simba");
  await page.getByRole("button", { name: "Save card" }).click();
  await libraryCard(page, "cat", "Tom");
  await libraryCard(page, "cow", "Daisy");
  await page.getByRole("button", { name: "Next: choose a game" }).click();
  await page.getByRole("button", { name: "Wanjiru" }).click();
  await page.getByRole("button", { name: "Publish to Wanjiru" }).click();
  await page.getByRole("link", { name: "Done" }).click();
  await expect(page.getByText("1 item waiting to upload")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Our dog", { exact: true }).first()).toBeVisible();
  await noSideScroll(page);
  await shot(page, testInfo, "s5-waiting");
  expect(Object.values(srv.media).filter((m) => m.status === "ready")).toHaveLength(0);
  srv.offline = false;
  // Retry, unless the background retry (BLD-15) has already uploaded it and hidden the banner.
  await page
    .getByRole("button", { name: "Retry" })
    .click({ timeout: 3000 })
    .catch(() => {});
  await expect(page.getByText("1 item waiting to upload")).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(() => Object.values(srv.media).filter((m) => m.status === "ready").length).toBe(1);
  await expect.poll(() => Object.values(srv.lessons).map((l) => l.title)).toEqual(["Our dog"]);
  const photo = Object.values(srv.media)[0];
  expect(photo.bytes.includes(Buffer.from("Exif"))).toBe(false);
});
