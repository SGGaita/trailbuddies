"use client";
import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import SubjectArt, { SUBJECT_ART } from "@/components/art/SubjectArt";
import Icon from "@/components/Icon";
import Bubble from "@/components/Bubble";
import SpeakButton from "@/components/SpeakButton";
import Loading from "@/components/Loading";
import RestScreen, { useRest } from "@/components/RestScreen";
import { useTapToHear, isNonReader } from "@/lib/nonReader";
import { speak } from "@/lib/speech";
import { readMemory, writeMemory } from "@/lib/memory";
import { SavingGoal } from "@/components/screens/Shop";
import { OUTFITS } from "@/lib/art";
import { useTeacherWork } from "@/lib/classWork";

const COMING = ["Time Tower", "Space Station", "Weather Valley"];
// Stops use the same 100 × 100 coordinates as the path, starting by the buddy dock.
const MAP_STOPS = [
  ["numbers", 21, 68],
  ["language", 50, 76],
  ["family", 77, 66],
  ["animals", 79, 30],
  ["colours", 48, 23],
  ["shapes", 17, 28],
];
const MAP_PATH =
  "M 1 98 C 10 98 12 68 21 68 S 38 80 50 76 S 66 64 77 66 S 93 42 79 30 S 62 38 48 23 S 26 24 17 28";
const VALLEY = "/art/world-valley.webp";

const PLACE_SX = {
  position: "absolute",
  transform: "translate(-50%, -72%)",
  width: "clamp(116px, 24%, 254px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 0.5,
  textDecoration: "none",
  color: colors.ink,
  minWidth: 0,
  borderRadius: 3,
  "&:focus-visible": { outline: `3px solid ${colors.leaf.deep}`, outlineOffset: 4 },
  "&:hover .map-stop-label": { borderColor: colors.leaf.main },
};

function MapPath() {
  return (
    <Box
      component="svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <path d={MAP_PATH} fill="none" stroke="#a6804277" strokeWidth="17" vectorEffect="non-scaling-stroke" />
      <path d={MAP_PATH} fill="none" stroke="#f9e6b8" strokeWidth="15" vectorEffect="non-scaling-stroke" />
      <path
        d={MAP_PATH}
        fill="none"
        stroke="#9a733c"
        strokeWidth="1.7"
        strokeDasharray="2 7"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </Box>
  );
}

function MapStop({ x, y, id, title, subtitle, href, onClick, children }) {
  return (
    <Box component={Link} href={href} onClick={onClick} sx={{ ...PLACE_SX, left: `${x}%`, top: `${y}%` }}>
      <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 0.5 }}>{children}</Box>
      <SubjectArt
        id={id}
        small
        width="min(100%, clamp(108px, 18vw, 246px))"
        height={{ sm: "clamp(78px, 11vw, 160px)" }}
        sx={{ filter: "drop-shadow(0 4px 4px #4d47194d)" }}
      />
      <Box
        className="map-stop-label"
        sx={{
          bgcolor: "#fffbee",
          border: "1px solid #dbc99d",
          borderRadius: 3,
          maxWidth: "100%",
          px: 1.25,
          py: 0.65,
          textAlign: "center",
          boxShadow: "0 3px 0 #6f613221",
        }}
      >
        <Typography
          sx={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: { sm: 16, md: 20 },
            lineHeight: 1.1,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { sm: 12, md: 13 },
            color: "#5e5743",
            mt: 0.25,
            overflowWrap: "anywhere",
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

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
  const work = useTeacherWork(learner);
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

  // MAP-06b: a "From your teacher" signpost while there's work to do, the soonest due first.
  const todo = work.filter((a) => !a.status.done).length;
  const signpost = todo ? (
    <Chip
      size="small"
      label={`📌 ${todo === 1 ? t("map.fromTeacher") : t("map.fromTeacherN", { n: todo })}`}
      data-testid="teacher-signpost"
      sx={{
        bgcolor: colors.sky.soft,
        color: colors.sky.deep,
        fontWeight: 800,
        border: `2px solid ${colors.sky.main}`,
      }}
    />
  ) : null;

  const sub = (s) =>
    s.p.done
      ? t("map.progress", { done: s.p.done, total: s.p.total, next: s.next?.title || "" })
      : t("map.notStarted");

  const changeBuddy = (
    <Button
      component={Link}
      href="/play/buddies"
      aria-label={t("buddies.change")}
      variant="outlined"
      sx={{ borderWidth: 2, flexShrink: 0, minWidth: 42, px: { xs: 0.75, sm: 1.5 }, whiteSpace: "nowrap" }}
    >
      <Box component="span" aria-hidden="true" sx={{ display: { xs: "flex", sm: "none" } }}>
        <Icon name="users" size={22} />
      </Box>
      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
        {t("buddies.change")}
      </Box>
    </Button>
  );

  return (
    <LearnerShell learner={learner} active="/play/map" goal={goal} headerAction={changeBuddy}>
      <Box
        sx={{
          position: "relative",
          isolation: "isolate",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          bgcolor: "#e5e8b5",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            background: "linear-gradient(180deg, #fff8df40, #fffae312)",
          },
        }}
      >
        <Box
          component="img"
          src={VALLEY}
          alt=""
          fetchPriority="high"
          draggable={false}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: -2,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center bottom",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            display: { xs: "none", sm: "block" },
            flex: 1,
            position: "relative",
            minHeight: { sm: 585, lg: 620 },
            isolation: "isolate",
          }}
        >
          <MapPath />
          {MAP_STOPS.map(([id, x, y]) => {
            if (id === "family") {
              return (
                <MapStop
                  key={id}
                  id={id}
                  x={x}
                  y={y}
                  title={t("map.familyIsland")}
                  subtitle={t("map.familyIslandSub")}
                  href="/play/more/island"
                  onClick={hear("island", t("map.familyIsland"))}
                >
                  {signpost}
                  {newChip}
                </MapStop>
              );
            }
            const subject = subjects.find((place) => place.id === id);
            if (!subject) return null;
            return (
              <MapStop
                key={id}
                id={id}
                x={x}
                y={y}
                title={subject.place}
                subtitle={sub(subject)}
                href={`/play/trail/${id}`}
                onClick={hear(id, subject.place)}
              >
                {first && id === "numbers" ? (
                  <Chip size="small" label="Start here!" color="primary" />
                ) : (learner.interests || []).includes(id) ? (
                  <Chip size="small" label="Favourite" color="secondary" />
                ) : null}
              </MapStop>
            );
          })}
          <Box
            sx={{
              position: "absolute",
              left: { sm: 8, md: 18 },
              bottom: 10,
              display: "flex",
              alignItems: "center",
              gap: { sm: 0.5, md: 1 },
              maxWidth: { sm: "54%", md: "58%" },
              "& > svg": { width: { sm: 76, md: 112 }, height: "auto" },
            }}
          >
            <Buddy
              id={learner.buddy}
              outfit={learner.outfit}
              size={112}
              mood={first ? "point" : greet?.firstToday ? "wave" : "happy"}
            />
            <Bubble small sx={{ maxWidth: 360, minWidth: 0 }}>
              {greeting}
            </Bubble>
            <SpeakButton text={greeting} size={44} />
          </Box>
          <Box
            sx={{
              position: "absolute",
              right: 12,
              bottom: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 0.6,
              p: 1,
              maxWidth: "46%",
              bgcolor: "#fffbee",
              border: "1px solid #dbc99d",
              borderRadius: 3,
              boxShadow: "0 3px 0 #6f613221",
            }}
          >
            <SavingCard learner={learner} />
            <Typography sx={{ fontWeight: 800, color: colors.muted, fontSize: 14 }}>
              {t("map.comingSoon")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 0.7 }}>
              {COMING.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  variant="outlined"
                  size="small"
                  sx={{ borderStyle: "dashed", bgcolor: "#fffaf0" }}
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
              {SUBJECT_ART[s.id] ? (
                <SubjectArt id={s.id} small width={110} height={72} />
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
            <SubjectArt id="family" small width={110} height={72} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>
                {t("map.familyIsland")}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                {t("map.familyIslandSub")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
              {signpost}
              {newChip}
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>{t("map.comingSoon")}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {COMING.map((c) => (
              <Chip key={c} label={c} variant="outlined" sx={{ borderStyle: "dashed" }} />
            ))}
          </Box>
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
