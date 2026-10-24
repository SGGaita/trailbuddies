import { loadContent, buildPacks, productionProblems, shipsOn, promptSheet } from "../scripts/packs.js";

const content = loadContent();

describe("CNT-02 content packs", () => {
  test("production ships approved units only; preview adds drafts", () => {
    const prod = buildPacks(content, { channel: "production", release: "2027.03.1" });
    const prev = buildPacks(content, { channel: "preview", release: "2027.03.1" });
    const units = (b) => b.manifest.packs.flatMap((p) => p.units);
    expect(units(prod)).toEqual(["counting-1-5", "counting-6-10", "letters-a-e", "where-animals-live"]);
    expect(units(prev)).toHaveLength(26);
    expect(prev.manifest).toMatchObject({ schema: "packs/1", release: "2027.03.1", channel: "preview" });
  });
  test("a pack's name carries its content hash, so unchanged content keeps its name", () => {
    const a = buildPacks(content, { channel: "preview", release: "2027.03.1" });
    const b = buildPacks(content, { channel: "preview", release: "2027.03.2" });
    expect(a.manifest.packs.map((p) => p.file)).toEqual(b.manifest.packs.map((p) => p.file));
    const pack = JSON.parse(a.files.find((f) => f.name === a.manifest.packs[0].file).body);
    expect(pack).toMatchObject({ schema: "pack/1", subject: { id: "numbers" } });
    expect(pack.subject.units.map((u) => u.id)).toEqual(pack.units.map((u) => u.id));
  });
});

describe("CNT-03 asset review gate", () => {
  test("a ready unit with a draft asset fails the production build, listing the asset", () => {
    const tweaked = structuredClone(content);
    const farm = tweaked.subjects
      .find((s) => s.subject.id === "animals")
      .units.find((u) => u.unit.id === "farm-animals");
    farm.unit.status = "ready";
    expect(productionProblems(tweaked)).toContain('farm-animals: asset "img-goat" is draft');
    expect(() => buildPacks(tweaked, { channel: "production", release: "2027.03.1" })).toThrow(/img-goat/);
    // Previews still build so the unit can be reviewed on a device.
    expect(() => buildPacks(tweaked, { channel: "preview", release: "2027.03.1" })).not.toThrow();
  });
  test("drafts never ship to production", () => {
    expect(shipsOn("production", { status: "draft" })).toBe(false);
    expect(shipsOn("preview", { status: "draft" })).toBe(true);
  });
});

describe("CNT-09 prompt sheets", () => {
  test("one brief per item in the style guide's words", () => {
    const farm = content.subjects.flatMap((s) => s.units).find((u) => u.unit.id === "farm-animals").unit;
    const md = promptSheet(farm);
    expect(md).toContain("`img-goat`");
    expect(md).toContain("no known characters");
    expect(md.split("\n").filter((l) => l.startsWith("| ") && l.includes("`img-"))).toHaveLength(
      farm.items.length,
    );
  });
});
