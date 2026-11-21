import { validate } from "@trailbuddies/content-schema";
import { can, diffUnit, fieldErrors, homeFor, keptItems, newItemId, removeItem, syncEntry, uploadAssetEntry, uploadedMediaId } from "./index.js";

const unit = {
  schema: "unit/1",
  id: "farm-animals",
  subject: "animals",
  title: "Farm animals",
  band: "seedling",
  status: "draft",
  items: [
    { id: "cow", label: "cow", emoji: "🐄" },
    { id: "goat", label: "goat", emoji: "🐐" },
    { id: "pig", label: "pig", emoji: "🐖" },
  ],
  lessons: [{ id: "farm-animals-1", title: "One", focus: ["cow", "goat", "pig"], review: ["cow"], exercises: [{ type: "listen-tap", choices: 2 }, { type: "match" }, { type: "listen-tap" }] }],
  checkpoint: { review: 3 },
};

describe("CMS-01 roles", () => {
  test("what each role can do", () => {
    expect(can("admin", "publish")).toBe(true);
    expect(can("editor", "edit")).toBe(true);
    expect(can("editor", "publish")).toBe(false);
    expect(can("reviewer", "approve-asset")).toBe(true);
    expect(can("moderator", "edit")).toBe(false);
    expect(can(null, "edit")).toBe(false);
    expect([homeFor("editor"), homeFor("moderator"), homeFor(undefined)]).toEqual(["/admin/content", "/admin/moderation", null]);
  });
});

describe("CMS-03 editing rules", () => {
  test("new item ids come from the word and never clash", () => {
    expect(newItemId("Camel", ["cow"])).toBe("camel");
    expect(newItemId("cow", ["cow", "cow-2"])).toBe("cow-3");
    expect(newItemId("Guinea fowl!", [])).toBe("guinea-fowl");
    expect(newItemId("🐄", [])).toBe("item");
  });
  test("removing an item takes it out of every lesson", () => {
    const u = removeItem(unit, "cow");
    expect(u.items.map((i) => i.id)).toEqual(["goat", "pig"]);
    expect(u.lessons[0].focus).toEqual(["goat", "pig"]);
    expect(u.lessons[0].review).toEqual([]);
  });
  test("ids children have played are kept", () => {
    expect(keptItems(unit, removeItem(unit, "pig"))).toEqual(["cow", "goat"]);
  });
  test("the catalogue entry follows the unit", () => {
    expect(syncEntry({ id: "farm-animals", title: "Old", band: "sprout", status: "draft", lessons: 4 }, { ...unit, status: "ready" })).toEqual({ id: "farm-animals", title: "Farm animals", band: "seedling", status: "ready", lessons: 1 });
  });
  test("uploaded pictures are assets children see once approved", () => {
    const a = uploadAssetEntry("01JB0000000000000000000M01");
    expect(a).toMatchObject({ id: "img-up-01jb0000000000000000000m01", source: "uploaded", review_status: "reviewed" });
    expect(validate("assets", { schema: "assets/1", assets: [a] }).valid).toBe(true);
    expect(uploadedMediaId(a)).toBe("01JB0000000000000000000M01");
    expect(uploadedMediaId({ path: "animals/farm-animals/cow.webp" })).toBe(null);
  });
});

describe("what changed", () => {
  test("a plain-words diff", () => {
    const after = { ...removeItem(unit, "pig"), title: "On the farm", items: [...removeItem(unit, "pig").items, { id: "camel", label: "camel", emoji: "🐪" }] };
    after.items[0] = { ...after.items[0], fact: "Cows give milk." };
    expect(diffUnit(unit, after)).toEqual(["renamed to “On the farm”", "added camel", "removed pig", "edited cow", "lessons changed"]);
    expect(diffUnit(unit, { ...unit, status: "ready" })).toEqual(["marked ready for children"]);
    expect(diffUnit(null, unit)).toEqual(["new unit “Farm animals”"]);
    expect(diffUnit(unit, { ...unit, items: [unit.items[1], unit.items[0], unit.items[2]] })).toEqual(["items reordered"]);
  });
  test("validator errors land next to their field", () => {
    const bad = { ...unit, items: [{ id: "cow", label: "" }, ...unit.items.slice(1)] };
    const r = validate("unit", bad);
    expect(r.valid).toBe(false);
    expect(fieldErrors(r.errors)[0]).toMatchObject({ field: "items.0.label" });
    expect(fieldErrors(['lesson "farm-animals-1": needs new (focus) or review items'])[0].field).toBe("lesson:farm-animals-1");
  });
});
