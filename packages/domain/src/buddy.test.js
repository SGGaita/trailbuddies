import { celebrationFor, greetingFor, newlyOpened, dayKey } from "./buddy.js";

test("older learners get quick, silent celebrations", () => {
  expect(celebrationFor("seedling")).toEqual({ speak: true, ms: 1100 });
  expect(celebrationFor("explorer")).toEqual({ speak: false, ms: 500 });
  expect(celebrationFor("trailblazer").speak).toBe(false);
});

test("the first greeting of the day mentions last time and what's next", () => {
  const now = new Date(2026, 9, 23, 9);
  expect(greetingFor({ name: "Zawadi", lastTitle: "Meet 4 and 5", nextTitle: "Count to 5", greetedOn: "2026-10-22", now })).toEqual({
    event: "greet.today",
    vars: { name: "Zawadi", last: "Meet 4 and 5", next: "Count to 5" },
    firstToday: true,
  });
  expect(greetingFor({ name: "Zawadi", lastTitle: "x", greetedOn: dayKey(now), now }).event).toBe("greet.again");
  expect(greetingFor({ name: "Amani", lastTitle: null, greetedOn: null, now }).event).toBe("greet.today-new");
});

test("only units opened since the last visit animate", () => {
  expect(newlyOpened(["a", "b"], ["a"])).toEqual(["b"]);
  expect(newlyOpened(["a", "b"], null)).toEqual([]);
  expect(newlyOpened(["a"], ["a"])).toEqual([]);
});
