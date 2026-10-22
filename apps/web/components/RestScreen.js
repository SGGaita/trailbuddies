"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { restReason } from "@trailbuddies/domain";
import { useFamily } from "@/lib/store";
import Buddy from "@/components/art/Buddy";

/** Why the trail is resting for this learner right now (adults are never locked out). */
export function useRest(learner) {
  const settings = useFamily((s) => s.settings);
  if (!learner || learner.adult) return null;
  return restReason(settings, learner.minutes);
}

/** "Time for a rest" when the screen-time limit is reached or during bedtime. */
export default function RestScreen({ reason, learner }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        p: 3,
        textAlign: "center",
        background:
          reason === "bedtime" ? `linear-gradient(${colors.night.raised}, ${colors.night.bg})` : colors.cream,
        color: reason === "bedtime" ? colors.night.fg : "text.primary",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, maxWidth: 460 }}>
        <Buddy id={learner?.buddy || "zip"} outfit={learner?.outfit} mood="sleep" size={140} />
        <Typography variant="h4" component="h1">
          {reason === "bedtime" ? t("rest.bedtimeTitle") : t("rest.limitTitle")}
        </Typography>
        <Typography sx={{ fontWeight: 700, opacity: 0.85 }}>
          {reason === "bedtime" ? t("rest.bedtimeSub") : t("rest.limitSub")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
          <Button component={Link} href="/play" variant="contained">
            {t("gate.back")}
          </Button>
          <Button
            component={Link}
            href="/family"
            variant="outlined"
            sx={{ borderWidth: 2, color: "inherit" }}
          >
            {t("learner.grownUps")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
