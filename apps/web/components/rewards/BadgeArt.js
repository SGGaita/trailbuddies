import Box from "@mui/material/Box";
import { colors } from "@trailbuddies/tokens";

const RING = { bronze: "#c98a4b", silver: "#b8c2cc", gold: colors.sun.main };

/** A badge medal: tier ring and icon; unearned badges are silhouettes (BDG-02). */
export default function BadgeArt({ badge, earned = true, size = 88 }) {
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
      }}
    >
      {badge.icon || "🏅"}
    </Box>
  );
}
