"use client";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";

/**
 * Lesson header progress, as in the prototype: one segment per step
 * (green = done, sun = current, sand = to come) and an "n of N" count.
 * @param {{ index: number, total: number }} props
 */
export default function LessonProgress({ index, total }) {
  const n = Math.min(index + 1, total);
  return (
    <>
      <Box
        role="progressbar"
        aria-label={t("lesson.progress", { n, total })}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
        sx={{ flex: 1, minWidth: 0, display: "flex", gap: { xs: 0.5, sm: 1 } }}
      >
        {Array.from({ length: total }, (_, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: { xs: 12, sm: 16 },
              borderRadius: 2,
              bgcolor: i < index ? colors.leaf.main : i === index ? colors.sun.main : colors.sand,
              transition: "background-color .3s",
            }}
          />
        ))}
      </Box>
      <Typography
        sx={{ flex: "none", fontWeight: 800, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
      >
        {t("lesson.count", { n, total })}
      </Typography>
    </>
  );
}
