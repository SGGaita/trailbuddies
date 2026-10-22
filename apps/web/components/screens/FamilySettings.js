"use client";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getReadyUnits } from "@trailbuddies/content";
import { DIFFICULTY_SETTINGS, describeLevel } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearners } from "@/lib/store";
import FamilyShell from "@/components/shell/FamilyShell";
import LearnerAvatar from "@/components/LearnerAvatar";
import Loading from "@/components/Loading";

/**
 * P11 Settings (Sprint 1 part): difficulty per learner (Auto or a fixed level 1–3) and the
 * voice. Profiles, goals, limits and the PIN arrive in Sprint 5.
 */
export default function FamilySettings() {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const voice = useFamily((s) => s.settings.voice);
  const toggleVoice = useFamily((s) => s.toggleVoice);
  const setDifficulty = useFamily((s) => s.setDifficulty);
  const learners = useLearners();
  if (!ready) return <Loading />;
  const subjects = getSubjects().filter((s) => getReadyUnits(s.id).length);

  return (
    <FamilyShell title={t("nav.settings")} family={family} active="/family/settings" back="/family">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 760 }}>
        <Card sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" component="h2">
            {t("settings.difficulty")}
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>{t("settings.difficultySub")}</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {learners.map((l) => (
              <Box
                key={l.id}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 1.5,
                  pb: 2,
                  borderBottom: `1px solid ${colors.line}`,
                  "&:last-of-type": { borderBottom: 0, pb: 0 },
                }}
              >
                <LearnerAvatar learner={l} size={44} />
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography sx={{ fontWeight: 800 }}>{l.name}</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                    {subjects
                      .map(
                        (s) =>
                          `${s.name}: ${t("settings.levelNow", { level: describeLevel(l.levelFor(s.id)) })}`,
                      )
                      .join(" · ")}
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={l.difficulty || "auto"}
                  onChange={(_, v) => v && setDifficulty(l.id, v)}
                  aria-label={`${t("settings.difficulty")} for ${l.name}`}
                >
                  {DIFFICULTY_SETTINGS.map((d) => (
                    <ToggleButton key={d} value={d} sx={{ minWidth: 52, minHeight: 44, fontWeight: 800 }}>
                      {d === "auto" ? t("settings.auto") : d}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            ))}
          </Box>
        </Card>
        <Card sx={{ p: { xs: 2, sm: 3 } }}>
          <FormControlLabel control={<Switch checked={voice} onChange={toggleVoice} />} label="Buddy voice" />
        </Card>
      </Box>
    </FamilyShell>
  );
}
