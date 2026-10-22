import { t, LANGUAGES } from "./index.js";

test("fills placeholders and falls back to the key", () => {
  expect(t("family.hello", { name: "Grace" })).toBe("Hello, Grace");
  expect(t("learner.today", { done: 1 })).toBe("Today: 1 of {goal}");
  expect(t("no.such.key")).toBe("no.such.key");
  expect(t("app.name", {}, "fr")).toBe("Trailbuddies");
  expect(LANGUAGES).toContain("en");
});
