import { wallWeek, wallNames, badgeWall, wallLayout, wallScale, wallPages, newOnWall, pageOf, WALL_TILE } from "./index.js";

const catalogue = [
  { id: "first-steps", name: "First Steps", icon: "👣", tier: "bronze" },
  { id: "counting-champ", name: "Counting Champ", icon: "🔢", tier: "silver" },
  { id: "perfect-ten", name: "Perfect Ten", icon: "🔟", tier: "bronze" },
];

describe("wallWeek", () => {
  test("starts on Monday at midnight in the school's time zone", () => {
    // Wednesday 18 Nov 2026, 10:00 in Nairobi (UTC+3)
    const w = wallWeek(new Date("2026-11-18T07:00:00Z"), "Africa/Nairobi");
    expect(w).toEqual({
      from: "2026-11-15T21:00:00.000Z",
      to: "2026-11-22T21:00:00.000Z",
      monday: "2026-11-16",
      sunday: "2026-11-22",
      timeZone: "Africa/Nairobi",
    });
  });

  test("Sunday evening in Nairobi is still this week, though it is Monday nowhere yet in UTC terms", () => {
    // Sunday 22 Nov, 22:30 Nairobi = 19:30 UTC
    const w = wallWeek(new Date("2026-11-22T19:30:00Z"), "Africa/Nairobi");
    expect(w.monday).toBe("2026-11-16");
    // Monday 23 Nov, 01:00 Nairobi = Sunday 22:00 UTC: a new week has begun at school
    expect(wallWeek(new Date("2026-11-22T22:00:00Z"), "Africa/Nairobi").monday).toBe("2026-11-23");
  });

  test("last week, and a Monday itself", () => {
    const now = new Date("2026-11-16T05:00:00Z"); // Monday 08:00 Nairobi
    expect(wallWeek(now, "Africa/Nairobi").monday).toBe("2026-11-16");
    expect(wallWeek(now, "Africa/Nairobi", 1)).toMatchObject({
      monday: "2026-11-09",
      sunday: "2026-11-15",
      from: "2026-11-08T21:00:00.000Z",
      to: "2026-11-15T21:00:00.000Z",
    });
  });

  test("weeks that cross a clock change are 7 local days long", () => {
    // UK clocks go back on Sunday 25 Oct 2026
    const w = wallWeek(new Date("2026-10-21T12:00:00Z"), "Europe/London");
    expect(w.from).toBe("2026-10-18T23:00:00.000Z"); // Monday 00:00 BST
    expect(w.to).toBe("2026-10-26T00:00:00.000Z"); // Monday 00:00 GMT
  });

  test("an unknown zone falls back to UTC", () => {
    const w = wallWeek(new Date("2026-11-18T07:00:00Z"), "Mars/Olympus");
    expect(w).toMatchObject({ timeZone: "UTC", from: "2026-11-16T00:00:00.000Z" });
  });
});

describe("wallNames", () => {
  test("first names only, with the initial just for children who share one", () => {
    const names = wallNames([
      { id: "1", first_name: "Amani", initial: "A" },
      { id: "2", first_name: "amani ", initial: "K" },
      { id: "3", first_name: "Zawadi", initial: "M" },
      { id: "4", first_name: "Baraka", initial: null },
    ]);
    expect([...names.values()]).toEqual(["Amani A.", "amani K.", "Zawadi", "Baraka"]);
  });
});

describe("badgeWall", () => {
  const students = [
    { id: "z", first_name: "Zawadi", avatar_color: "sky", badges: [] },
    {
      id: "a",
      first_name: "Amani",
      avatar_color: "coral",
      badges: [
        { badge_id: "counting-champ", tier: null, at: "2026-11-17T09:00:00Z", where: "home" },
        { badge_id: "first-steps", tier: "bronze", at: "2026-11-16T09:00:00Z" },
        { badge_id: "first-steps", tier: "bronze", at: "2026-11-18T09:00:00Z" },
        { badge_id: "studio-made", at: "2026-11-18T09:00:00Z" },
      ],
    },
    { id: "b", first_name: "Baraka", badges: [{ badge_id: "perfect-ten", tier: "gold", at: "2026-11-19T09:00:00Z" }] },
  ];

  test("every child, by name; badges in the order they were earned; unknown badges left out", () => {
    const wall = badgeWall(students, catalogue);
    expect(wall.tiles.map((t) => t.name)).toEqual(["Amani", "Baraka", "Zawadi"]);
    expect(wall.tiles[0]).toMatchObject({ letter: "A", colour: "coral" });
    expect(wall.tiles[0].badges.map((b) => [b.id, b.tier, b.where])).toEqual([
      ["first-steps", "bronze", "class"],
      ["counting-champ", "silver", "home"],
    ]);
    expect(wall.tiles[1]).toMatchObject({ colour: "leaf" }); // no colour set: the default
    expect(wall.tiles[1].badges[0].tier).toBe("gold");
    expect(wall.tiles[2]).toMatchObject({ badges: [], colour: "sky" });
    expect(wall).toMatchObject({ total: 3, earners: 2 });
  });

  test("never sorted by count", () => {
    const wall = badgeWall(
      [
        { id: "1", first_name: "Yusuf", badges: catalogue.map((b, i) => ({ badge_id: b.id, at: `2026-11-1${i}T00:00:00Z` })) },
        { id: "2", first_name: "Ada", badges: [] },
      ],
      catalogue,
    );
    expect(wall.tiles.map((t) => t.name)).toEqual(["Ada", "Yusuf"]);
  });
});

describe("pages", () => {
  test("as many tiles as fit; at least one", () => {
    expect(wallLayout({ width: 1440, height: 700 })).toEqual({ cols: 5, rows: 3, perPage: 15, scale: 1 });
    expect(wallLayout({ width: 300, height: 100 })).toEqual({ cols: 1, rows: 1, perPage: 1, scale: 1 });
    expect(wallLayout({ width: WALL_TILE.minWidth * 2 + WALL_TILE.gap, height: WALL_TILE.height }).cols).toBe(2);
  });

  test("full screen draws bigger tiles, so fewer fit", () => {
    expect(wallScale({ width: 1400 }, false)).toBe(1);
    expect(wallScale({ width: 1400 }, true)).toBe(1.5);
    expect(wallScale({ width: 1000 }, true)).toBe(1.25);
    expect(wallScale({ width: 500 }, true)).toBe(1);
    expect(wallLayout({ width: 1840, height: 860 }, 1.5)).toEqual({ cols: 4, rows: 3, perPage: 12, scale: 1.5 });
  });

  test("balanced pages, so the last page isn't one lonely tile", () => {
    const tiles = Array.from({ length: 31 }, (_, i) => ({ id: `s${i}` }));
    const pages = wallPages(tiles, 15);
    expect(pages.map((p) => p.length)).toEqual([11, 11, 9]);
    expect(pages.flat()).toEqual(tiles);
    expect(wallPages(tiles.slice(0, 4), 15)).toEqual([tiles.slice(0, 4)]);
    expect(pageOf(pages, "s25")).toBe(2);
    expect(pageOf(pages, "nobody")).toBe(-1);
  });
});

describe("newOnWall", () => {
  test("only badges that arrived since the last refresh", () => {
    const before = badgeWall([{ id: "a", first_name: "Amani", badges: [{ badge_id: "first-steps", at: "2026-11-16T09:00:00Z" }] }], catalogue);
    const after = badgeWall(
      [
        {
          id: "a",
          first_name: "Amani",
          badges: [
            { badge_id: "first-steps", at: "2026-11-16T09:00:00Z" },
            { badge_id: "perfect-ten", at: "2026-11-18T09:00:00Z" },
          ],
        },
      ],
      catalogue,
    );
    expect([...newOnWall(before, after)]).toEqual(["a:perfect-ten"]);
    expect(newOnWall(null, after).size).toBe(0);
  });
});
