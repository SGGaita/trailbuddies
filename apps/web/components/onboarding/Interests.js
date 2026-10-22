"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getUnit, getReadyUnits } from "@trailbuddies/content";
import { SHORTCUTS, ageFrom, isAdult } from "@trailbuddies/domain";
import { useFamily } from "@/lib/store";
import { useSetupGuard } from "@/lib/guard";
import Loading from "@/components/Loading";
import LearnerAvatar from "@/components/LearnerAvatar";
import OnboardingShell from "./OnboardingShell";

const EMOJI = { numbers: "🔢", language: "🔤", animals: "🦁", colours: "🎨", shapes: "🔺" };
const TOPICS = [
  { id: "space", label: "Space", emoji: "🚀" },
  { id: "vehicles", label: "Vehicles", emoji: "🚗" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "food", label: "Food", emoji: "🍲" },
  { id: "nature", label: "Nature", emoji: "🌳" },
];
// Subjects with content get a placement check.
const CHECKABLE = getSubjects().filter((s) => getReadyUnits(s.id).length > 1);

/** Step 5: interests (order the map), "can already" shortcuts and the quick placement check. */
export default function Interests() {
  const ok = useSetupGuard({ allow: "/start/interests" });
  const router = useRouter();
  const learners = useFamily((s) => s.learners);
  const updateLearner = useFamily((s) => s.updateLearner);
  if (!ok) return <Loading />;

  const options = [
    ...getSubjects().map((s) => ({ id: s.id, label: s.name, emoji: EMOJI[s.id] || "⭐" })),
    ...TOPICS,
  ];
  const toggle = (l, id) => {
    const has = (l.interests || []).includes(id);
    updateLearner(l.id, {
      interests: has ? l.interests.filter((x) => x !== id) : [...(l.interests || []), id],
    });
  };
  const shortcut = (l, sc) => {
    const on = l.placement?.[sc.subject] === sc.start;
    const placement = { ...(l.placement || {}) };
    if (on) delete placement[sc.subject];
    else placement[sc.subject] = sc.start;
    updateLearner(l.id, { placement });
  };

  return (
    <OnboardingShell
      step={5}
      title={t("start.interestsTitle")}
      sub={t("start.interestsSub")}
      back="/start/learners"
      wide
    >
      {learners.map((l) => {
        const adult = isAdult(ageFrom(l.birth));
        return (
          <Box
            key={l.id}
            component="section"
            aria-label={l.name}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              p: 2,
              border: `2px solid ${colors.line}`,
              borderRadius: 4.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <LearnerAvatar learner={l} size={40} />
              <Typography variant="h6" component="h2">
                {l.name}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {options.map((o) => {
                const on = (l.interests || []).includes(o.id);
                return (
                  <Chip
                    key={o.id}
                    label={`${o.emoji} ${o.label}`}
                    onClick={() => toggle(l, o.id)}
                    aria-pressed={on}
                    color={on ? "primary" : "default"}
                    variant={on ? "filled" : "outlined"}
                    sx={{ height: 40, fontSize: 15, borderRadius: 999, borderWidth: 2 }}
                  />
                );
              })}
            </Box>
            {!adult && (
              <>
                <Typography sx={{ fontWeight: 800, mt: 0.5 }}>
                  {t("start.canAlready", { name: l.name })}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {SHORTCUTS.map((sc) => {
                    const on = l.placement?.[sc.subject] === sc.start;
                    return (
                      <Chip
                        key={sc.id}
                        label={sc.label}
                        onClick={() => shortcut(l, sc)}
                        aria-pressed={on}
                        color={on ? "secondary" : "default"}
                        variant={on ? "filled" : "outlined"}
                        sx={{ height: 40, fontSize: 15, borderRadius: 999, borderWidth: 2 }}
                      />
                    );
                  })}
                </Box>
              </>
            )}
            {CHECKABLE.map((s) => {
              const start = l.placement?.[s.id];
              return (
                <Box
                  key={s.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1.5,
                    bgcolor: colors.sand,
                    borderRadius: 4,
                    p: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      {t("start.checkTitle")}: {s.name}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                      {start
                        ? t("start.checkDone", { unit: getUnit(start)?.title || start })
                        : t("start.checkSub", { name: l.name })}
                    </Typography>
                  </Box>
                  <Button
                    component={Link}
                    href={`/start/check?learner=${l.id}&subject=${s.id}`}
                    variant="outlined"
                    sx={{ borderWidth: 2 }}
                  >
                    {t("start.checkStart")}
                  </Button>
                </Box>
              );
            })}
          </Box>
        );
      })}
      <Box sx={{ display: "flex", gap: 1.5, justifyContent: "space-between" }}>
        <Button onClick={() => router.push("/start/settings")}>{t("start.skip")}</Button>
        <Button variant="contained" size="large" onClick={() => router.push("/start/settings")}>
          {t("start.continue")}
        </Button>
      </Box>
    </OnboardingShell>
  );
}
