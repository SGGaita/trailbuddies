import { jest } from "@jest/globals";
import {
  getSubjects,
  getSubject,
  getUnit,
  getReadyUnits,
  lessonIds,
  buddyLine,
  buddySays,
  linesFor,
  catalogue,
  searchLibrary,
  libraryPictures,
} from "./index.js";

test("catalogue lists the five MVP subjects", () => {
  expect(getSubjects().map((s) => s.id)).toEqual(["numbers", "language", "animals", "colours", "shapes"]);
  expect(catalogue.subjects.flatMap((s) => s.units)).toHaveLength(26);
});

test("ready units have content; planned units don't", () => {
  expect(getUnit("counting-1-5").items).toHaveLength(5);
  expect(getUnit("counting-6-10").items.map((i) => i.number)).toEqual([6, 7, 8, 9, 10]);
  expect(getUnit("farm-animals")).toBeNull();
  expect(getReadyUnits("numbers").map((u) => u.id)).toEqual(["counting-1-5", "counting-6-10"]);
  expect(getReadyUnits("animals").map((u) => u.id)).toEqual(["where-animals-live"]);
  expect(getReadyUnits("language").map((u) => u.id)).toEqual(["letters-a-e"]);
});

test("lesson ids come from content or the catalogue count", () => {
  const numbers = getSubject("numbers");
  expect(lessonIds(numbers.units[0])[0]).toBe("counting-1-5-1");
  expect(lessonIds(numbers.units[1])).toHaveLength(6);
});

test("buddy lines fill placeholders", () => {
  expect(buddyLine("greet.back", { name: "Zawadi" })).toBe("Hi Zawadi! Welcome back!");
  expect(buddyLine("nope")).toBe("Well done!"); // unknown events use the fallback
});

describe("buddy script table", () => {
  test("a buddy's own lines come first, then shared lines", () => {
    expect(linesFor("lesson.correct", { buddy: "zip" })[0]).toMatch(/Beep/);
    expect(linesFor("lesson.done", { buddy: "zip" })).toEqual(linesFor("lesson.done"));
  });
  test("an event with no line falls back and warns in development", () => {
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(linesFor("no.such-event", { buddy: "tumi" })).toEqual(linesFor("fallback"));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("no.such-event"));
    spy.mockRestore();
  });
  test("variety: never the same line twice in a row", () => {
    let last = null;
    for (let i = 0; i < 40; i++) {
      const line = buddySays("lesson.correct", { buddy: "juma", last });
      expect(line).not.toBe(last);
      last = line;
    }
  });
  test("placeholders are filled", () => {
    expect(buddyLine("greet.again", { name: "Amani" }, 0, "kiki")).toBe(
      "Hello, Amani! Ready for a calm adventure?",
    );
  });
});

test("the picture library is searchable by name and tag (BLD-02)", () => {
  const all = libraryPictures();
  expect(all.length).toBeGreaterThanOrEqual(140);
  expect(new Set(all.map((p) => p.emoji)).size).toBe(all.length);
  expect(searchLibrary("giraffe")[0]).toMatchObject({ emoji: "🦒", name: "giraffe" });
  const farm = searchLibrary("farm");
  expect(farm.map((p) => p.name)).toEqual(expect.arrayContaining(["cow", "goat", "tractor"]));
  expect(searchLibrary("")).toHaveLength(all.length);
  expect(searchLibrary("zzzz")).toEqual([]);
});
