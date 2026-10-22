import { deviceForWidth, breakpoints, colors, touch } from "./index.js";

test("widths map to phone, tablet and desktop layouts", () => {
  expect(deviceForWidth(390)).toBe("phone");
  expect(deviceForWidth(breakpoints.sm)).toBe("tablet");
  expect(deviceForWidth(1180)).toBe("tablet");
  expect(deviceForWidth(1440)).toBe("desktop");
});

test("palette and touch sizes are defined", () => {
  expect(colors.leaf.deep).toMatch(/^#[0-9a-f]{6}$/);
  expect(touch.young).toBeGreaterThan(touch.min);
});
