import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { demo, passGate } from "./helpers.js";

// ACC-07: text contrast of at least 4.5:1 (axe "color-contrast", WCAG 2 AA) on the main
// screens of the children's app and the grown-up zone. CI flags a failing screen; set
// AXE_BLOCK=1 before launch to make it block the merge.
test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tb_e2e", "1"));
});

const SCREENS = [
  { name: "profiles", path: "/play" },
  { name: "map", path: "/play/map", learner: true },
  { name: "trail", path: "/play/trail/numbers", learner: true },
  { name: "lesson", path: "/play/lesson/counting-1-5/1", learner: true },
  { name: "shop", path: "/play/more/shop", learner: true },
  { name: "games", path: "/play/more/games", learner: true },
  { name: "parent home", path: "/family", gate: true },
  { name: "settings", path: "/family/settings", gate: true },
  { name: "progress", path: "/family/progress", gate: true },
  { name: "privacy", path: "/privacy" },
];

test("text contrast on the main screens (ACC-07)", async ({ page }, testInfo) => {
  await demo(page);
  await page.getByRole("button", { name: /Zawadi/ }).click();
  const failures = [];
  for (const s of SCREENS) {
    await page.goto(s.path);
    if (s.gate) await passGate(page);
    await page.waitForTimeout(800); // entrance animations settle
    const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    for (const v of r.violations)
      for (const n of v.nodes)
        failures.push(`${s.name}: ${n.target.join(" ")} (${n.any[0]?.message?.split(".")[0] || v.id})`);
  }
  testInfo.annotations.push({ type: "contrast", description: failures.join("\n") || "none" });
  // In GitHub Actions this line becomes a warning on the PR; with AXE_BLOCK=1 it fails the run.
  for (const f of failures) console.log(`::warning title=Contrast (ACC-07)::${testInfo.project.name} ${f}`);
  if (process.env.AXE_BLOCK === "1") expect(failures).toEqual([]);
});
