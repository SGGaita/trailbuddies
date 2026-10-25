"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getReadyUnits, buddyLine } from "@trailbuddies/content";
import { gameTopics, lessonsFor, LESSON_GAMES } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { speak } from "@/lib/speech";
import LearnerShell from "@/components/shell/LearnerShell";
import Loading from "@/components/Loading";

const GAMES = [
  { id: "memory", emoji: "🃏", title: "games.memory", sub: "games.memorySub", color: "sky" },
  { id: "jigsaw", emoji: "🧩", title: "games.jigsaw", sub: "games.jigsawSub", color: "berry" },
];

/**
 * C19 Games corner (GAM-04): pick a game, then a topic. A topic opens after its first
 * lesson; a locked one says which lesson opens it.
 */
export default function GamesCorner() {
  const ready = useHydrated();
  const learner = useLearner();
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  const lessons = useFamily((s) => s.lessons);
  const router = useRouter();
  const [game, setGame] = useState("memory");
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  if (!ready || !learner) return <Loading />;
  const topics = gameTopics(
    getSubjects().flatMap((s) => getReadyUnits(s.id)),
    learner.progress,
  );
  const say = (text) => speak(text, { band: learner.band, buddy: learner.buddy, enabled: voice });
  // BLD-06: family lessons whose grown-up switched this game on.
  const family = lessonsFor(lessons, learner.id).filter(
    (l) => l.cards.length >= 3 && (l.options?.games ?? LESSON_GAMES).includes(game),
  );

  return (
    <LearnerShell learner={learner} title={t("games.title")} back="/play/map" active="/play/more/games" goal={goal}>
      <Box sx={{ px: { xs: 1.5, sm: 3.25 }, py: { xs: 1.5, sm: 2.25 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Box role="radiogroup" aria-label={t("games.title")} sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: { xs: 1.25, sm: 2 }, maxWidth: 720 }}>
          {GAMES.map((g) => {
            const on = game === g.id;
            return (
              <Box
                key={g.id}
                component="button"
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setGame(g.id);
                  say(t(g.sub));
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 1.75 },
                  p: { xs: 1.5, sm: 2.25 },
                  textAlign: "left",
                  borderRadius: 7,
                  border: `3px solid ${on ? colors[g.color].main : colors.line}`,
                  bgcolor: on ? colors[g.color].soft : "background.paper",
                  cursor: "pointer",
                  color: "text.primary",
                  font: "inherit",
                }}
              >
                <Box component="span" aria-hidden="true" sx={{ fontSize: { xs: 36, sm: 52 }, lineHeight: 1 }}>
                  {g.emoji}
                </Box>
                <Box component="span" sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <Box component="span" sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: { xs: 18, sm: 24 } }}>
                    {t(g.title)}
                  </Box>
                  <Box component="span" sx={{ color: "text.secondary", fontWeight: 700, fontSize: { xs: 13, sm: 16 } }}>
                    {t(g.sub)}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
        <Typography variant="h6" component="h2">
          {t("games.topic")}
        </Typography>
        <Box
          component="ul"
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
            gap: { xs: 1.25, sm: 1.75 },
          }}
        >
          {topics.map((tp) => (
            <li key={tp.unitId}>
              {tp.open ? (
                <Box
                  component={Link}
                  href={`/play/game/${game}/${tp.unitId}`}
                  aria-label={`${tp.title}${tp.finished ? `, ${t("games.finished")}` : ""}`}
                  sx={tile(true)}
                >
                  <TopicFace tp={tp} />
                </Box>
              ) : (
                <Box
                  component="button"
                  type="button"
                  aria-label={`${tp.title}, ${t("games.locked")}`}
                  onClick={() => say(buddyLine("games.locked", { topic: tp.title }, 0, learner.buddy))}
                  sx={tile(false)}
                >
                  <TopicFace tp={tp} locked />
                </Box>
              )}
            </li>
          ))}
          {family.map((l) => (
            <li key={l.id}>
              <Box
                component={Link}
                href={`/play/game/${game}/family?lesson=${encodeURIComponent(l.id)}`}
                aria-label={`${l.title}, ${t("games.fromFamily")}`}
                sx={tile(true)}
              >
                <Box component="span" aria-hidden="true" sx={{ fontSize: 34, lineHeight: 1 }}>
                  🏡
                </Box>
                <Box component="span" sx={{ fontWeight: 800, fontSize: { xs: 15, sm: 17 } }}>
                  {l.title}
                </Box>
                <Box component="span" sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>
                  {t("games.fromFamily")}
                </Box>
              </Box>
            </li>
          ))}
        </Box>
      </Box>
    </LearnerShell>
  );
}

const tile = (open) => ({
  width: "100%",
  minHeight: 120,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 0.75,
  p: 1.75,
  textAlign: "center",
  textDecoration: "none",
  color: "text.primary",
  font: "inherit",
  borderRadius: 4.5,
  border: `2px solid ${colors.line}`,
  bgcolor: open ? "background.paper" : colors.sand,
  cursor: "pointer",
  // Locked tiles look different by background and the lock, never by fading the text (ACC-07).
});

function TopicFace({ tp, locked = false }) {
  return (
    <>
      <Box component="span" aria-hidden="true" sx={{ fontSize: 34, lineHeight: 1 }}>
        {locked ? "🔒" : tp.finished ? "🏆" : "⭐"}
      </Box>
      <Box component="span" sx={{ fontWeight: 800, fontSize: { xs: 15, sm: 17 } }}>
        {tp.title}
      </Box>
      <Box component="span" sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>
        {locked ? t("games.locked") : tp.finished ? t("games.finished") : " "}
      </Box>
    </>
  );
}
