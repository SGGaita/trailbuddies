import { mkdtempSync, cpSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { importImages, approveAssets, setUnitStatus, SRC } from "../scripts/assets.js";
import { attachImages, assetShows } from "./index.js";

const read = (f) => JSON.parse(readFileSync(f, "utf8"));

/** A throwaway copy of the content, so the real files never change. */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "tb-content-"));
  cpSync(SRC, join(dir, "src"), { recursive: true });
  return { root: join(dir, "src"), out: join(dir, "public"), pics: join(dir, "pics") };
}

describe("illustrations (CNT-03, CNT-09)", () => {
  test("imported pictures become 512 px WebP at their path, waiting for approval", async () => {
    const sb = sandbox();
    mkdirSync(sb.pics);
    await sharp({ create: { width: 1024, height: 768, channels: 3, background: "#8d6e63" } })
      .png()
      .toFile(join(sb.pics, "img-goat.png"));
    await sharp({ create: { width: 900, height: 900, channels: 3, background: "#ffffff" } })
      .png()
      .toFile(join(sb.pics, "donkey.png")); // by item id works too
    await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } })
      .png()
      .toFile(join(sb.pics, "unicorn.png"));
    const r = await importImages(sb.pics, { sharp, root: sb.root, out: sb.out, license: "OpenAI terms" });
    expect(r.done.sort()).toEqual(["farm-animals/img-donkey", "farm-animals/img-goat"]);
    expect(r.unknown).toEqual(["unicorn.png"]);
    const file = join(sb.out, "animals/farm-animals/goat.webp");
    expect(existsSync(file)).toBe(true);
    expect(await sharp(file).metadata()).toMatchObject({ format: "webp", width: 512, height: 512 });
    const m = read(join(sb.root, "units/animals/farm-animals.assets.json"));
    expect(m.assets.find((a) => a.id === "img-goat")).toMatchObject({ review_status: "reviewed", license: "OpenAI terms" });
    expect(m.assets.find((a) => a.id === "img-hen-cluck")).toBeUndefined();
  });

  test("approve, then a unit can be made ready only when every picture is approved", async () => {
    const sb = sandbox();
    expect(() => setUnitStatus("farm-animals", "ready", sb.root)).toThrow(/not approved yet/);
    const f = join(sb.root, "units/animals/farm-animals.assets.json");
    const m = read(f);
    m.assets.forEach((a) => (a.review_status = "reviewed"));
    (await import("node:fs")).writeFileSync(f, JSON.stringify(m));
    expect(approveAssets("farm-animals", sb.root).approved).toHaveLength(8);
    setUnitStatus("farm-animals", "ready", sb.root);
    expect(read(join(sb.root, "units/animals/farm-animals.json")).status).toBe("ready");
    const cat = read(join(sb.root, "catalogue.json"));
    expect(cat.subjects.flatMap((s) => s.units).find((u) => u.id === "farm-animals").status).toBe("ready");
    // Units without pictures go straight to ready.
    setUnitStatus("red-yellow-blue", "ready", sb.root);
  });

  test("approved pictures show everywhere; reviewed ones only outside production", () => {
    expect(assetShows({ review_status: "approved" }, { drafts: false })).toBe(true);
    expect(assetShows({ review_status: "reviewed" }, { drafts: false })).toBe(false);
    expect(assetShows({ review_status: "reviewed" }, { drafts: true })).toBe(true);
    expect(assetShows({ review_status: "draft" }, { drafts: true })).toBe(false);
    const unit = { items: [{ id: "goat", image: "img-goat" }, { id: "x" }] };
    attachImages(unit, { assets: [{ id: "img-goat", path: "animals/farm/goat.webp", review_status: "approved" }] });
    expect(unit.items[0].imageSrc).toBe("/art/units/animals/farm/goat.webp");
    expect(unit.items[1].imageSrc).toBeUndefined();
  });
});
