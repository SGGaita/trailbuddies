import { getSubjects, getSubject, getUnit, getReadyUnits, lessonIds, buddyLine, catalogue } from "./index.js";

test("catalogue lists the five MVP subjects", () => {
  expect(getSubjects().map((s) => s.id)).toEqual(["numbers", "language", "animals", "colours", "shapes"]);
  expect(catalogue.subjects.flatMap((s) => s.units)).toHaveLength(25);
});

test("ready units have content; planned units don't", () => {
  expect(getUnit("counting-1-5").items).toHaveLength(5);
  expect(getUnit("counting-6-10").items.map((i) => i.number)).toEqual([6, 7, 8, 9, 10]);
  expect(getUnit("farm-animals")).toBeNull();
  expect(getReadyUnits("numbers").map((u) => u.id)).toEqual(["counting-1-5", "counting-6-10"]);
  expect(getReadyUnits("animals")).toEqual([]);
});

test("lesson ids come from content or the catalogue count", () => {
  const numbers = getSubject("numbers");
  expect(lessonIds(numbers.units[0])[0]).toBe("counting-1-5-1");
  expect(lessonIds(numbers.units[1])).toHaveLength(6);
});

test("buddy lines fill placeholders", () => {
  expect(buddyLine("greet.back", { name: "Zawadi" })).toBe("Hi Zawadi! Welcome back!");
  expect(buddyLine("nope")).toBe("");
});
