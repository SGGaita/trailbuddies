"use client";
import { createTheme } from "@mui/material/styles";
import { colors, fonts, radii, breakpoints } from "@trailbuddies/tokens";

// Font families come from next/font CSS variables (see app/layout.js), with the token stacks as fallback.
const display = `var(--font-display), ${fonts.display}`;
const body = `var(--font-body), ${fonts.body}`;

/**
 * The "sunny safari" theme. Light only for now: the child app keeps its own look in every
 * system theme; the older-learner dark look arrives with the Explorer theme (Phase 4).
 */
const theme = createTheme({
  cssVariables: true,
  breakpoints: { values: breakpoints },
  palette: {
    mode: "light",
    background: { default: colors.cream, paper: colors.card },
    text: { primary: colors.ink, secondary: colors.muted },
    divider: colors.line,
    primary: { main: colors.leaf.deep, light: colors.leaf.main, contrastText: "#fff" },
    secondary: { main: colors.sun.main, dark: colors.sun.deep, contrastText: colors.ink },
    success: { main: colors.leaf.main },
    info: { main: colors.sky.main },
    warning: { main: colors.warn.main },
    error: { main: colors.bad.main },
    sand: { main: colors.sand },
  },
  shape: { borderRadius: radii.md },
  typography: {
    fontFamily: body,
    fontWeightBold: 800,
    h1: { fontFamily: display, fontWeight: 800, lineHeight: 1.05 },
    h2: { fontFamily: display, fontWeight: 800, lineHeight: 1.05 },
    h3: { fontFamily: display, fontWeight: 800, lineHeight: 1.1 },
    h4: { fontFamily: display, fontWeight: 800, lineHeight: 1.15 },
    h5: { fontFamily: display, fontWeight: 800 },
    h6: { fontFamily: display, fontWeight: 800 },
    button: { textTransform: "none", fontWeight: 800 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 16, minHeight: 48, paddingInline: 20, fontSize: "1rem" } },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: { borderRadius: radii.md, borderColor: colors.line } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 800 } } },
  },
});

export default theme;
export const displayFont = display;
