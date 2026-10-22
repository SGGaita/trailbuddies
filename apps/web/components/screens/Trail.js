"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Dialog from "@mui/material/Dialog";
import Snackbar from "@mui/material/Snackbar";
import { colors, subjectFills } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubject, getUnit } from "@trailbuddies/content";
import { layoutTrail, pathData, subjectProgress, currentUnit } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { trailUnits } from "@/lib/trail";
import { speak } from "@/lib/speech";
import LearnerShell from "@/components/shell/LearnerShell";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";
import Loading from "@/components/Loading";

const W = 600; // virtual layout width; the trail scales to the screen
const ITEM_PREVIEW = 8;

/** Items shown on the start card: the lesson's focus items, or the whole unit for trophies. */
function lessonItems({ node, unit }) {
  if (node.kind !== "lesson") return unit.items.slice(0, ITEM_PREVIEW);
  const l = unit.lessons[node.n - 1];
  const ids = l?.focus?.length ? l.focus : l?.review || [];
  return unit.items.filter((i) => ids.includes(i.id));
}

const stoneSx = (node) => {
  const big = node.state === "next";
  const size = node.kind === "trophy" ? (big ? 96 : 84) : big ? 92 : 72;
  const base = {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    width: { xs: size * 0.8, sm: size },
    height: { xs: size * 0.8, sm: size },
    borderRadius: node.kind === "trophy" ? 5.5 : "50%",
    border: `4px solid ${colors.line}`,
    bgcolor: "background.paper",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: { xs: 20, sm: 24 },
    lineHeight: 1,
    color: "text.primary",
    cursor: "pointer",
    p: 0,
  };
  if (node.state === "done")
    Object.assign(base, { bgcolor: colors.leaf.soft, borderColor: colors.leaf.main });
  if (node.state === "next")
    Object.assign(base, {
      bgcolor: colors.leaf.deep,
      borderColor: colors.leaf.deep,
      color: "#fff",
      boxShadow: "0 0 0 10px rgba(47,158,91,.25)",
    });
  if (node.state === "locked") Object.assign(base, { opacity: 0.5 });
  if (node.state === "planned") Object.assign(base, { opacity: 0.4, borderStyle: "dashed" });
  return base;
};

/** C05 Subject trail. Units are stages, lessons are stones, each unit ends with a trophy. */
export default function Trail({ subjectId }) {
  const ready = useHydrated();
  const learner = useLearner();
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  const router = useRouter();
  const nextRef = useRef(null);
  const [lesson, setLesson] = useState(null);
  const [toast, setToast] = useState("");

  const subject = getSubject(subjectId);
  const units = useMemo(() => trailUnits(subjectId), [subjectId]);
  const progress = learner?.progress;
  const review = !!learner && learner.reviewDue(subjectId).length > 0;
  const trail = useMemo(
    () => layoutTrail(units, progress || {}, { width: W, review }),
    [units, progress, review],
  );

  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  useEffect(() => {
    if (ready && nextRef.current) nextRef.current.scrollIntoView({ block: "center" });
  }, [ready]);

  if (!ready || !learner || !subject) return <Loading />;

  const sp = subjectProgress(units, learner.progress);
  const unit = currentUnit(units, learner.progress) || units[0];
  const content = getUnit(unit.id);

  const open = (node) => {
    if (node.state === "planned") return say(t("trail.planned"));
    if (node.state === "locked") return say(t("trail.locked"));
    const u = getUnit(node.unitId);
    const title =
      node.kind === "review"
        ? t("trail.review")
        : node.kind === "trophy"
          ? `${units.find((x) => x.id === node.unitId).title} trophy`
          : u?.lessons[node.n - 1]?.title || `Lesson ${node.n}`;
    const href =
      node.kind === "review"
        ? `/play/review/${subjectId}`
        : `/play/lesson/${node.unitId}/${node.kind === "trophy" ? "trophy" : node.n}`;
    setLesson({ node, title, unit: u, href });
    speak(title, { enabled: voice });
  };
  const say = (msg) => {
    setToast(msg);
    speak(msg, { enabled: voice });
  };
  const goNext = () => (trail.next ? open(trail.next) : say(t("trail.allDone")));

  return (
    <LearnerShell learner={learner} title={subject.place} back="/play/map" goal={goal} nav={false}>
      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            background: `linear-gradient(${subjectFills[subject.island]}, ${colors.cream})`,
            overflowY: "auto",
            px: 1,
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: W,
              mx: "auto",
              aspectRatio: `${W} / ${trail.height}`,
            }}
          >
            <svg
              viewBox={`0 0 ${W} ${trail.height}`}
              width="100%"
              height="100%"
              style={{ position: "absolute", inset: 0 }}
              aria-hidden="true"
            >
              <path
                d={pathData(trail.path)}
                fill="none"
                stroke="#fff"
                strokeWidth="26"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathData(trail.path)}
                fill="none"
                stroke={colors.leaf.main}
                strokeWidth="6"
                strokeDasharray="2 16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {trail.nodes.map((node) => {
              const pos = { left: `${(node.x / W) * 100}%`, top: `${(node.y / trail.height) * 100}%` };
              if (node.kind === "banner")
                return (
                  <Box
                    key={node.id}
                    sx={{
                      position: "absolute",
                      ...pos,
                      transform: "translate(-50%, -50%)",
                      bgcolor: "background.paper",
                      border: `3px solid ${colors.line}`,
                      borderRadius: 4,
                      px: 1.75,
                      py: 0.75,
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: { xs: 14, sm: 17 },
                      whiteSpace: "nowrap",
                      opacity: node.state === "open" ? 1 : 0.6,
                    }}
                  >
                    {node.title}
                    {node.state === "planned" ? " · soon" : node.state === "locked" ? " · locked" : ""}
                  </Box>
                );
              const label =
                node.kind === "trophy"
                  ? "Trophy"
                  : node.kind === "review"
                    ? t("trail.review")
                    : `Lesson ${node.n}`;
              return (
                <Box
                  key={node.id}
                  component="button"
                  type="button"
                  ref={node.state === "next" ? nextRef : undefined}
                  onClick={() => open(node)}
                  aria-label={`${label}${node.stars ? `, ${node.stars} stars` : ""}${node.state === "locked" ? ", locked" : node.state === "planned" ? ", coming soon" : ""}`}
                  sx={{ ...stoneSx(node), ...pos }}
                >
                  {node.kind === "trophy" ? "🏆" : node.kind === "review" ? "🔁" : node.n}
                  {node.stars ? (
                    <Box component="small" sx={{ fontSize: 11, color: colors.sun.deep }}>
                      {"★".repeat(node.stars)}
                    </Box>
                  ) : node.state === "next" ? (
                    <Box component="small" sx={{ fontSize: 11, color: colors.sun.main }}>
                      Start
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* tablet + web side panel */}
        <Box
          component="aside"
          sx={{
            display: { xs: "none", sm: "flex" },
            width: { sm: 280, lg: 310 },
            flex: "none",
            flexDirection: "column",
            gap: 1.5,
            p: 2.5,
            bgcolor: "background.paper",
            borderLeft: `2px solid ${colors.line}`,
          }}
        >
          <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>
            {t("trail.lessons", { done: sp.done, total: sp.total })}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={sp.pct * 100}
            sx={{ height: 10, borderRadius: 5, bgcolor: colors.sand }}
          />
          <Typography variant="h5" component="h2">
            {unit.title}
          </Typography>
          {content && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {content.items.slice(0, ITEM_PREVIEW).map((it) => (
                <Box
                  key={it.id}
                  title={it.say || it.label}
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 3.5,
                    bgcolor: colors.sand,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 28,
                  }}
                >
                  {it.emoji || it.label}
                </Box>
              ))}
            </Box>
          )}
          <Button variant="contained" onClick={goNext}>
            {t("trail.next")}
          </Button>
          <Button
            variant="outlined"
            sx={{ borderWidth: 2 }}
            onClick={() => say("Show what you know arrives in Sprint 6.")}
          >
            {t("trail.showWhatYouKnow")}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
            <Buddy id={learner.buddy} outfit={learner.outfit} size={80} />
            <Bubble small>Tap the big stone!</Bubble>
          </Box>
        </Box>
      </Box>

      {/* phone bottom bar */}
      <Box
        sx={{
          display: { xs: "flex", sm: "none" },
          flexDirection: "column",
          gap: 1,
          position: "sticky",
          bottom: 0,
          bgcolor: "background.paper",
          borderTop: `2px solid ${colors.line}`,
          px: 1.75,
          pt: 1.25,
          pb: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>{unit.title}</Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {sp.done} of {sp.total}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={sp.pct * 100}
          sx={{ height: 8, borderRadius: 4, bgcolor: colors.sand }}
        />
        <Button variant="contained" onClick={goNext}>
          {t("trail.next")}
        </Button>
      </Box>

      <Dialog
        open={!!lesson}
        onClose={() => setLesson(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 5.5,
              p: 2.5,
              maxWidth: 460,
              textAlign: "center",
              alignItems: "center",
              gap: 1.5,
            },
          },
        }}
      >
        {lesson && (
          <>
            <Buddy id={learner.buddy} outfit={learner.outfit} size={100} mood="cheer" />
            <Typography variant="h5" component="h2">
              {lesson.title}
            </Typography>
            {lesson.unit && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
                {lessonItems(lesson).map((it) => (
                  <Box
                    key={it.id}
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 3.5,
                      bgcolor: colors.sand,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 30,
                    }}
                  >
                    {it.emoji}
                  </Box>
                ))}
              </Box>
            )}
            <Typography sx={{ color: "text.secondary" }}>
              {lesson.node.kind === "review"
                ? t("trail.reviewSub")
                : lesson.node.kind === "trophy"
                  ? t("trail.trophySub")
                  : t("trail.level", { level: learner.levelFor(subjectId) })}
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={() => setLesson(null)}>
                {t("common.notNow")}
              </Button>
              <Button variant="contained" onClick={() => router.push(lesson.href)} autoFocus>
                {t("trail.start")}
              </Button>
            </Box>
          </>
        )}
      </Dialog>
      <Snackbar
        open={!!toast}
        autoHideDuration={2600}
        onClose={() => setToast("")}
        message={toast}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </LearnerShell>
  );
}
