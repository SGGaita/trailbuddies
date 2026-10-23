"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getReadyUnits, builtInBadges } from "@trailbuddies/content";
import { subjectProgress, hardItems, tipFor, recentLessons, isCustomId } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearners } from "@/lib/store";
import { trailUnits } from "@/lib/trail";
import FamilyShell from "@/components/shell/FamilyShell";
import LearnerAvatar from "@/components/LearnerAvatar";
import BadgeArt from "@/components/rewards/BadgeArt";
import Loading from "@/components/Loading";
import { ItemFace } from "@/components/MediaImage";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Items and lesson titles from the content units and the family's own lessons. */
function lookups(lessons) {
  const items = new Map();
  const titles = new Map();
  getSubjects().forEach((s) =>
    getReadyUnits(s.id).forEach((u) => {
      u.items.forEach((i) => items.set(i.id, i));
      u.lessons.forEach((l) => titles.set(l.id, l.title));
      titles.set(`${u.id}-trophy`, `${u.title} trophy`);
    }),
  );
  lessons.forEach((l) => {
    l.cards.forEach((c) => items.set(c.id, { ...c, emoji: c.emoji || (c.photo ? "" : "⭐") }));
    titles.set(`custom-${l.id}`, l.title);
  });
  return { items, titles };
}

/** P09 Child progress (PAR-02): plain words, never compared with other children. */
export default function ChildProgress() {
  const ready = useHydrated();
  const learners = useLearners();
  const lessons = useFamily((s) => s.lessons);
  const family = useFamily((s) => s.family);
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(/** @type {string | null} */ (null));
  if (!ready) return <Loading />;
  const l = learners.find((x) => x.id === params.get("learner")) || learners[0];
  if (!l) return <Loading />;
  const { items, titles } = lookups(lessons);
  const hard = hardItems(l.mastery).filter((h) => items.has(h.itemId));
  const recent = recentLessons(l.results, 10);
  const max = Math.max(30, ...l.week);
  const today = new Date().getDay();
  const badges = l.badges.map((id) => builtInBadges.find((b) => b.id === id)).filter(Boolean);
  const titleOf = (r) =>
    titles.get(r.lessonId) ||
    (r.kind === "review" ? t("progress.practice") : isCustomId(r.lessonId) ? "" : r.lessonId);

  return (
    <FamilyShell title={t("progress.title")} family={family} active="/family/progress" wide>
      <Box role="group" aria-label="Learners" sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {learners.map((k) => (
          <Chip
            key={k.id}
            component={Link}
            href={`/family/progress?learner=${k.id}`}
            clickable
            avatar={<LearnerAvatar learner={k} size={28} />}
            label={k.name}
            color={k.id === l.id ? "primary" : "default"}
            variant={k.id === l.id ? "filled" : "outlined"}
            aria-current={k.id === l.id ? "page" : undefined}
            sx={{ fontWeight: 800, height: 40 }}
          />
        ))}
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 1.75,
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          alignItems: "start",
        }}
      >
        <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 800 }}>{t("progress.minutes")}</Typography>
            <Typography sx={{ color: "text.secondary" }}>{l.week.reduce((a, b) => a + b, 0)} min</Typography>
          </Box>
          <Box
            role="img"
            aria-label={`Minutes: ${l.week.join(", ")}`}
            sx={{ display: "flex", alignItems: "flex-end", gap: 1, height: 120 }}
          >
            {l.week.map((m, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.5,
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 34,
                    height: `${Math.max(4, (m / max) * 90)}%`,
                    borderRadius: "6px 6px 2px 2px",
                    bgcolor: i === 6 ? colors.sun.main : colors.leaf.main,
                  }}
                />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary" }}>
                  {DAYS[(today + i + 1) % 7]}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>

        <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography sx={{ fontWeight: 800 }}>{t("progress.subjects")}</Typography>
          {getSubjects().map((s) => {
            const p = subjectProgress(trailUnits(s.id), l.progress);
            return (
              <Box key={s.id}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography>{s.place || s.name}</Typography>
                  <Typography sx={{ color: "text.secondary" }}>
                    {p.done} / {p.total}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={p.pct * 100}
                  aria-label={`${s.name}: ${p.done} of ${p.total}`}
                  sx={{ height: 10, borderRadius: 5, bgcolor: colors.sand }}
                />
              </Box>
            );
          })}
        </Card>

        <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography sx={{ fontWeight: 800 }}>{t("progress.hard")}</Typography>
          {hard.length === 0 && (
            <Typography sx={{ color: "text.secondary" }}>{t("progress.hardNone")}</Typography>
          )}
          {hard.map((h) => {
            const it = items.get(h.itemId);
            const expanded = open === h.itemId;
            return (
              <Box key={h.itemId} sx={{ borderTop: `1px solid ${colors.line}`, pt: 1 }}>
                <Box
                  component="button"
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${it.label}, ${h.pct}%`}
                  onClick={() => setOpen(expanded ? null : h.itemId)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    width: "100%",
                    border: 0,
                    bgcolor: "transparent",
                    p: 0,
                    cursor: "pointer",
                    font: "inherit",
                    color: "text.primary",
                    textAlign: "left",
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 3,
                      bgcolor: colors.sand,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 24,
                      flex: "none",
                    }}
                  >
                    {typeof it.number === "number" ? it.label : <ItemFace it={it} />}
                  </Box>
                  <Typography sx={{ fontWeight: 800, flex: 1 }}>{it.label}</Typography>
                  <Typography sx={{ color: "text.secondary" }}>{h.pct}%</Typography>
                </Box>
                {expanded && (
                  <Box sx={{ pl: 6.5, pt: 0.75 }}>
                    <Typography>{t("progress.hardDetail", h)}</Typography>
                    <Typography sx={{ color: colors.leaf.deep, fontWeight: 700 }}>
                      {t(`progress.tip.${tipFor(h)}`)}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Card>

        <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Typography sx={{ fontWeight: 800 }}>{t("progress.recent")}</Typography>
          {recent.length === 0 && (
            <Typography sx={{ color: "text.secondary" }}>{t("progress.recentNone")}</Typography>
          )}
          <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none" }}>
            {recent.map((r, i) => (
              <Box
                component="li"
                key={`${r.lessonId}-${r.at}-${i}`}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                  py: 0.75,
                  borderTop: i ? `1px solid ${colors.line}` : 0,
                }}
              >
                <Typography noWrap sx={{ minWidth: 0 }}>
                  {titleOf(r)}
                </Typography>
                <Box sx={{ display: "flex", gap: 1.25, flex: "none", alignItems: "center" }}>
                  <Box
                    aria-label={t("done.stars", { stars: r.stars })}
                    sx={{ color: colors.sun.main, letterSpacing: 1 }}
                  >
                    {"★".repeat(r.stars)}
                    <Box component="span" sx={{ color: colors.line }}>
                      {"★".repeat(Math.max(0, 3 - r.stars))}
                    </Box>
                  </Box>
                  <Typography
                    sx={{ color: "text.secondary", fontSize: 13, minWidth: 48, textAlign: "right" }}
                  >
                    {new Date(r.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Card>

        <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 800 }}>{t("progress.badges")}</Typography>
            <Typography sx={{ color: "text.secondary" }}>{badges.length}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {badges.length ? (
              badges.map((b) => (
                <Box key={b.id} title={b.name} role="img" aria-label={b.name}>
                  <BadgeArt badge={b} size={52} />
                </Box>
              ))
            ) : (
              <Typography sx={{ color: "text.secondary" }}>{t("progress.badgesNone")}</Typography>
            )}
          </Box>
        </Card>
      </Box>
      <Button
        variant="outlined"
        sx={{ alignSelf: "flex-start", borderWidth: 2 }}
        onClick={() => {
          useFamily.getState().setActive(l.id);
          router.push("/play/map");
        }}
      >
        {t("progress.openAs", { name: l.name })}
      </Button>
    </FamilyShell>
  );
}
