import {
  normaliseCode,
  validCode,
  studentName,
  parseRoster,
  randomPictures,
  bandBirth,
  teacherChecklist,
  scopeAllows,
  PICTURES,
} from "./index.js";

describe("CLS-01 join codes", () => {
  test("6 easy characters, typed any way", () => {
    expect(normaliseCode(" ab-c 23x ")).toBe("ABC23X");
    expect(validCode("abc-23x")).toBe(true);
    expect(validCode("ABC10X")).toBe(false); // no 0 or 1
    expect(validCode("ABC")).toBe(false);
  });
});

describe("CLS-02 roster", () => {
  test("a pasted list becomes first names, surnames become initials", () => {
    const { entries, clashes } = parseRoster("Zawadi\nAmani Otieno, Baraka\n\n  Wanjiru  Kamau ");
    expect(entries).toEqual([
      { first_name: "Zawadi", initial: null },
      { first_name: "Amani", initial: "O" },
      { first_name: "Baraka", initial: null },
      { first_name: "Wanjiru", initial: "K" },
    ]);
    expect(clashes).toEqual([]);
  });
  test("26 names in one go", () => {
    const names = Array.from({ length: 26 }, (_, i) => `Child${String.fromCharCode(65 + i)}`).join("\n");
    expect(parseRoster(names).entries).toHaveLength(26);
  });
  test("two children with the same name ask for an initial", () => {
    const { clashes } = parseRoster("Amani\namani", [{ first_name: "Zawadi" }]);
    expect(clashes).toEqual(["amani"]);
    expect(parseRoster("Zawadi", [{ first_name: "Zawadi", initial: null }]).clashes).toEqual(["zawadi"]);
    expect(parseRoster("Zawadi M", [{ first_name: "Zawadi", initial: null }]).clashes).toEqual([]);
    expect(studentName({ first_name: "Zawadi", initial: "M" })).toBe("Zawadi M.");
  });
  test("picture passwords and a birth year from the band", () => {
    const pics = randomPictures(() => 0.5);
    expect(pics).toHaveLength(3);
    pics.forEach((p) => expect(PICTURES).toContain(p));
    expect(bandBirth("sprout", new Date("2027-03-01"))).toEqual({ year: 2021, month: 1 });
  });
});

describe("HLP-03 teacher checklist", () => {
  test("ticks itself off", () => {
    expect(teacherChecklist({ classes: [] }).filter((s) => s.done)).toEqual([]);
    const done = teacherChecklist({ classes: [{ students: 3, printed: true, played: false, viewed: true }] });
    expect(done.map((s) => [s.id, s.done])).toEqual([
      ["students", true],
      ["letters", true],
      ["tablets", false],
      ["assign", false],
      ["progress", true],
    ]);
  });
});

describe("CLS-05 scopes", () => {
  test("home subjects only when the parent shares all; Family Island never", () => {
    expect(scopeAllows("class")).toEqual({
      classPlay: true,
      totals: true,
      homeSubjects: false,
      familyLessons: false,
    });
    expect(scopeAllows("all").homeSubjects).toBe(true);
    expect(scopeAllows("all").familyLessons).toBe(false);
  });
});
