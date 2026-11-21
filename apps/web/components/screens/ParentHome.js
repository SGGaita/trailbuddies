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
import { ageFrom, bandForAge, grownUpQueue, isAdult, totalStars, weekSummary } from "@trailbuddies/domain";
import { builtInBadges } from "@trailbuddies/content";
import { useFamily, useHydrated, useLearners } from "@/lib/store";
import FamilyShell from "@/components/shell/FamilyShell";
import LearnerAvatar from "@/components/LearnerAvatar";
import Buddy from "@/components/art/Buddy";
import { Star, Gem } from "@/components/Coins";
import Icon from "@/components/Icon";
import Loading from "@/components/Loading";
import WhatsNew from "@/components/WhatsNew";
import FirstSteps from "@/components/FirstSteps";

const BAND = {
  seedling: "Seedling",
  sprout: "Sprout",
  explorer: "Explorer",
  voyager: "Voyager",
  trailblazer: "Trailblazer",
};
const ACTIONS = [
  { href: "/family/create", icon: "book", label: "Make a lesson" },
  { href: "/family/create/badge", icon: "badge", label: "Make a badge" },
  { href: "/family/rewards", icon: "wish", label: "Wishes & awards" },
  { href: "/family/settings", icon: "plus", label: "Add a learner" },
];

/** P08 Parent home: today at a glance for every learner, plus anything waiting on a grown-up. */
export default function ParentHome() {
  const ready = useHydrated();
  const s = useFamily();
  const learners = useLearners();
  if (!ready) return <Loading />;
  const goal = s.settings.goal;
  const minutes = learners.reduce((n, l) => n + l.week.reduce((a, b) => a + b, 0), 0);

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
          href="/family/help"
          aria-label="Help"
          sx={{ border: `1.5px solid ${colors.line}`, color: "text.primary" }}
        >
          <Icon name="help" size={20} />
        </IconButton>
      }
    >
      <WhatsNew />
      <FirstSteps />
      <WaitingForYou learners={learners} wishes={s.wishes} />

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
        {learners.map((l) => {
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
              <WeekLine learner={l} />
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

/** PAR-01: this week's minutes and lessons, and the latest badge. */
function WeekLine({ learner }) {
  const w = weekSummary(learner.results);
  const latest = builtInBadges.find((b) => b.id === learner.badges.at(-1));
  return (
    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
      {t("family.weekKid", { minutes: w.minutes, lessons: w.lessons })}
      {latest ? ` · ${t("family.latestBadge", { name: latest.name })}` : ""}
    </Typography>
  );
}

/** P08 "Waiting for you": wishes to answer and rewards to hand over (BST-04, BST-07). */
function WaitingForYou({ learners, wishes }) {
  const q = grownUpQueue(wishes, learners.map((l) => ({ id: l.id, name: l.name, state: l })));
  const lines = [
    ...q.requests.map((r) => ({ key: `r${r.wish.id}`, text: t("rewards.asked", { name: r.name, title: r.wish.title }), go: t("family.review") })),
    ...q.approved.map((r) => ({ key: `a${r.wish.id}`, text: t("family.deliverWish", { title: r.wish.title, name: r.name }), go: t("family.open") })),
    ...q.toDeliver.map((r) => ({ key: `d${r.learnerId}${r.badgeId}`, text: t("family.deliverWish", { title: r.reward, name: r.name }), go: t("family.open") })),
  ];
  if (!lines.length) return null;
  return (
    <Card sx={{ p: 2, bgcolor: colors.sun.soft, borderColor: colors.sun.deep, display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography component="h2" sx={{ fontWeight: 800 }}>
        {t("family.waiting")}
      </Typography>
      {lines.slice(0, 4).map((l) => (
        <Box key={l.key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
          <Typography>{l.text}</Typography>
          <Button component={Link} href="/family/rewards" variant="contained" size="small">
            {l.go}
          </Button>
        </Box>
      ))}
    </Card>
  );
}
