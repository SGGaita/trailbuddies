"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { ageFrom, bandForAge, isAdult, totalStars } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import FamilyShell from "@/components/shell/FamilyShell";
import LearnerAvatar from "@/components/LearnerAvatar";
import Buddy from "@/components/art/Buddy";
import { Star, Gem } from "@/components/Coins";
import Icon from "@/components/Icon";
import Loading from "@/components/Loading";

const BAND = {
  seedling: "Seedling",
  sprout: "Sprout",
  explorer: "Explorer",
  voyager: "Voyager",
  trailblazer: "Trailblazer",
};
const ACTIONS = [
  { href: "/family/create", icon: "book", label: "Make a lesson" },
  { href: "/family/create", icon: "badge", label: "Make a badge" },
  { href: "/family/rewards", icon: "wish", label: "Wishes & awards" },
  { href: "/family/settings", icon: "plus", label: "Add a learner" },
];

/** P08 Parent home: today at a glance for every learner, plus anything waiting on a grown-up. */
export default function ParentHome() {
  const ready = useHydrated();
  const s = useFamily();
  if (!ready) return <Loading />;
  const goal = s.settings.goal;
  const minutes = s.learners.reduce((n, l) => n + l.week.reduce((a, b) => a + b, 0), 0);
  const name = (id) => s.learners.find((l) => l.id === id)?.name || "";

  return (
    <FamilyShell
      title={t("family.hello", { name: s.family.parent })}
      sub={`${s.family.plan} plan`}
      family={s.family}
      active="/family"
      wide
      right={
        <IconButton
          component={Link}
          href="/family/settings"
          aria-label="Help"
          sx={{ border: `1.5px solid ${colors.line}`, color: "text.primary" }}
        >
          <Icon name="help" size={20} />
        </IconButton>
      }
    >
      {s.waiting.length > 0 && (
        <Card
          sx={{
            p: 2,
            bgcolor: colors.sun.soft,
            borderColor: colors.sun.deep,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography sx={{ fontWeight: 800 }}>{t("family.waiting")}</Typography>
          {s.waiting.map((w) => (
            <Box
              key={w.id}
              sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}
            >
              <Typography>
                <b>{name(w.learnerId)}</b> {w.text}
              </Typography>
              <Button component={Link} href="/family/rewards" variant="contained" size="small">
                Review
              </Button>
            </Box>
          ))}
        </Card>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 1.75,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        {s.learners.map((l) => {
          const age = ageFrom(l.birth);
          return (
            <Card
              key={l.id}
              component={Link}
              href={`/family/progress?learner=${l.id}`}
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
                textDecoration: "none",
                color: "text.primary",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <LearnerAvatar learner={l} size={46} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{l.name}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                    {isAdult(age) ? "Adult learner" : `Age ${age}`} · {BAND[bandForAge(age)]}
                  </Typography>
                </Box>
                {l.buddy ? (
                  <Buddy id={l.buddy} outfit={l.outfit} size={46} still />
                ) : (
                  <Chip size="small" label="New" color="secondary" />
                )}
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                  {t("family.todayLine", { done: l.today, goal, minutes: l.minutes })}
                </Typography>
                <Box sx={{ display: "flex", gap: 1.25, fontWeight: 800 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                    <Star size={18} />
                    {totalStars(l.progress)}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                    <Gem size={18} />
                    {l.treasures}
                  </Box>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (l.today / goal) * 100)}
                sx={{ height: 10, borderRadius: 5, bgcolor: colors.sand }}
              />
            </Card>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, minmax(0, 1fr))" },
        }}
      >
        {ACTIONS.map((a) => (
          <Card
            key={a.label}
            component={Link}
            href={a.href}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              textDecoration: "none",
              color: "text.primary",
              minHeight: 88,
            }}
          >
            <Icon name={a.icon} />
            <Typography sx={{ fontWeight: 800 }}>{a.label}</Typography>
          </Card>
        ))}
      </Box>

      <Card sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 800 }}>{t("family.thisWeek")}</Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
          {t("family.weekLine", { minutes })}
        </Typography>
      </Card>
      <Button
        component={Link}
        href="/play"
        variant="outlined"
        sx={{ alignSelf: "flex-start", borderWidth: 2 }}
      >
        Open the learner app
      </Button>
    </FamilyShell>
  );
}
