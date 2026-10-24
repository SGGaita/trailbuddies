#!/usr/bin/env node
// content-cli (CNT-09): one entry point for writers.
//   pnpm content <command>
//     validate [--prod]                 check every file (--prod: approved assets in ready units)
//     units:index                       rebuild src/units/all.js after adding a unit
//     packs:build --channel <production|preview> --release <yyyy.mm.n> [--out dist/packs]
//     assets:prompts <subject>/<unit>   write prompts/<unit>.md, the illustration briefs
//     assets:import <folder> [--license "<terms>"]  bring pictures in (512 px WebP, "reviewed")
//     assets:approve <unit>             approve a unit's reviewed pictures after checking them
//     unit:ready <unit> | unit:draft <unit>   publish a reviewed unit to children, or take it back
//     audio:normalise [dir]             trim silence and normalise loudness (needs ffmpeg)
import { writeFileSync, mkdirSync, renameSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadContent, buildPacks, promptSheet, walk } from "./packs.js";
import { importImages, approveAssets, setUnitStatus } from "./assets.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");
const [cmd, ...args] = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const run = (script, extra = []) => {
  const r = spawnSync(process.execPath, [join(here, script), ...extra], { stdio: "inherit" });
  process.exit(r.status ?? 1);
};

if (cmd === "validate") run("validate.js", args);
else if (cmd === "units:index") run("units-index.js");
else if (cmd === "packs:build") {
  const channel = flag("channel", "preview");
  const release = flag("release");
  if (!["production", "preview"].includes(channel)) fail("--channel is production or preview");
  if (!/^\d{4}\.\d{2}\.\d+$/.test(release || "")) fail("--release looks like 2027.03.1");
  const out = flag("out", join(pkg, "dist", "packs"));
  let built;
  try {
    built = buildPacks(loadContent(), { channel, release });
  } catch (e) {
    fail(e.message);
  }
  mkdirSync(out, { recursive: true });
  for (const f of built.files) writeFileSync(join(out, f.name), f.body);
  for (const p of built.manifest.packs)
    console.log(
      `  ${p.subject.padEnd(10)} ${p.units.length} units  ${(p.bytes / 1024).toFixed(0)} KB  ${p.file}`,
    );
  console.log(`✓ ${built.manifest.packs.length} ${channel} packs for release ${release} in ${out}`);
  console.log("  Publish them with: cd services/api && python -m app.packs publish <that folder>");
} else if (cmd === "assets:prompts") {
  const [subject, unitId] = (args[0] || "").split("/");
  const content = loadContent();
  const found = content.subjects
    .find((s) => s.subject.id === subject)
    ?.units.find((u) => u.unit.id === unitId);
  if (!found) fail(`no unit ${args[0]} (use <subject>/<unit>, e.g. animals/farm-animals)`);
  const dir = join(pkg, "prompts");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${unitId}.md`);
  writeFileSync(file, promptSheet(found.unit));
  console.log(`✓ ${found.unit.items.length} briefs in ${file}`);
} else if (cmd === "assets:import") {
  if (!args[0]) fail("give the folder with the pictures, e.g. pnpm content assets:import C:\\Users\\you\\Downloads\\animals");
  const sharp = (await import("sharp")).default;
  const { done, unknown } = await importImages(args[0], { sharp, license: flag("license") });
  done.forEach((d) => console.log(`  ✓ ${d}`));
  unknown.forEach((n) => console.log(`  ? ${n}: no asset with that name (use the asset id, e.g. img-goat.png)`));
  console.log(`✓ ${done.length} picture(s) imported. Check them with pnpm dev, then: pnpm content assets:approve <unit>`);
} else if (cmd === "assets:approve") {
  try {
    const { approved, missing } = approveAssets(args[0]);
    console.log(`✓ ${approved.length} picture(s) approved in ${args[0]}`);
    if (missing.length) console.log(`  Still to make: ${missing.join(", ")}`);
  } catch (e) {
    fail(e.message);
  }
} else if (cmd === "unit:ready" || cmd === "unit:draft") {
  try {
    setUnitStatus(args[0], cmd === "unit:ready" ? "ready" : "draft");
    console.log(`✓ ${args[0]} is now ${cmd === "unit:ready" ? "ready: children will see it in production" : "a draft again"}`);
  } catch (e) {
    fail(e.message);
  }
} else if (cmd === "audio:normalise") {
  const dir = args[0] || join(pkg, "audio");
  if (spawnSync("ffmpeg", ["-version"]).status !== 0)
    fail("ffmpeg isn't installed (https://ffmpeg.org/download.html)");
  const clips = walk(dir).filter((f) => /\.(wav|mp3|ogg|webm|m4a)$/i.test(f));
  for (const f of clips) {
    const tmp = `${f}.tmp${f.slice(f.lastIndexOf("."))}`;
    // Trim silence at both ends, then EBU R128 loudness to -16 LUFS (speech for small speakers).
    const r = spawnSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      f,
      "-af",
      "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=1:stop_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=-45dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
      tmp,
    ]);
    if (r.status !== 0) fail(`${f}: ${r.stderr}`);
    renameSync(tmp, f);
  }
  console.log(`✓ ${clips.length} clip(s) trimmed and normalised in ${dir}`);
} else {
  const help = readFileSync(join(here, "cli.js"), "utf8").split("\n").slice(1, 11);
  console.log(help.map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(cmd ? 1 : 0);
}
