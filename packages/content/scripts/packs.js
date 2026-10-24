// Content packs (CNT-02) and the production asset gate (CNT-03). Pure functions over the
// content files, used by the CLI and its tests.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { unapprovedAssets } from "@trailbuddies/content-schema";

export const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (f) => JSON.parse(readFileSync(f, "utf8"));

/** Every unit with its asset manifest, by subject, in catalogue order. */
export function loadContent(root = SRC) {
  const catalogue = read(join(root, "catalogue.json"));
  const subjects = catalogue.subjects.map((s) => ({
    subject: s,
    units: s.units
      .map((entry) => {
        const file = join(root, "units", s.id, `${entry.id}.json`);
        if (!existsSync(file)) return null;
        const assets = file.replace(/\.json$/, ".assets.json");
        return {
          entry,
          unit: read(file),
          assets: existsSync(assets) ? read(assets) : { schema: "assets/1", assets: [] },
        };
      })
      .filter(Boolean),
  }));
  return { catalogue, subjects };
}

/**
 * Units that may ship on a channel. Production: approved ("ready") units only, and every
 * asset they use must be approved. Preview: drafts too, so they can be reviewed on a device.
 * @param {"production" | "preview"} channel
 */
export const shipsOn = (channel, unit) =>
  unit.status === "ready" || (channel === "preview" && unit.status === "draft");

/**
 * CNT-03: problems that block a production build, listing each asset.
 * @returns {string[]}
 */
export function productionProblems(content) {
  return content.subjects.flatMap(({ units }) =>
    units
      .filter(({ unit }) => shipsOn("production", unit))
      .flatMap(({ unit, assets }) => unapprovedAssets(assets).map((p) => `${unit.id}: ${p}`)),
  );
}

const hashOf = (obj) => createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 16);

/**
 * Build one pack per subject plus a manifest. A pack carries the subject's catalogue entry
 * (only the units on this channel) and those units' content.
 * @param {ReturnType<typeof loadContent>} content
 * @param {{ channel: "production" | "preview", release: string }} opts
 * @returns {{ manifest: any, files: Array<{ name: string, body: string }> }}
 */
export function buildPacks(content, { channel, release }) {
  if (channel === "production") {
    const problems = productionProblems(content);
    if (problems.length) {
      const err = new Error(
        `Production packs can't include unapproved assets:\n  - ${problems.join("\n  - ")}`,
      );
      err.problems = problems;
      throw err;
    }
  }
  const files = [];
  const packs = [];
  for (const { subject, units } of content.subjects) {
    const ships = units.filter(({ unit }) => shipsOn(channel, unit));
    if (!ships.length) continue;
    const body = {
      schema: "pack/1",
      subject: { ...subject, units: subject.units.filter((e) => ships.some((s) => s.entry.id === e.id)) },
      units: ships.map((s) => s.unit),
      // Which illustrations each unit may show (the image files ship with the web app).
      assets: Object.fromEntries(ships.map((s) => [s.unit.id, s.assets])),
    };
    const hash = hashOf(body);
    const text = JSON.stringify({ ...body, release, hash });
    const name = `${subject.id}.${hash}.json`;
    files.push({ name, body: text });
    packs.push({
      subject: subject.id,
      hash,
      bytes: Buffer.byteLength(text),
      file: name,
      units: ships.map((s) => s.unit.id),
    });
  }
  const manifest = { schema: "packs/1", release, channel, packs };
  files.push({ name: `manifest-${channel}.json`, body: JSON.stringify(manifest, null, 2) });
  return { manifest, files };
}

/** Files below a folder (for audio:normalise). */
export const walk = (d) =>
  existsSync(d)
    ? readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]))
    : [];

/**
 * CNT-09: an illustration brief per item for the asset generator, in the style guide's words.
 * @param {any} unit
 * @returns {string} Markdown
 */
export function promptSheet(unit) {
  const style =
    "Friendly flat illustration for children aged 3-8; soft rounded shapes; warm savanna palette " +
    "(leaf green, sun yellow, sky blue, sand); thick soft outlines; single subject centred on a plain " +
    "cream background; no text, no logos, no known characters; square 1024x1024, exported as WebP.";
  const rows = unit.items.map(
    (it, i) =>
      `| ${i + 1} | \`${it.image || `img-${it.id}`}\` | ${it.label} | A ${it.label}${it.tags?.length ? ` (${it.tags.join(", ")})` : ""}, full body, facing three-quarters, looking friendly. ${it.fact || ""} |`,
  );
  return [
    `# Illustration briefs: ${unit.title}`,
    "",
    `Unit \`${unit.id}\` · ${unit.subject} · ${unit.band}. Status: ${unit.status}.`,
    "",
    `**Style for every image:** ${style}`,
    "",
    "After review, set each asset's `review_status` to `approved` in the unit's `.assets.json`.",
    "",
    "| # | Asset id | Item | Brief |",
    "|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}
