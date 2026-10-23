"use client";
import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getUnit, buddyLine } from "@trailbuddies/content";
import {
  subjectProgress,
  currentUnit,
  orderSubjects,
  layoutTrail,
  greetingFor,
  customId,
  lessonsFor,
  dayKey,
} from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { trailUnits } from "@/lib/trail";
import LearnerShell from "@/components/shell/LearnerShell";
import Buddy from "@/components/art/Buddy";
import Island from "@/components/art/Island";
import NumberMountain from "@/components/art/NumberMountain";
import Bubble from "@/components/Bubble";
import SpeakButton from "@/components/SpeakButton";
import Loading from "@/components/Loading";
import RestScreen, { useRest } from "@/components/RestScreen";
import { useTapToHear, isNonReader } from "@/lib/nonReader";
import { speak } from "@/lib/speech";
import { readMemory, writeMemory } from "@/lib/memory";
import { SavingGoal } from "@/components/screens/Shop";
import { OUTFITS } from "@/lib/art";

const COMING = ["Time Tower", "Space Station", "Weather Valley"];
// Tablet/web map: a compact 3 x 2 grid anchored top-left, like the prototype (fixed 305px pitch),
// so islands stay together on wide screens instead of spreading across the window.
const PLACE_SX = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 0.5,
  textDecoration: "none",
  color: "text.primary",
  minWidth: 0,
};

function subjectsWithProgress(progress, placement = {}, interests = []) {
  return orderSubjects(getSubjects(), interests).map((s) => {
    const units = trailUnits(s.id);
    const p = subjectProgress(units, progress);
    return { ...s, p, next: currentUnit(units, progress, placement[s.id]) };
  });
}

/**
 * The greeting's event and values: the last lesson played and what's next on its trail.
 * @param {any} learner learnerView
 * @param {string | null} greetedOn
 */
function greetingOf(learner, greetedOn) {
  const last = [...learner.results].reverse().find((r) => r.kind !== "review");
  let lastTitle = null;
  let nextTitle = null;
  if (last) {
    const unit = getUnit(last.unitId);
    lastTitle =
      last.kind === "trophy"
        ? `the ${unit?.title || ""} trophy`
        : unit?.lessons.find((l) => l.id === last.lessonId)?.title || null;
    const { next } = layoutTrail(trailUnits(last.subjectId), learner.progress, {
      start: learner.placement?.[last.subjectId],
    });
    if (next)
      nextTitle =
        next.kind === "trophy" ? "the trophy" : getUnit(next.unitId)?.lessons[next.n - 1]?.title || null;
  }
  return greetingFor({ name: learner.name, lastTitle, nextTitle, greetedOn });
}

/** C04 World map: islands on tablet and web, a card list on phone. */
export default function WorldMap() {
  const ready = useHydrated();
  const learner = useLearner();
  const goal = useFamily((s) => s.settings.goal);
  const router = useRouter();
  const noBuddy = ready && learner && !learner.buddy;
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
    else if (noBuddy) router.replace("/play/buddies"); // new learners meet the buddies first
  }, [ready, learner, noBuddy, router]);
  const voice = useFamily((s) => s.settings.voice);
  const lessons = useFamily((s) => s.lessons);
  const [memory] = useState(() => (typeof window === "undefined" ? null : readMemory()));
  const subjects = subjectsWithProgress(learner?.progress || {}, learner?.placement, learner?.interests);
  const rest = useRest(learner);
  const first = !!learner && Object.keys(learner.progress).length === 0;
  const greet = learner ? greetingOf(learner, memory?.greeted[learner.id] ?? null) : null;
  const greeting = greet ? buddyLine(greet.event, greet.vars, 0, learner.buddy) : "";
  // BUD-03: the first visit of the day is spoken for everyone; after that, for non-readers.
  const sayGreeting = useEffectEvent(() => {
    if (greet.firstToday || isNonReader(learner.band))
      speak(greeting, { band: learner.band, buddy: learner.buddy, enabled: voice });
    writeMemory((m) => {
      m.greeted[learner.id] = dayKey();
    });
  });
  const learnerId = learner?.id;
  useEffect(() => {
    if (ready && learnerId && !rest && !noBuddy) sayGreeting();
  }, [ready, learnerId, rest, noBuddy]);
  // OFF-03: a purchase made offline that the wallet couldn't cover was handed back. Say so
  // gently, once per device.
  const [dismissed, setDismissed] = useState(false);
  const returned =
    learner && memory && !dismissed
      ? (learner.reversed || []).filter((r) => !(memory.returned[learner.id] || []).includes(r.id))
      : [];
  const dismissReturned = () => {
    writeMemory((m) => {
      m.returned[learner.id] = [...(m.returned[learner.id] || []), ...returned.map((r) => r.id)];
    });
    setDismissed(true);
  };
  const hear = useTapToHear(learner?.band);
  if (!ready || !learner || noBuddy) return <Loading />;
  if (rest) return <RestScreen reason={rest} learner={learner} />;

  // MAP-06: a glowing marker on Family Island while a grown-up's lesson hasn't been played.
  const fresh = lessonsFor(lessons, learner.id).filter((l) => !learner.progress[customId(l.id)]).length;
  const newChip = fresh ? (
    <Chip
      size="small"
      className="glow"
      color="secondary"
      label={t("island.newCount", { n: fresh })}
      data-testid="island-new"
    />
  ) : null;

  const sub = (s) =>
    s.p.done
      ? t("map.progress", { done: s.p.done, total: s.p.total, next: s.next?.title || "" })
      : t("map.notStarted");

  return (
    <LearnerShell learner={learner} active="/play/map" goal={goal}>
      {/* tablet + web: the map */}
      <Box
        sx={{
          display: { xs: "none", sm: "block" },
          flex: 1,
          position: "relative",
          minHeight: 560,
          overflow: "hidden",
          background: `radial-gradient(circle at 20% 30%, #fdf3d3 0 18%, transparent 19%), radial-gradient(circle at 80% 70%, #f6e7bd 0 16%, transparent 17%), ${colors.sand}`,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 260px))",
            columnGap: { sm: 2, md: 5.5 },
            rowGap: 2.5,
            px: { sm: 2, md: 5 },
            pt: 2.25,
            pb: 22,
          }}
        >
          {subjects.map((s) => {
            return (
              <Box
                key={s.id}
                component={Link}
                href={`/play/trail/${s.id}`}
                onClick={hear(s.id, s.place)}
                sx={{ ...PLACE_SX, opacity: first && s.id !== "numbers" ? 0.55 : 1 }}
              >
                <Box sx={{ height: 22 }}>
                  {first && s.id === "numbers" ? (
                    <Chip size="small" label="Start here!" color="primary" />
                  ) : (learner.interests || []).includes(s.id) ? (
                    <Chip size="small" label="Favourite" color="secondary" />
                  ) : null}
                </Box>
                {s.id === "numbers" ? (
                  <NumberMountain small width="min(240px, 100%)" />
                ) : (
                  <Island kind={s.island} width="min(180px, 100%)" height={120} />
                )}
                <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>
                  {s.place}
                </Typography>
                <Typography
                  sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary", textAlign: "center" }}
                >
                  {sub(s)}
                </Typography>
              </Box>
            );
          })}
          <Box
            component={Link}
            href="/play/more/island"
            onClick={hear("island", t("map.familyIsland"))}
            sx={PLACE_SX}
          >
            <Box sx={{ height: 22 }}>{newChip}</Box>
            <Island kind="family" width="min(180px, 100%)" height={120} />
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>
              {t("map.familyIsland")}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>
              {t("map.familyIslandSub")}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            position: "absolute",
            left: 18,
            bottom: 12,
            display: "flex",
            alignItems: "flex-end",
            gap: 1.5,
          }}
        >
          <Buddy
            id={learner.buddy}
            outfit={learner.outfit}
            size={112}
            mood={first ? "point" : greet?.firstToday ? "wave" : "happy"}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 5 }}>
            <Bubble small sx={{ maxWidth: 360 }}>
              {greeting}
            </Bubble>
            <SpeakButton text={greeting} size={48} />
          </Box>
        </Box>
        <Box
          sx={{
            position: "absolute",
            right: 16,
            bottom: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 0.75,
          }}
        >
          <SavingCard learner={learner} />
          <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>{t("map.comingSoon")}</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {COMING.map((c) => (
              <Chip
                key={c}
                label={c}
                variant="outlined"
                sx={{ borderStyle: "dashed", bgcolor: "rgba(255,255,255,.6)" }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* phone: island list */}
      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          flexDirection: "column",
          gap: 1.5,
          p: 1.75,
          bgcolor: colors.sand,
          flex: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
          <Buddy
            id={learner.buddy}
            outfit={learner.outfit}
            size={72}
            mood={first ? "point" : greet?.firstToday ? "wave" : "happy"}
          />
          <Bubble small sx={{ mb: 2.5 }}>
            {greeting}
          </Bubble>
        </Box>
        <SavingCard learner={learner} />
        {subjects.map((s) => (
          <Box
            key={s.id}
            component={Link}
            href={`/play/trail/${s.id}`}
            onClick={hear(s.id, s.place)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              border: `3px solid ${first && s.id === "numbers" ? colors.leaf.main : colors.line}`,
              bgcolor: "background.paper",
              borderRadius: 5.5,
              p: 1.25,
              textDecoration: "none",
              color: "text.primary",
              opacity: first && s.id !== "numbers" ? 0.55 : 1,
            }}
          >
            {s.id === "numbers" ? (
              <NumberMountain small width={110} />
            ) : (
              <Island kind={s.island} width={88} height={62} />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}
              >
                {s.place}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{sub(s)}</Typography>
              {s.p.total > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={s.p.pct * 100}
                  sx={{ mt: 0.75, height: 8, borderRadius: 4, bgcolor: colors.sand }}
                />
              )}
            </Box>
            {first && s.id === "numbers" ? <Chip size="small" label="Start" color="primary" /> : null}
          </Box>
        ))}
        <Box
          component={Link}
          href="/play/more/island"
          onClick={hear("island", t("map.familyIsland"))}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            border: `3px solid ${colors.line}`,
            bgcolor: "background.paper",
            borderRadius: 5.5,
            p: 1.25,
            textDecoration: "none",
            color: "text.primary",
          }}
        >
          <Island kind="family" width={88} height={62} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>
              {t("map.familyIsland")}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{t("map.familyIslandSub")}</Typography>
          </Box>
          {newChip}
        </Box>
        <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>{t("map.comingSoon")}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {COMING.map((c) => (
            <Chip key={c} label={c} variant="outlined" sx={{ borderStyle: "dashed" }} />
          ))}
        </Box>
      </Box>
      <Snackbar
        open={returned.length > 0}
        onClose={dismissReturned}
        autoHideDuration={8000}
        message={buddyLine(
          "shop.returned",
          { item: OUTFITS[returned[0]?.itemId]?.name || returned[0]?.itemId || "" },
          0,
          learner.buddy,
        )}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </LearnerShell>
  );
}

/** The saving goal from the shop, as a card that opens the shop. */
function SavingCard({ learner }) {
  const it = learner.wish;
  if (!it || learner.owned.includes(it)) return null;
  return (
    <Box
      component={Link}
      href="/play/more/shop"
      sx={{
        display: "flex",
        bgcolor: "background.paper",
        border: `2px solid ${colors.line}`,
        borderRadius: 4.5,
        px: 1.75,
        py: 1.25,
        color: "text.primary",
        textDecoration: "none",
      }}
    >
      <SavingGoal learner={learner} compact />
    </Box>
  );
}
