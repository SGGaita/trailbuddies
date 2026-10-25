// Turns Lighthouse CI assertion results into GitHub annotations, so budget misses show on the
// PR (job logs aren't easy to read). Exits 1 when LH_BLOCK=1 and an "error"-level budget is
// missed; "warn"-level ones (noisy on shared runners, like total blocking time) only warn.
import { existsSync, readFileSync } from "node:fs";

const file = ".lighthouseci/assertion-results.json";
const results = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
const fails = results.filter((r) => !r.passed);
for (const r of fails) {
  const where = (r.url || "").replace(/^https?:\/\/[^/]+/, "") || "/";
  const found = typeof r.actual === "number" ? Math.round(r.actual * 1000) / 1000 : r.actual;
  console.log(`::warning title=Lighthouse budget::${where} ${r.auditProperty ? `${r.auditId}:${r.auditProperty}` : r.auditId} ${r.operator} ${r.expected}, found ${found}`);
}
console.log(fails.length ? `${fails.length} budget(s) missed` : "All Lighthouse budgets met");
const blocking = fails.filter((r) => r.level === "error");
if (blocking.length && process.env.LH_BLOCK === "1") process.exit(1);
