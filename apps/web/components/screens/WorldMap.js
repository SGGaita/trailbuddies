"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects } from "@trailbuddies/content";
import { subjectProgress, currentUnit } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { trailUnits } from "@/lib/trail";
import LearnerShell from "@/components/shell/LearnerShell";
import Buddy from "@/components/art/Buddy";
import Island from "@/components/art/Island";
import Bubble from "@/components/Bubble";
import SpeakButton from "@/components/SpeakButton";
import Loading from "@/components/Loading";

const COMING = ["Time Tower", "Space Station", "Weather Valley"];
// Island positions on the tablet/web map, as % of the map area: [left, top].
const SPOTS = { numbers: [4, 4], language: [36, 4], colours: [68, 4], animals: [4, 50], shapes: [36, 50] };

function subjectsWithProgress(progress) {
  return getSubjects().map((s) => {
    const units = trailUnits(s.id);
    const p = subjectProgress(units, progress);
    return { ...s, p, next: currentUnit(units, progress) };
  });
}

/** C04 World map: islands on tablet and web, a card list on phone. */
export default function WorldMap() {
  const ready = useHydrated();
  const learner = useFamily((s) => s.learners.find((l) => l.id === s.activeId));
  const goal = useFamily((s) => s.settings.goal);
  const router = useRouter();
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  const subjects = subjectsWithProgress(learner?.progress || {});
  if (!ready || !learner) return <Loading />;

  const first = Object.keys(learner.progress).length === 0;
  const greeting = first
    ? `Hi ${learner.name}! Let's start with Numbers!`
    : `Hi ${learner.name}! Shall we count some more?`;
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
        {subjects.map((s) => {
          const [left, top] = SPOTS[s.id];
          return (
            <Box
              key={s.id}
              component={Link}
              href={`/play/trail/${s.id}`}
              sx={{
                position: "absolute",
                left: `${left}%`,
                top: `${top}%`,
                width: "28%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                textDecoration: "none",
                color: "text.primary",
                opacity: first && s.id !== "numbers" ? 0.55 : 1,
              }}
            >
              <Box sx={{ height: 22 }}>
                {first && s.id === "numbers" ? (
                  <Chip size="small" label="Start here!" color="primary" />
                ) : (learner.interests || []).includes(s.id) ? (
                  <Chip size="small" label="Favourite" color="secondary" />
                ) : null}
              </Box>
              <Island kind={s.island} width="min(180px, 100%)" height={120} />
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
          sx={{
            position: "absolute",
            left: "68%",
            top: "50%",
            width: "28%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            textDecoration: "none",
            color: "text.primary",
          }}
        >
          <Box sx={{ height: 22 }} />
          <Island kind="family" width="min(180px, 100%)" height={120} />
          <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19 }}>
            {t("map.familyIsland")}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.secondary" }}>
            {t("map.familyIslandSub")}
          </Typography>
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
          <Buddy id={learner.buddy} outfit={learner.outfit} size={112} />
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
          <Buddy id={learner.buddy} outfit={learner.outfit} size={72} />
          <Bubble small sx={{ mb: 2.5 }}>
            {greeting}
          </Bubble>
        </Box>
        {subjects.map((s) => (
          <Box
            key={s.id}
            component={Link}
            href={`/play/trail/${s.id}`}
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
            <Island kind={s.island} width={88} height={62} />
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
          <Box>
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20 }}>
              {t("map.familyIsland")}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{t("map.familyIslandSub")}</Typography>
          </Box>
        </Box>
        <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>{t("map.comingSoon")}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {COMING.map((c) => (
            <Chip key={c} label={c} variant="outlined" sx={{ borderStyle: "dashed" }} />
          ))}
        </Box>
      </Box>
    </LearnerShell>
  );
}
