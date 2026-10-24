"use client";
import Box from "@mui/material/Box";
import { useMediaUrl } from "@/lib/media";
import { hasArt } from "@/lib/itemArt";
import ItemArt from "@/components/art/ItemArt";
import UnitImage from "@/components/art/UnitImage";

/**
 * A grown-up's photo (from this device, or a short-lived link to the family's copy).
 * Sized in `em` by default so it scales with the text around it, like an emoji.
 * @param {{ id: string, alt?: string, sx?: object }} props
 */
export default function MediaImage({ id, alt = "", sx }) {
  const url = useMediaUrl(id);
  return (
    <Box
      component="span"
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      sx={{
        display: "inline-block",
        width: "1.3em",
        height: "1.3em",
        borderRadius: 3,
        flex: "none",
        bgcolor: "rgba(38,51,34,.08)",
        backgroundImage: url ? `url("${url}")` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        verticalAlign: "middle",
        ...sx,
      }}
    />
  );
}

/**
 * An item's picture: a grown-up's photo when it has one, an approved illustration, a drawn
 * colour or shape, otherwise
 * its emoji (or its word when it has no picture at all, with `fallback`).
 */
export function ItemFace({ it, sx, fallback = false }) {
  if (it.photo) return <MediaImage id={it.photo} sx={sx} />;
  if (it.imageSrc) return <UnitImage it={it} />;
  if (hasArt(it)) return <ItemArt it={it} />;
  return it.emoji || (fallback ? it.label : null);
}
