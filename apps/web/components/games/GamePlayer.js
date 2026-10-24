"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getUnit, buddySays } from "@trailbuddies/content";
import { gameTopics, customUnit, LESSON_GAMES } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { gameEvents } from "@/lib/rewards";
import { speak } from "@/lib/speech";
import { playSound } from "@/lib/sounds";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";
import Icon from "@/components/Icon";
import Loading from "@/components/Loading";
import RestScreen, { useRest } from "@/components/RestScreen";
import CountUp from "@/components/rewards/CountUp";
import BadgeCelebration from "@/components/rewards/BadgeCelebration";
import Memory from "./Memory";
import Jigsaw from "./Jigsaw";

const GAMES = { memory: Memory, jigsaw: Jigsaw };

/**
 * Runs one game with one topic's items (GAM-05: any item set works), then pays out and
 * checks badges like a lesson does.
 * @param {{ game: "memory" | "jigsaw", unitId: string }} props
 */
export default function GamePlayer({ game, unitId }) {
  const ready = useHydrated();
  const learner = useLearner();
  const router = useRouter();
  const q = useSearchParams();
  // BLD-06: a family lesson's cards can be played in the games its grown-up switched on.
  const lesson = useFamily((s) => (unitId === "family" ? s.lessons.find((l) => l.id === q.get("lesson")) : null));
  const familyOpen =
    !!lesson &&
    !!learner &&
    (lesson.assigned || []).includes(learner.id) &&
    (lesson.options?.games ?? LESSON_GAMES).includes(game) &&
    lesson.cards.length >= 3;
  const unit = unitId === "family" ? (familyOpen ? customUnit(lesson) : null) : getUnit(unitId);
  const open =
    !!learner && !!unit && (unitId === "family" ? familyOpen : gameTopics([unit], learner.progress)[0].open);
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
    else if (ready && learner && !open) router.replace("/play/more/games");
  }, [ready, learner, open, router]);
  if (!ready || !learner || !open) return <Loading />;
  return <Play key={`${game}-${unitId}`} game={game} unit={unit} learner={learner} />;
}

function Play({ game, unit, learner }) {
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  const record = useFamily((s) => s.record);
  const restNow = useRest(learner);
  const [rest] = useState(restNow);
  const [seed] = useState(() => Date.now());
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(/** @type {any} */ (null));
  const [celebrate, setCelebrate] = useState(false);
  const say = (text) => speak(text, { band: learner.band, buddy: learner.buddy, enabled: voice });

  const finish = (line) => {
    const st = useFamily.getState();
    const profile = st.learners.find((l) => l.id === learner.id);
    const r = gameEvents(learner, profile, st.events, { game, unitId: unit.id, settings: st.settings, goal });
    record(r.events);
    playSound("done");
    say(line || buddySays("game.done", { buddy: learner.buddy, vars: { name: learner.name } }));
    setResult(r);
    if (r.badges.length) setTimeout(() => setCelebrate(true), 1600);
  };

  if (rest) return <RestScreen reason={rest} learner={learner} />;
  const Game = GAMES[game];
  const title = game === "memory" ? t("games.memory") : t("games.jigsaw");

  return (
    <Box component="main" sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <Box
        component="header"
        sx={{ display: "flex", alignItems: "center", gap: 1.5, px: { xs: 1.5, sm: 3.75 }, pt: "calc(env(safe-area-inset-top, 0px) + 12px)", pb: 1.25 }}
      >
        <IconButton
          component={Link}
          href="/play/more/games"
          aria-label={t("games.backToGames")}
          sx={{ border: `2px solid ${colors.line}`, borderRadius: 4, width: 52, height: 52, bgcolor: "background.paper" }}
        >
          <Icon name="back" size={24} />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ fontSize: { xs: 22, sm: 28 } }}>
          {title} · {unit.title}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, px: { xs: 1.5, sm: 3.75 }, pb: 3 }}>
        {result ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center", mt: 2 }}>
            <Buddy id={learner.buddy} outfit={learner.outfit} mood="cheer" size={130} />
            <Typography variant="h3" component="h2" sx={{ fontSize: { xs: 32, sm: 40 } }}>
              {t("games.done")}
            </Typography>
            {result.treasures > 0 && (
              <Box sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24 }} aria-label={`+${result.treasures} treasures`}>
                💎 <CountUp value={result.treasures} prefix="+" />
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
              <Button component={Link} href="/play/more/games" variant="outlined" sx={{ borderWidth: 2 }}>
                {t("games.backToGames")}
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setResult(null);
                  setRound(round + 1);
                }}
              >
                {t("games.again")}
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, alignSelf: "stretch" }}>
              <Buddy id={learner.buddy} outfit={learner.outfit} size={72} />
              <Bubble small sx={{ flex: 1, maxWidth: 560 }}>
                {game === "memory" ? t("games.memorySub") : t("games.jigsawSub")}
              </Bubble>
            </Box>
            <Game key={round} unit={unit} learner={learner} seed={seed + round} say={say} onDone={finish} />
          </>
        )}
      </Box>
      {celebrate && result && (
        <BadgeCelebration badges={result.badges} learner={learner} voice={voice} onDone={() => setCelebrate(false)} />
      )}
    </Box>
  );
}
