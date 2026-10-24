// Illustration workflow for writers (CNT-03, CNT-09): bring generated images into the app,
// approve them after checking them on screen, and mark a reviewed unit ready.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

export const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
export const PUBLIC_ART = join(SRC, "..", "..", "..", "apps", "web", "public", "art", "units");
const read = (f) => JSON.parse(readFileSync(f, "utf8"));
const write = (f, data) => writeFileSync(f, `${JSON.stringify(data, null, 2)}\n`);

/** Every unit file with its manifest file, by unit id. */
export function unitFiles(root = SRC) {
  const cat = read(join(root, "catalogue.json"));
  const out = {};
  for (const s of cat.subjects)
    for (const u of s.units) {
      const file = join(root, "units", s.id, `${u.id}.json`);
      if (existsSync(file)) out[u.id] = { file, assets: file.replace(/\.json$/, ".assets.json"), subject: s.id };
    }
  return out;
}

/**
 * Which asset a picture file is for. A file can be named after the asset id ("img-goat.png")
 * or the item id ("goat.png").
 * @returns {{ unitId: string, asset: any } | null}
 */
export function assetForFile(name, root = SRC) {
  const stem = basename(name, extname(name)).toLowerCase();
  for (const [unitId, f] of Object.entries(unitFiles(root))) {
    if (!existsSync(f.assets)) continue;
    const asset = read(f.assets).assets.find((a) => a.id === stem || a.id === `img-${stem}`);
    if (asset) return { unitId, asset };
  }
  return null;
}

/**
 * Bring a folder of generated pictures into the app: each is cropped square, resized to
 * 512 px WebP (no metadata) at its asset path, and set to "reviewed" so it shows in
 * development and previews for checking. Approve it afterwards with assets:approve.
 * @param {string} folder
 * @param {{ sharp: any, root?: string, out?: string, license?: string }} opts license: recorded
 *   on each imported picture, e.g. the image tool's terms
 */
export async function importImages(folder, { sharp, root = SRC, out = PUBLIC_ART, license }) {
  const done = [];
  const unknown = [];
  for (const name of readdirSync(folder).filter((n) => /\.(png|jpe?g|webp)$/i.test(n))) {
    const hit = assetForFile(name, root);
    if (!hit) {
      unknown.push(name);
      continue;
    }
    const dest = join(out, hit.asset.path);
    mkdirSync(dirname(dest), { recursive: true });
    await sharp(join(folder, name)).resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toFile(dest);
    const f = unitFiles(root)[hit.unitId];
    const m = read(f.assets);
    const a = m.assets.find((x) => x.id === hit.asset.id);
    if (a.review_status === "draft") a.review_status = "reviewed";
    if (license) a.license = license;
    write(f.assets, m);
    done.push(`${hit.unitId}/${a.id}`);
  }
  return { done, unknown };
}

/**
 * Approve every "reviewed" picture in a unit (after looking at them in the app).
 * @returns {{ approved: string[], missing: string[] }} missing: still draft (no picture yet)
 */
export function approveAssets(unitId, root = SRC) {
  const f = unitFiles(root)[unitId];
  if (!f) throw new Error(`No unit "${unitId}"`);
  const m = read(f.assets);
  const approved = [];
  for (const a of m.assets)
    if (a.review_status === "reviewed") {
      a.review_status = "approved";
      approved.push(a.id);
    }
  write(f.assets, m);
  return { approved, missing: m.assets.filter((a) => a.review_status === "draft").map((a) => a.id) };
}

/**
 * Mark a reviewed unit ready (or back to draft), in both the unit file and the catalogue.
 * Ready units must have every picture approved.
 * @param {string} unitId @param {"ready" | "draft"} status
 */
export function setUnitStatus(unitId, status, root = SRC) {
  const f = unitFiles(root)[unitId];
  if (!f) throw new Error(`No unit "${unitId}"`);
  if (status === "ready" && existsSync(f.assets)) {
    const pending = read(f.assets).assets.filter((a) => a.review_status !== "approved");
    if (pending.length)
      throw new Error(`${unitId} has pictures not approved yet: ${pending.map((a) => a.id).join(", ")}`);
  }
  const unit = read(f.file);
  unit.status = status;
  write(f.file, unit);
  const catFile = join(root, "catalogue.json");
  const cat = read(catFile);
  cat.subjects.flatMap((s) => s.units).find((u) => u.id === unitId).status = status;
  write(catFile, cat);
}
