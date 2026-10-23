"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import { useFamily } from "@/lib/store";
import { speak } from "@/lib/speech";
import { playSound } from "@/lib/sounds";

export const NUMBER_MOUNTAIN_SRC = "/art/number-mountain.webp";
const SRC = NUMBER_MOUNTAIN_SRC;
const SRC_SM = "/art/number-mountain-sm.webp";
/** Width / height of the artwork, so the box keeps its shape before the image loads. */
export const NUMBER_MOUNTAIN_RATIO = 1621 / 781;

const WORDS = { 5: "five", 6: "six", 7: "seven", 8: "eight", 10: "ten" };
/** The numbered peaks, as % of the artwork: where each number sits and the size of its tap area. */
const PEAKS = [
  { n: 6, x: 12.5, y: 72, w: 13 },
  { n: 8, x: 28.8, y: 62, w: 16 },
  { n: 10, x: 49.2, y: 35, w: 20 },
  { n: 7, x: 69.8, y: 66, w: 16 },
  { n: 5, x: 88.8, y: 74, w: 13 },
];

/**
 * Numbers Mountain artwork, used on the world map, the Numbers trail header and its backdrop.
 * With `peaks`, each numbered peak is a button: tap it to hear the number.
 * Without it the picture is decorative, so it can sit inside a link.
 * @param {{ width?: any, peaks?: boolean, band?: string, buddy?: string, small?: boolean, sx?: object }} props
 */
export default function NumberMountain({ width = "100%", peaks = false, band, buddy, small = false, sx }) {
  const voice = useFamily((s) => s.settings.voice);
  const [hop, setHop] = useState(/** @type {number | null} */ (null));
  const tap = (n) => {
    setHop(n);
    playSound("right");
    speak(WORDS[n], { band, buddy, enabled: voice });
  };
  return (
    <Box sx={{ position: "relative", width, aspectRatio: `${NUMBER_MOUNTAIN_RATIO}`, flex: "none", ...sx }}>
      <Box
        component="img"
        src={small ? SRC_SM : SRC}
        srcSet={`${SRC_SM} 420w, ${SRC} 960w`}
        sizes={small ? "240px" : "(max-width: 600px) 100vw, 600px"}
        alt=""
        draggable={false}
        sx={{ display: "block", width: "100%", height: "100%", objectFit: "contain", userSelect: "none" }}
      />
      {peaks &&
        PEAKS.map((p) => (
          <Box
            key={p.n}
            component="button"
            type="button"
            aria-label={`Number ${WORDS[p.n]}`}
            onClick={() => tap(p.n)}
            onAnimationEnd={() => setHop(null)}
            sx={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.w}%`,
              minWidth: 48,
              aspectRatio: "1",
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: 0,
              p: 0,
              bgcolor: "transparent",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              "&:focus-visible": { outline: "4px solid #fff", outlineOffset: 2 },
              ...(hop === p.n && {
                animation: "nm-hop .55s ease-out",
                "@keyframes nm-hop": {
                  "0%": { boxShadow: "0 0 0 0 rgba(255,255,255,.9)" },
                  "100%": { boxShadow: "0 0 0 22px rgba(255,255,255,0)" },
                },
              }),
            }}
          />
        ))}
    </Box>
  );
}
