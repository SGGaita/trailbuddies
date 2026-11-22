import { uploadSrc } from "@trailbuddies/content";
import Box from "@mui/material/Box";
import { colors } from "@trailbuddies/tokens";
import CustomBadgeArt from "./CustomBadgeArt";

const RING = { bronze: "#c98a4b", silver: "#b8c2cc", gold: colors.sun.main };

/** A badge medal: tier ring and icon; unearned badges are silhouettes (BDG-02). Custom badges
 * (Badge Studio) are drawn by CustomBadgeArt. */
export default function BadgeArt({ badge, earned = true, size = 88 }) {
  // A grown-up's badge (Badge Studio) is drawn from its design, or the design it was earned with.
  if (badge.custom || badge.shape) return <CustomBadgeArt badge={badge.custom || badge} size={size} earned={earned} />;
  // Built-in badges can have uploaded art from the content admin (CMS-08); the emoji is the fallback.
  const art = uploadSrc(badge.art);
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.48,
        bgcolor: earned ? "background.paper" : colors.sand,
        border: `${Math.round(size / 11)}px solid ${earned ? RING[badge.tier] || colors.line : colors.line}`,
        boxShadow: earned ? `0 4px 0 ${colors.line}` : "none",
        filter: earned ? "none" : "grayscale(1) brightness(0.2)",
        opacity: earned ? 1 : 0.35,
        flex: "none",
        ...(art ? { backgroundImage: `url("${art}")`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }}
    >
      {!art && (badge.icon || "🏅")}
    </Box>
  );
}
