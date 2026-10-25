"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import { useFamily } from "@/lib/store";
import { speak } from "@/lib/speech";
import { playSound } from "@/lib/sounds";

/**
 * Painted artwork for a subject place: the world map tile, the trail header and the trail
 * backdrop. The pictures are used as supplied (1536 x 1024 with their own transparency), so
 * `ratio` is width / height of the image. Each spot is a tap target on the trail
 * header, placed as % of the artwork (x, y = centre, w = diameter as % of the width).
 * @type {Record<string, { src: string, small: string, ratio: number, spots: { say: string, label: string, x: number, y: number, w: number }[] }>}
 */
export const SUBJECT_ART = {
  numbers: {
    src: "/art/number-mountain.webp",
    small: "/art/number-mountain-sm.webp",
    ratio: 1536 / 1024,
    spots: [
      { say: "one", label: "Number one", x: 52.4, y: 14.7, w: 11.9 },
      { say: "two", label: "Number two", x: 38.4, y: 43.5, w: 13.4 },
      { say: "three", label: "Number three", x: 68.8, y: 52.3, w: 12.6 },
    ],
  },
  language: {
    src: "/art/letter-forest.webp",
    small: "/art/letter-forest-sm.webp",
    ratio: 1536 / 1024,
    spots: [
      { say: "A", label: "Letter A", x: 21.5, y: 35.2, w: 13.9 },
      { say: "B", label: "Letter B", x: 50.1, y: 23.5, w: 13.9 },
      { say: "C", label: "Letter C", x: 79.1, y: 39.0, w: 13.0 },
      { say: "small a", label: "Small letter a", x: 38.7, y: 47.8, w: 8.3 },
      { say: "small b", label: "Small letter b", x: 65.1, y: 52.8, w: 8.3 },
    ],
  },
  animals: {
    src: "/art/animal-safari.webp",
    small: "/art/animal-safari-sm.webp",
    ratio: 1536 / 1024,
    spots: [
      { say: "elephant", label: "Elephant", x: 32.5, y: 50.0, w: 20.4 },
      { say: "giraffe", label: "Giraffe", x: 68.3, y: 25.3, w: 11.1 },
      { say: "zebra", label: "Zebra", x: 73.2, y: 53.9, w: 13.9 },
      { say: "sun", label: "Sun", x: 82.7, y: 14.6, w: 12 },
    ],
  },
  colours: {
    src: "/art/colour-garden.webp",
    small: "/art/colour-garden-sm.webp",
    ratio: 1536 / 1024,
    spots: [
      { say: "red", label: "Red", x: 22.1, y: 42.5, w: 19.4 },
      { say: "yellow", label: "Yellow", x: 36.5, y: 32.3, w: 18.4 },
      { say: "blue", label: "Blue", x: 49.9, y: 50.2, w: 17.4 },
      { say: "green", label: "Green", x: 62.1, y: 37.6, w: 16.5 },
      { say: "purple", label: "Purple", x: 79.4, y: 33.7, w: 16.5 },
      { say: "orange", label: "Orange", x: 76.5, y: 54.0, w: 16.5 },
      { say: "rainbow", label: "Rainbow", x: 51.9, y: 15.2, w: 19.4 },
    ],
  },
  shapes: {
    src: "/art/shape-town.webp",
    small: "/art/shape-town-sm.webp",
    ratio: 1536 / 1024,
    spots: [
      { say: "triangle", label: "Triangle", x: 21.5, y: 36.1, w: 14.4 },
      { say: "circle", label: "Circle", x: 36.2, y: 35.7, w: 8.6 },
      { say: "square", label: "Square", x: 69.6, y: 24.0, w: 5.8 },
      { say: "rectangle", label: "Rectangle", x: 58.9, y: 48.9, w: 9.6 },
      { say: "star", label: "Star", x: 78.1, y: 58.6, w: 11.5 },
    ],
  },
  // Family & Class Island has no trail, so its art is only on the map.
  family: {
    src: "/art/family-island.webp",
    small: "/art/family-island-sm.webp",
    ratio: 1536 / 1024,
    spots: [],
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
