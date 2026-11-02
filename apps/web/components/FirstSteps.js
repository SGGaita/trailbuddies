"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { firstStepsCard, DEMO_FLAGS } from "@trailbuddies/domain";
import { useFamily, useLearners } from "@/lib/store";

/** ONB-12: after a child's first lesson, a dismissible card with what to try next. */
export default function FirstSteps() {
  const learners = useLearners();
  const tips = useFamily((s) => s.tips);
  const dismissTip = useFamily((s) => s.dismissTip);
  const flags = useFamily((s) => (s.mode === "demo" ? DEMO_FLAGS : s.family?.flags));
  const card = firstStepsCard(
    learners.map((l) => ({
      lessons: (l.results || []).filter((r) => r.kind === "lesson").length,
      stars: l.stars || 0,
    })),
    { dismissed: tips?.firstSteps },
    flags || {},
  );
  if (!card) return null;
  return (
    <Box
      component="section"
      aria-label={t("firstSteps.title")}
      sx={{
        p: 2,
        bgcolor: colors.leaf.soft,
        border: `2px solid ${colors.line}`,
        borderRadius: 4.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Typography component="h2" variant="h6">
        {t("firstSteps.title")}
      </Typography>
      <Typography>{t("firstSteps.progress", { lessons: card.lessons, stars: card.stars })}</Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        {card.links.map((l) =>
          l.ready ? (
            <Button
              key={l.id}
              component={Link}
              href={l.href}
              variant={l.id === "lesson" ? "contained" : "outlined"}
              sx={l.id === "lesson" ? undefined : { borderWidth: 2 }}
            >
              {t(`firstSteps.${l.id}`)}
            </Button>
          ) : (
            <Box key={l.id} sx={{ display: "flex", alignItems: "center", gap: 0.75, minHeight: 48, px: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>{t(`firstSteps.${l.id}`)}</Typography>
              <Chip size="small" label={t("firstSteps.soon")} />
            </Box>
          ),
        )}
      </Box>
      <Button onClick={() => dismissTip("firstSteps")} sx={{ alignSelf: "flex-start" }}>
        {t("firstSteps.dismiss")}
      </Button>
    </Box>
  );
}
