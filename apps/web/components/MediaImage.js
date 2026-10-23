"use client";
import Box from "@mui/material/Box";
import { useMediaUrl } from "@/lib/media";

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

/** An item's picture: a grown-up's photo when it has one, otherwise its emoji. */
export function ItemFace({ it, sx }) {
  if (it.photo) return <MediaImage id={it.photo} sx={sx} />;
  return it.emoji || null;
}
