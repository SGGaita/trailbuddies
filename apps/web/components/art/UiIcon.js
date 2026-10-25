"use client";
import Box from "@mui/material/Box";
import { useFamily } from "@/lib/store";

// Painted UI icons live in public/icons/ui (128px, transparent): `name.webp` and a selected `name-on.webp`.

/**
 * Decorative painted icon: the selected picture when `on`. The parent carries the label.
 * @param {{ name: string, size?: any, on?: boolean, sx?: object }} props
 */
export default function UiIcon({ name, size = 32, on = false, sx }) {
  return (
    <Box
      component="img"
      src={`/icons/ui/${name}${on ? "-on" : ""}.webp`}
      alt=""
      draggable={false}
      sx={{ width: size, height: size, display: "block", flex: "none", userSelect: "none", ...sx }}
    />
  );
}

/**
 * Speaker for the round "hear it" buttons. Shows the muted picture when voice is off in the
 * family settings, and the selected picture while the button is hovered, focused or pressed.
 * @param {{ size?: any }} props
 */
export function SoundIcon({ size = 32 }) {
  const voice = useFamily((s) => s.settings.voice);
  if (voice === false) return <UiIcon name="sound-muted" size={size} />;
  return (
    <Box
      component="span"
      sx={{
        position: "relative",
        width: size,
        height: size,
        display: "block",
        flex: "none",
        "& > img + img": { position: "absolute", inset: 0, opacity: 0, transition: "opacity .12s" },
        "button:hover > & > img + img, button:focus-visible > & > img + img, button:active > & > img + img": {
          opacity: 1,
        },
      }}
    >
      <UiIcon name="sound" size="100%" />
      <UiIcon name="sound" on size="100%" />
    </Box>
  );
}
