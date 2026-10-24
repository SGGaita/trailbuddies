"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { buddyLine, getUnit } from "@trailbuddies/content";
import { layoutTrail, breakDue, minutesSinceBreak } from "@trailbuddies/domain";
import { trailUnits, lessonHref } from "@/lib/trail";
import { speak } from "@/lib/speech";
import { playSound } from "@/lib/sounds";
import { useFamily } from "@/lib/store";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";
import { Coin } from "@/components/Coins";
import CountUp from "@/components/rewards/CountUp";
import BadgeCelebration from "@/components/rewards/BadgeCelebration";
import StretchBreak from "@/components/rewards/StretchBreak";
import { readMemory, writeMemory } from "@/lib/memory";

/** Where "Next" goes: the next stone on the trail after this result was recorded. */
function nextStop(subjectId, progress, start) {
  const { next } = layoutTrail(trailUnits(subjectId), progress, { start });
  if (!next) return null;
  if (next.kind === "trophy")
    return { href: lessonHref(next.unitId, "trophy"), label: t("done.trophyNext") };
  if (next.n === 1) {
    const title = getUnit(next.unitId)?.title || "";
    return { href: lessonHref(next.unitId, 1), label: t("done.newUnit", { title }) };
  }
  return { href: lessonHref(next.unitId, next.n), label: t("done.next") };
}

/**
 * C07 Lesson complete: stars, treasures, the daily goal and "kept going" praise.
 * @param {{ lesson: any, outcome: any, learner: any, goal: number, back: string, preview?: boolean }} props
 */
export default function LessonComplete({ lesson, outcome, learner, goal, back, preview = false }) {
  const voice = useFamily((s) => s.settings.voice);
  const breaks = useFamily((s) => s.settings.breaks);
  // BDG-03 / LES-16: new badges celebrate after the end screen has shown for a moment.
  const [celebrate, setCelebrate] = useState(false);
  const hasBadges = (outcome.badges || []).length > 0;
  // PAR-04: a stretch is due once enough play has passed since the last one (read once).
  const [stretchDue] = useState(
    () =>
      !preview &&
      breakDue({ breaks }, minutesSinceBreak(learner.todayResults || [], readMemory().breaks[learner.id] || null)),
  );
  const [stretch, setStretch] = useState(false);
  useEffect(() => {
    if (!hasBadges && !stretchDue) return undefined;
    const id = setTimeout(() => (hasBadges ? setCelebrate(true) : setStretch(true)), hasBadges ? 1800 : 2200);
    return () => clearTimeout(id);
  }, [hasBadges, stretchDue]);
  const stretchDone = () => {
    writeMemory((m) => {
      m.breaks[learner.id] = Date.now();
    });
    setStretch(false);
  };
  const trophy = lesson.kind === "trophy";
  const review = lesson.kind === "review";
  const custom = lesson.kind === "custom";
  const next = useMemo(
    () =>
      review || custom
        ? null
        : nextStop(lesson.subjectId, learner.progress, learner.placement?.[lesson.subjectId]),
    [review, custom, lesson.subjectId, learner.progress, learner.placement],
  );
  const today = learner.today;
  // From the script table, in this learner's buddy's words (BUD-08).
  const b = learner.buddy;
  const message = trophy
    ? buddyLine("lesson.trophy", { name: learner.name }, 0, b)
    : outcome.perfect && lesson.kind === "lesson"
      ? buddyLine("lesson.perfect", { name: learner.name }, outcome.firstTry, b)
      : buddyLine("lesson.done", { name: learner.name }, outcome.stars, b);
  const extras = [
    outcome.reachedGoal ? buddyLine("lesson.goal") : "",
    outcome.keptGoing ? buddyLine("lesson.kept-going") : "",
  ].filter(Boolean);

  useEffect(() => {
    playSound("done");
    speak([message, ...extras].join(" "), { band: learner.band, buddy: learner.buddy, enabled: voice });
    // Say it once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 2, sm: 2.5 },
        px: 2,
        py: 4,
        textAlign: "center",
        background: `radial-gradient(circle at 50% 30%, ${colors.sun.soft}, ${colors.cream} 60%)`,
      }}
    >
      <Buddy id={learner.buddy} outfit={learner.outfit} mood="cheer" size={140} />
      <Typography variant="h3" component="h1" sx={{ fontSize: { xs: 34, sm: 44 } }}>
        {trophy ? t("done.trophy") : review ? t("done.review") : t("done.title")}
      </Typography>
      {trophy && (
        <Box aria-hidden="true" className="starpop" sx={{ fontSize: 72, lineHeight: 1 }}>
          🏆
        </Box>
      )}
      <Box
        role="img"
        aria-label={t("done.stars", { stars: outcome.stars })}
        sx={{ display: "flex", gap: 1.5 }}
      >
        {[1, 2, 3].map((n) => (
          <Box
            key={n}
            className={n <= outcome.stars ? "starpop" : undefined}
            sx={{
              fontSize: { xs: 56, sm: 72 },
              lineHeight: 1,
              color: n <= outcome.stars ? colors.sun.main : colors.line,
              textShadow: n <= outcome.stars ? `0 4px 0 ${colors.sun.deep}` : "none",
              animationDelay: `${n * 0.25}s`,
            }}
          >
            ★
          </Box>
        ))}
      </Box>
      <Bubble sx={{ maxWidth: 520 }}>
        {message}
        {extras.map((x) => (
          <Box key={x} component="span" sx={{ display: "block", fontSize: "0.8em", mt: 1 }}>
            {x}
          </Box>
        ))}
      </Bubble>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
        {outcome.treasures > 0 && (
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800, fontSize: 20 }}
            aria-label={t("done.treasures", { n: outcome.treasures })}
          >
            <Coin kind="gem" value={<CountUp value={outcome.treasures} prefix="+" />} />
          </Box>
        )}
        {!preview && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 4,
              bgcolor: today >= goal ? colors.leaf.soft : "background.paper",
              border: `2px solid ${today >= goal ? colors.leaf.main : colors.line}`,
              fontWeight: 800,
            }}
          >
            {today >= goal ? "✓ " : ""}
            {outcome.reachedGoal
              ? t("done.goalReached")
              : t("done.goal", { done: Math.min(today, goal), goal })}
          </Box>
        )}
      </Box>
      {outcome.keptGoing && (
        <Typography sx={{ fontWeight: 800, color: colors.berry.deep }}>{t("done.keptGoing")}</Typography>
      )}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center", mt: 1 }}>
        <Button component={Link} href={back} variant="outlined" size="large" sx={{ borderWidth: 2 }}>
          {preview ? t("builder.backToBuilder") : custom ? t("done.island") : t("done.trail")}
        </Button>
        {next && (
          <Button component={Link} href={next.href} variant="contained" size="large" autoFocus>
            {next.label}
          </Button>
        )}
      </Box>
      {celebrate && (
        <BadgeCelebration
          badges={outcome.badges}
          learner={learner}
          voice={voice}
          onDone={() => {
            setCelebrate(false);
            if (stretchDue) setStretch(true);
          }}
        />
      )}
      {stretch && <StretchBreak learner={learner} voice={voice} onDone={stretchDone} />}
    </Box>
  );
}
