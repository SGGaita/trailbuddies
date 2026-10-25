"use client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { unseenReleases } from "@trailbuddies/domain";
import { useFamily } from "@/lib/store";
import { APP_VERSION } from "@/lib/version";

/** OFF-06: after an update, grown-ups see what changed (never the children). */
export default function WhatsNew() {
  const seen = useFamily((s) => s.seenVersion);
  const markSeen = useFamily((s) => s.markSeen);
  const releases = unseenReleases(seen, APP_VERSION);
  if (!releases.length) return null;
  return (
    <Box
      component="section"
      aria-label={t("whatsNew.title")}
      sx={{
        p: 2,
        bgcolor: colors.sky?.soft || colors.sand,
        border: `2px solid ${colors.line}`,
        borderRadius: 4.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography component="h2" variant="h6">
        {t("whatsNew.title")}
      </Typography>
      {releases.map((r) => (
        <Box
          key={r.version}
          component="ul"
          sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.5 }}
        >
          {r.notes.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </Box>
      ))}
      <Button variant="contained" sx={{ alignSelf: "flex-start" }} onClick={() => markSeen(APP_VERSION)}>
        {t("whatsNew.gotIt")}
      </Button>
    </Box>
  );
}
