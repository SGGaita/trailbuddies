"use client";
import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { ICON_EMOJI } from "@trailbuddies/domain";
import { colors } from "@trailbuddies/tokens";
import { useMediaUrl } from "@/lib/media";

/** Badge Studio shapes, as clip paths. */
export const BADGE_SHAPES = {
  circle: "circle(50%)",
  square: "inset(4% round 18%)",
  diamond: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
  arch: "inset(4% round 50% 50% 16% 16%)",
};
/** Rim and fill for each colour, from the design tokens. */
export const BADGE_COLOURS = {
  blue: [colors.sky.deep, colors.sky.soft],
  green: [colors.leaf.deep, colors.leaf.soft],
  pink: [colors.berry.deep, colors.berry.soft],
  yellow: [colors.sun.deep, colors.sun.soft],
  orange: [colors.coral.deep, colors.coral.soft],
};

/** A photo still being prepared on this device (a Blob), before it has a media id. */
function BlobPhoto({ blob }) {
  const img = useRef(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    img.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return <Box component="img" ref={img} alt="" sx={cover} />;
}

function MediaPhoto({ id, fallback }) {
  const url = useMediaUrl(id);
  // A photo whose badge was deleted long ago may be gone: show the icon instead.
  return url ? <Box component="img" src={url} alt="" sx={cover} /> : fallback;
}

const cover = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };

/**
 * A grown-up's badge (BST-01): shape, colour and icon, or their photo cropped to the shape.
 * @param {{ badge: { shape?: string, colour?: string, icon?: string, photo?: string | Blob | null },
 *   size?: number, earned?: boolean }} props
 */
export default function CustomBadgeArt({ badge, size = 88, earned = true }) {
  const shape = BADGE_SHAPES[badge.shape] || BADGE_SHAPES.circle;
  const [rim, fill] = BADGE_COLOURS[badge.colour] || BADGE_COLOURS.blue;
  const icon = <span>{ICON_EMOJI[badge.icon] || "⭐"}</span>;
  const photo = badge.photo;
  return (
    <Box
      aria-hidden="true"
      data-custom-badge
      sx={{
        width: size,
        height: size,
        flex: "none",
        display: "grid",
        placeItems: "center",
        bgcolor: rim,
        clipPath: shape,
        filter: earned ? "none" : "grayscale(1)",
        opacity: earned ? 1 : 0.4,
      }}
    >
      <Box
        sx={{
          width: "86%",
          height: "86%",
          position: "relative",
          display: "grid",
          placeItems: "center",
          clipPath: shape,
          bgcolor: fill,
          fontSize: size * 0.4,
          lineHeight: 1,
        }}
      >
        {photo instanceof Blob ? (
          <BlobPhoto blob={photo} />
        ) : typeof photo === "string" ? (
          <MediaPhoto id={photo} fallback={icon} />
        ) : (
          icon
        )}
      </Box>
    </Box>
  );
}
