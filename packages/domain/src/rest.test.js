import { restReason } from "./rest.js";

const at = (h, m = 0) => new Date(2026, 9, 22, h, m);
const bed = { on: true, start: "19:30", end: "06:30" };

test("the limit closes the trail once today's minutes reach it; 0 means no limit", () => {
  expect(restReason({ limit: 20 }, 19, at(12))).toBeNull();
  expect(restReason({ limit: 20 }, 20, at(12))).toBe("limit");
  expect(restReason({ limit: 0 }, 300, at(12))).toBeNull();
});

test("bedtime wraps past midnight and only applies when on", () => {
  expect(restReason({ bedtime: bed }, 0, at(19, 29))).toBeNull();
  expect(restReason({ bedtime: bed }, 0, at(19, 30))).toBe("bedtime");
  expect(restReason({ bedtime: bed }, 0, at(2))).toBe("bedtime");
  expect(restReason({ bedtime: bed }, 0, at(6, 30))).toBeNull();
  expect(restReason({ bedtime: { ...bed, on: false } }, 0, at(22))).toBeNull();
  expect(restReason({ bedtime: { on: true, start: "13:00", end: "15:00" } }, 0, at(14))).toBe("bedtime");
});
