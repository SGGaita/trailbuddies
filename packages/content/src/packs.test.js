import { installPack, installMap, installBadges, getUnit, getSubject, getSubjects, getAllSubjects, uploadSrc, builtInBadges } from "./index.js";
import { loadContent, buildPacks, productionProblems, shipsOn, promptSheet } from "../scripts/packs.js";

const content = loadContent();

describe("CNT-02 content packs", () => {
  test("production ships approved units only; preview adds drafts", () => {
    const prod = buildPacks(content, { channel: "production", release: "2027.03.1" });
    const prev = buildPacks(content, { channel: "preview", release: "2027.03.1" });
    const units = (b) => b.manifest.packs.flatMap((p) => p.units);
    // Every reviewed unit ships; the animal units still in draft (all but where-animals-live) do not.
    expect(units(prod)).toEqual([
      "counting-1-5",
      "counting-6-10",
      "number-shapes-0-10",
      "more-less-same",
      "numbers-11-20",
      "letters-a-e",
      "letter-sounds-1",
      "letter-sounds-2",
      "upper-lower",
      "blending-cvc",
      "where-animals-live",
      "red-yellow-blue",
      "more-colours",
      "colours-of-things",
      "same-different-colour",
      "mixing-colours",
      "circle-square-triangle",
      "more-shapes",
      "big-small-shapes",
      "shapes-around-us",
      "sides-and-corners",
      "clocks-and-my-day",
      "my-first-space-mission",
      "meet-the-feelings",
      "watch-the-weather",
    ]);
    expect(units(prev)).toHaveLength(30);
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

describe("installing a downloaded pack", () => {
  test("its units replace the built-in ones and new catalogue entries are added", () => {
    const unit = structuredClone(getUnit("counting-1-5"));
    unit.lessons[0].title = "Counting fun (from a pack)";
    const extra = { id: "numbers-extra", title: "Extra", band: "sprout", status: "ready", lessons: 1 };
    const ok = installPack({
      schema: "pack/1",
      subject: {
        id: "numbers",
        units: [
          { id: "counting-1-5", title: "Counting 1 to 5", band: "seedling", status: "ready", lessons: 6 },
          extra,
        ],
      },
      units: [unit],
    });
    expect(ok).toBe(true);
    expect(getUnit("counting-1-5").lessons[0].title).toBe("Counting fun (from a pack)");
    expect(getSubject("numbers").units.at(-1).id).toBe("numbers-extra");
    expect(installPack({ schema: "pack/1", subject: { id: "cooking", units: [] }, units: [] })).toBe(false);
    expect(installPack({ nope: true })).toBe(false);
  });

  test("a new trail from the content admin joins the map (CMS-05)", () => {
    const unit = { ...getUnit("counting-1-5"), id: "clouds", subject: "skies", lessons: getUnit("counting-1-5").lessons.map((l, i) => ({ ...l, id: `clouds-${i + 1}` })) };
    const subject = { id: "skies", name: "Skies", place: "Sky Hill", island: "skies", art: "01JB0000000000000000000A01", units: [{ id: "clouds", title: "Clouds", band: "sprout", status: "ready" }] };
    expect(installPack({ schema: "pack/1", subject, units: [unit], assets: {} })).toBe(true);
    expect(getSubject("skies").units.map((e) => e.id)).toEqual(["clouds"]);
    expect(getUnit("clouds").title).toBe(unit.title);
  });
});

describe("the map and badges from the manifest (CMS-05, CMS-08)", () => {
  test("trail order, archived trails and island art follow the published map", () => {
    const now = getAllSubjects().map((s) => ({ ...s, units: s.units.slice() }));
    const map = [now[2], { ...now[0], archived: true }, { ...now[1], art: "01JB0000000000000000000A02", units: now[1].units.slice().reverse() }];
    expect(installMap(map)).toBe(true);
    expect(getAllSubjects().slice(0, 3).map((s) => s.id)).toEqual(map.map((m) => m.id));
    expect(getSubjects().some((s) => s.id === now[0].id)).toBe(false); // archived: off the map
    expect(getSubject(now[0].id)).not.toBeNull(); // still there for history
    expect(getSubject(now[1].id).units.map((e) => e.id)).toEqual(now[1].units.map((e) => e.id).reverse());
    expect(uploadSrc(getSubject(now[1].id).art)).toBe("/api/content/assets/01JB0000000000000000000A02");
    installMap(now); // restore
    expect(getSubjects().map((s) => s.id)).toEqual(now.map((s) => s.id));
  });

  test("published badges replace the bundled list in place", () => {
    const before = builtInBadges.slice();
    const retired = { ...before[0], retired: true };
    expect(installBadges({ schema: "badges/1", badges: [retired, ...before.slice(1)] })).toBe(true);
    expect(builtInBadges[0].retired).toBe(true);
    expect(installBadges({ schema: "badges/1", badges: [] })).toBe(false);
    installBadges({ schema: "badges/1", badges: before });
  });
});

describe("the manifest carries the map and the badges (CMS-05, CMS-08)", () => {
  test("map lists trails with units on the channel; badges are their own file", () => {
    const { manifest, files } = buildPacks(loadContent(), { channel: "preview", release: "r1" });
    expect(manifest.map.map((m) => m.id)).toEqual(manifest.packs.map((p) => p.subject));
    const b = files.find((f) => f.name === manifest.badges.file);
    expect(JSON.parse(b.body)).toMatchObject({ schema: "badges/1", release: "r1", hash: manifest.badges.hash });
    expect(JSON.parse(b.body).badges.length).toBeGreaterThan(10);
  });
});
