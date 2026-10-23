"use client";
import { useEffect, useEffectEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { buddyLine } from "@trailbuddies/content";
import { customId, lessonsFor } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { speak } from "@/lib/speech";
import LearnerShell from "@/components/shell/LearnerShell";
import Loading from "@/components/Loading";
import { CardPic } from "@/components/builder/parts";

const KIND = { learn: "builder.tpl.learn", sort: "builder.tpl.sort", puzzle: "builder.tpl.puzzle" };

/** C22 Family & Class Island (MAP-06): lessons grown-ups made, new ones glowing. */
export default function FamilyIsland() {
  const ready = useHydrated();
  const learner = useLearner();
  const lessons = useFamily((s) => s.lessons);
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  const router = useRouter();
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  const hello = useEffectEvent(() =>
    speak(buddyLine("island.hello", {}, 0, learner.buddy), {
      band: learner.band,
      buddy: learner.buddy,
      enabled: voice,
    }),
  );
  const learnerId = learner?.id;
  useEffect(() => {
    if (ready && learnerId) hello();
  }, [ready, learnerId]);
  if (!ready || !learner) return <Loading />;
  const mine = lessonsFor(lessons, learner.id);

  return (
    <LearnerShell learner={learner} title={t("map.familyIsland")} back="/play/map" goal={goal}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: { xs: 1.75, sm: 2.75 },
          px: { xs: 1.5, sm: 3.5 },
          py: { xs: 1.5, sm: 2.5 },
          alignItems: "start",
        }}
      >
        <Section title={t("island.family")}>
          {mine.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("island.none")}</Typography>}
          {mine.map((l) => {
            const stars = learner.progress[customId(l.id)] || 0;
            return (
              <Box
                key={l.id}
                component={Link}
                href={`/play/custom?id=${l.id}`}
                className={stars ? undefined : "glow"}
                data-new={stars ? "no" : "yes"}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 2 },
                  p: { xs: 1.25, sm: 1.75 },
                  borderRadius: 5.5,
                  border: `3px solid ${stars ? colors.line : colors.coral.main}`,
                  bgcolor: "background.paper",
                  textDecoration: "none",
                  color: "text.primary",
                }}
              >
                <CardPic card={l.cards[0]} size={84} radius={4.5} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
                  <Typography
                    sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: { xs: 20, sm: 24 } }}
                  >
                    {l.title}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                    {l.by ? `${t("builder.by", { name: l.by })} · ` : ""}
                    {t("builder.cardsN", { n: l.cards.length })} · {t(KIND[l.template])}
                  </Typography>
                  {stars ? (
                    <Box
                      aria-label={t("done.stars", { stars })}
                      sx={{ color: colors.sun.main, fontSize: 20 }}
                    >
                      {"★".repeat(stars)}
                    </Box>
                  ) : (
                    <Box
                      component="span"
                      sx={{
                        alignSelf: "flex-start",
                        px: 1.25,
                        borderRadius: 999,
                        bgcolor: colors.coral.soft,
                        color: colors.coral.deep,
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {t("island.new")}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Section>
        <Section title={t("island.teacher")}>
          <Typography sx={{ color: "text.secondary" }}>{t("island.noClass")}</Typography>
        </Section>
      </Box>
    </LearnerShell>
  );
}

function Section({ title, children }) {
  return (
    <Box
      component="section"
      aria-label={title}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: { xs: 1.75, sm: 2.25 },
        borderRadius: 6.5,
        border: `2px solid ${colors.line}`,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h5" component="h2" sx={{ fontSize: { xs: 22, sm: 26 } }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
