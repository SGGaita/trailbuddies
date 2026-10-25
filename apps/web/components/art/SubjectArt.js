"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import { useFamily } from "@/lib/store";
import { speak } from "@/lib/speech";
import { playSound } from "@/lib/sounds";

/**
 * Painted artwork for a subject place: the world map tile, the trail header and the trail
 * backdrop. `ratio` is width / height of the image. Each spot is a tap target on the trail
 * header, placed as % of the artwork (x, y = centre, w = diameter as % of the width).
 * @type {Record<string, { src: string, small: string, ratio: number, spots: { say: string, label: string, x: number, y: number, w: number }[] }>}
 */
export const SUBJECT_ART = {
  numbers: {
    src: "/art/number-mountain.webp",
    small: "/art/number-mountain-sm.webp",
    ratio: 1621 / 781,
    spots: [
      { say: "six", label: "Number six", x: 12.5, y: 72, w: 13 },
      { say: "eight", label: "Number eight", x: 28.8, y: 62, w: 16 },
      { say: "ten", label: "Number ten", x: 49.2, y: 35, w: 20 },
      { say: "seven", label: "Number seven", x: 69.8, y: 66, w: 16 },
      { say: "five", label: "Number five", x: 88.8, y: 74, w: 13 },
    ],
  },
  language: {
    src: "/art/letter-forest.webp",
    small: "/art/letter-forest-sm.webp",
    ratio: 1425 / 1014,
    spots: [
      { say: "A", label: "Letter A", x: 18.7, y: 35.5, w: 15 },
      { say: "B", label: "Letter B", x: 49.6, y: 23.7, w: 15 },
      { say: "C", label: "Letter C", x: 80.8, y: 39.4, w: 14 },
      { say: "small a", label: "Small letter a", x: 37.3, y: 48.3, w: 9 },
      { say: "small b", label: "Small letter b", x: 65.8, y: 53.3, w: 9 },
    ],
  },
  animals: {
    src: "/art/animal-safari.webp",
    small: "/art/animal-safari-sm.webp",
    ratio: 1421 / 990,
    spots: [
      { say: "elephant", label: "Elephant", x: 31, y: 50, w: 22 },
      { say: "giraffe", label: "Giraffe", x: 69.7, y: 24.5, w: 12 },
      { say: "zebra", label: "Zebra", x: 75, y: 54, w: 15 },
    ],
  },
};

/** Width for the art at a given height, never wider than its container. */
export const artWidth = (id, height) => `min(100%, ${Math.round(height * SUBJECT_ART[id].ratio)}px)`;

/**
 * A subject's artwork. With `spots`, each letter, number or animal in the picture is a button
 * that says its name. Without it the picture is decorative, so it can sit inside a link.
 * @param {{ id: string, width?: any, height?: any, spots?: boolean, band?: string, buddy?: string, small?: boolean, sx?: object }} props
 */
export default function SubjectArt({
  id,
  width = "100%",
  height,
  spots = false,
  band,
  buddy,
  small = false,
  sx,
}) {
  const art = SUBJECT_ART[id];
  const voice = useFamily((s) => s.settings.voice);
  const [hop, setHop] = useState(/** @type {string | null} */ (null));
  if (!art) return null;
  const tap = (spot) => {
    setHop(spot.label);
    playSound("right");
    speak(spot.say, { band, buddy, enabled: voice });
  };
  return (
    <Box
      sx={{
        position: "relative",
        width,
        ...(height ? { height } : { aspectRatio: `${art.ratio}` }),
        flex: "none",
        ...sx,
      }}
    >
      <Box
        component="img"
        src={small ? art.small : art.src}
        srcSet={`${art.small} 420w, ${art.src} 960w`}
        sizes={small ? "240px" : "(max-width: 600px) 100vw, 600px"}
        alt=""
        draggable={false}
        sx={{ display: "block", width: "100%", height: "100%", objectFit: "contain", userSelect: "none" }}
      />
      {spots &&
        art.spots.map((p) => (
          <Box
            key={p.label}
            component="button"
            type="button"
            aria-label={p.label}
            onClick={() => tap(p)}
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
              ...(hop === p.label && {
                animation: "art-hop .55s ease-out",
                "@keyframes art-hop": {
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
