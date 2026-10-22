"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { builtInBadges } from "@trailbuddies/content";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { speak } from "@/lib/speech";
import LearnerShell from "@/components/shell/LearnerShell";
import BadgeArt from "@/components/rewards/BadgeArt";
import Loading from "@/components/Loading";

const ORDER = ["learning", "mastery", "effort", "consistency", "exploration"];
const TITLES = {
  learning: "Learning",
  mastery: "Mastery",
  effort: "Effort",
  consistency: "Every day",
  exploration: "Exploring",
};

/**
 * C20 Badge book (BDG-02): every badge, earned ones in colour, the rest as silhouettes.
 * Tap any badge to hear how to earn it.
 */
export default function BadgeBook() {
  const ready = useHydrated();
  const learner = useLearner();
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  const router = useRouter();
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  if (!ready || !learner) return <Loading />;
  const earned = new Set(learner.badges);
  const hear = (b) =>
    speak(`${b.name}. ${b.how}.`, { band: learner.band, buddy: learner.buddy, enabled: voice });

  return (
    <LearnerShell learner={learner} title={t("badges.title")} back="/play/map" active="/play/more/badges" goal={goal}>
      <Box sx={{ px: { xs: 1.5, sm: 3.25 }, py: { xs: 1.5, sm: 2.25 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>
          {t("badges.earned", { n: earned.size, total: builtInBadges.length })}
        </Typography>
        {ORDER.map((cat) => (
          <Box key={cat} component="section" aria-label={TITLES[cat]}>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              {TITLES[cat]}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" },
                gap: { xs: 1.25, sm: 1.75 },
              }}
            >
              {builtInBadges
                .filter((b) => b.category === cat)
                .map((b) => {
                  const has = earned.has(b.id);
                  return (
                    <Box
                      key={b.id}
                      component="button"
                      type="button"
                      onClick={() => hear(b)}
                      aria-label={`${b.name}${has ? "" : ", not earned yet"}. ${t("badges.hear", { name: b.name })}`}
                      data-earned={has ? "yes" : "no"}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.75,
                        p: 1.75,
                        bgcolor: "background.paper",
                        border: `2px solid ${has ? colors.sun.main : colors.line}`,
                        borderRadius: 4.5,
                        cursor: "pointer",
                        color: "text.primary",
                        textAlign: "center",
                      }}
                    >
                      <BadgeArt badge={b} earned={has} size={76} />
                      <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{b.name}</Typography>
                      <Typography sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.25 }}>{b.how}</Typography>
                    </Box>
                  );
                })}
            </Box>
          </Box>
        ))}
      </Box>
    </LearnerShell>
  );
}
