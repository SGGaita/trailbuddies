#!/usr/bin/env node
// Validates every content file in this package. `--prod` also fails on any unapproved asset
// in a unit that ships to production (CNT-03).
// Exit code 1 on any error, so CI blocks the pull request.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate, matchesCatalogue } from "@trailbuddies/content-schema";
import { unitsIndex } from "./units-index.js";
import { loadContent, productionProblems } from "./packs.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const prod = process.argv.includes("--prod");
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const walk = (d) =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

let problems = 0;
const report = (file, errors) => {
  if (!errors.length) return;
  problems += errors.length;
  console.error(`\n✗ ${relative(root, file)}`);
  for (const e of errors) console.error(`  - ${e}`);
};

const catFile = join(root, "catalogue.json");
const cat = read(catFile);
report(catFile, validate("catalogue", cat).errors);

const files = walk(join(root, "units")).filter((f) => f.endsWith(".json"));
const unitFiles = files.filter((f) => !f.endsWith(".assets.json"));
const seen = new Set();
for (const f of unitFiles) {
  const u = read(f);
  const r = validate("unit", u);
  report(f, r.valid ? matchesCatalogue(u, cat) : r.errors);
  seen.add(u.id);
  const assets = f.replace(/\.json$/, ".assets.json");
  if (!existsSync(assets)) report(f, [`missing asset manifest ${relative(root, assets)}`]);
  else {
    const m = read(assets);
    const ar = validate("assets", m);
    report(assets, ar.valid ? [] : ar.errors);
  }
}
for (const s of cat.subjects)
  for (const u of s.units)
    if ((u.status === "ready" || u.status === "draft") && !seen.has(u.id))
      report(catFile, [`unit "${u.id}" is ${u.status} but has no content file`]);

// CNT-03: a production build may only ship approved assets in approved ("ready") units.
if (prod) report(join(root, "units"), productionProblems(loadContent(root)));

const indexFile = join(root, "units", "all.js");
// Compare without line endings: Git on Windows checks files out with CRLF.
const lf = (t) => t.replace(/\r\n/g, "\n");
if (!existsSync(indexFile) || lf(readFileSync(indexFile, "utf8")) !== lf(unitsIndex()))
  report(indexFile, ["out of date: run `pnpm --filter @trailbuddies/content units:index`"]);

for (const f of walk(join(root, "buddy"))) report(f, validate("buddy-script", read(f)).errors);
report(join(root, "economy.json"), validate("economy", read(join(root, "economy.json"))).errors);
for (const f of walk(join(root, "badges")))
  read(f).forEach((b, i) =>
    report(
      f,
      validate("badge", b).errors.map((e) => `badge ${i + 1} (${b.id}): ${e}`),
    ),
  );

const units = cat.subjects.reduce((n, s) => n + s.units.length, 0);
if (problems) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log(
  `✓ Content valid: ${cat.subjects.length} subjects, ${units} units in the catalogue, ${unitFiles.length} with full content${prod ? ", all assets approved" : ""}.`,
);
