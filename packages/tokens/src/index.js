/**
 * Design tokens for every Trailbuddies client. No React or MUI imports here,
 * so the same values feed the MUI theme (web) and React Native Paper (mobile).
 * The "sunny safari" palette matches the interactive prototype.
 */

/** @typedef {{ main: string, deep?: string, soft?: string }} Swatch */

export const colors = {
  sun: { main: "#ffc93c", deep: "#e0a21b", soft: "#fff1c7" },
  leaf: { main: "#2f9e5b", deep: "#1f5b3a", soft: "#e2f3e8" },
  sky: { main: "#3fa6dc", deep: "#1d6b93", soft: "#e1f2fb" },
  coral: { main: "#e8664a", deep: "#a63d26", soft: "#fde6df" },
  berry: { main: "#b5487a", deep: "#7f2d53", soft: "#f7e3ec" },
  ink: "#263322",
  cream: "#fff8e8",
  sand: "#f5ebd3",
  card: "#ffffff",
  line: "#eadfc4",
  muted: "#6b6955",
  warn: { main: "#a85d12", soft: "#fdeedd" },
  bad: { main: "#b3261e", soft: "#fbe9e7" },
  night: { bg: "#1c1f26", raised: "#272b34", fg: "#eef0f4", muted: "#a7acb8" },
};

/** Avatar colours for learner profiles. */
export const avatarColors = {
  coral: "#e8664a",
  sky: "#3fa6dc",
  leaf: "#2f9e5b",
  berry: "#b5487a",
  sun: "#e0a21b",
  night: "#3b4250",
};

export const fonts = {
  display: '"Baloo 2", "Trebuchet MS", "Arial Rounded MT Bold", sans-serif',
  body: '"Nunito", "Segoe UI", system-ui, sans-serif',
  mono: '"DM Mono", ui-monospace, Menlo, monospace',
};

export const radii = { sm: 12, md: 18, lg: 22, xl: 28, pill: 999 };

/** Spacing unit in px (MUI multiplies this). */
export const spacingUnit = 8;

/**
 * Screen-width breakpoints (development plan §3.4).
 * phone: below sm · tablet: sm to below lg · desktop: lg and up.
 */
export const breakpoints = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 };

/** Minimum touch target in px; children under 6 on a phone get the larger size. */
export const touch = { min: 48, young: 64 };

/**
 * Which layout a width gets.
 * @param {number} width CSS pixels
 * @returns {"phone" | "tablet" | "desktop"}
 */
export function deviceForWidth(width) {
  if (width < breakpoints.sm) return "phone";
  if (width < breakpoints.lg) return "tablet";
  return "desktop";
}

/** Background fills for subject islands on the map. */
export const subjectFills = {
  numbers: "#d6ecf8",
  language: "#fde6df",
  animals: "#e2f3e8",
  colours: "#f7e3ec",
  shapes: "#fff1c7",
  family: "#fde6df",
};
