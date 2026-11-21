"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { economy } from "@trailbuddies/content";
import { wishCards } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { createEvent } from "@trailbuddies/sync";
import { colors } from "@trailbuddies/tokens";
import LearnerShell from "@/components/shell/LearnerShell";
import Loading from "@/components/Loading";
import { OUTFITS } from "@/lib/art";
import { playSound } from "@/lib/sounds";
import { speak } from "@/lib/speech";
import { useFamily, useHydrated, useLearner } from "@/lib/store";

const SHOP = Object.fromEntries(economy.shop.filter((i) => OUTFITS[i.id]).map((i) => [i.id, { ...i, name: OUTFITS[i.id].name }]));

const PILL = {
  asked: { bg: colors.sun.soft, border: colors.sun.deep, key: "wishes.waiting" },
  approved: { bg: colors.leaf.soft, border: colors.leaf.main, key: "wishes.approved" },
  delivered: { bg: colors.leaf.soft, border: colors.leaf.main, key: "wishes.delivered" },
};

/**
 * C21 My wishes (BST-04, BST-07): rewards a grown-up set up, with how far there is to go. With
 * enough treasures the child asks for one; the treasures are kept safe until a grown-up answers.
 * Rewards earned with a badge show here too.
 */
export default function Wishes() {
  const ready = useHydrated();
  const router = useRouter();
  const learner = useLearner();
  const wishes = useFamily((s) => s.wishes);
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  if (!ready || !learner) return <Loading />;
  const cards = wishCards(wishes, learner, learner.id);
  const saving = learner.wish && SHOP[learner.wish];
  const say = (line) => speak(line, { band: learner.band, buddy: learner.buddy, enabled: voice });
  const ask = (c) => {
    useFamily.getState().record([createEvent("wish_requested", learner.id, { wishId: c.id, amount: c.price })]);
    playSound("done");
    say(t("wishes.askedSay"));
  };
  return (
    <LearnerShell learner={learner} title={t("wishes.title")} back="/play/map" active="/play/more/wishes" goal={goal}>
      <Box sx={{ px: { xs: 1.5, sm: 3.25 }, py: { xs: 1.5, sm: 2.25 }, display: "flex", flexDirection: "column", gap: 2 }}>
        {cards.length === 0 && !saving && (
          <Box sx={{ p: 2.5, bgcolor: "background.paper", border: `2px solid ${colors.line}`, borderRadius: 4.5, maxWidth: 560 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{t("wishes.none")}</Typography>
            <Typography sx={{ color: "text.secondary" }}>{t("wishes.noneSub")}</Typography>
          </Box>
        )}
        <Box
          component="ul"
          aria-label={t("wishes.title")}
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            display: "grid",
            gap: { xs: 1.5, sm: 2.25 },
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
          }}
        >
          {cards.map((c) => {
            const pill = c.kind === "reward" ? (c.delivered ? PILL.delivered : PILL.asked) : PILL[c.status];
            return (
              <Box
                component="li"
                key={`${c.kind}-${c.id}`}
                data-wish={c.title}
                data-status={c.kind === "reward" ? (c.delivered ? "delivered" : "earned") : c.status}
                sx={{
                  bgcolor: "background.paper",
                  border: `3px solid ${pill?.border || colors.line}`,
                  borderRadius: 6.5,
                  p: 2.25,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                  minWidth: 0,
                }}
              >
                <Box
                  aria-hidden="true"
                  className={c.status === "delivered" || c.delivered ? "starpop" : undefined}
                  sx={{
                    height: 110,
                    borderRadius: 4.5,
                    bgcolor: c.kind === "reward" ? colors.sun.soft : colors.sand,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 64,
                  }}
                >
                  {c.kind === "reward" ? "🏅" : c.emoji}
                </Box>
                <Typography component="h2" sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, lineHeight: 1.15 }}>
                  {c.title}
                </Typography>
                <Typography sx={{ color: "text.secondary", fontWeight: 700 }}>
                  {c.kind === "reward" ? t("wishes.withBadge", { badge: c.badge }) : t("wishes.price", { n: c.price })}
                </Typography>
                {c.kind === "wish" && c.status === "open" && (
                  <>
                    <LinearProgress
                      variant="determinate"
                      value={c.percent}
                      aria-label={t("wishes.progress", { n: c.percent })}
                      sx={{ height: 16, borderRadius: 2, bgcolor: colors.sand, "& .MuiLinearProgress-bar": { bgcolor: colors.sky.main, borderRadius: 2 } }}
                    />
                    {c.canAsk ? (
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => ask(c)}
                        sx={{ bgcolor: colors.sun.main, color: colors.ink, "&:hover": { bgcolor: colors.sun.deep } }}
                      >
                        {t("wishes.ask")}
                      </Button>
                    ) : (
                      <Typography sx={{ fontWeight: 800 }}>{t("wishes.toGo", { n: c.toGo })}</Typography>
                    )}
                  </>
                )}
                {pill && (c.kind === "reward" || c.status !== "open") && (
                  <Box
                    role="status"
                    sx={{ alignSelf: "flex-start", px: 1.5, py: 0.5, borderRadius: 999, bgcolor: pill.bg, fontWeight: 800 }}
                  >
                    {c.kind === "reward" ? t(c.delivered ? "wishes.rewardDelivered" : "wishes.rewardComing") : t(pill.key)}
                  </Box>
                )}
              </Box>
            );
          })}
          {saving && (
            <Box
              component="li"
              data-wish={saving.name}
              sx={{ bgcolor: "background.paper", border: `3px solid ${colors.line}`, borderRadius: 6.5, p: 2.25, display: "flex", flexDirection: "column", gap: 1.25 }}
            >
              <Typography component="h2" sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24 }}>
                {t("wishes.saving", { name: saving.name })}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontWeight: 700 }}>{t("wishes.shopItem", { n: saving.price })}</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.round((learner.treasures / saving.price) * 100))}
                aria-label={t("wishes.progress", { n: Math.min(100, Math.round((learner.treasures / saving.price) * 100)) })}
                sx={{ height: 16, borderRadius: 2, bgcolor: colors.sand, "& .MuiLinearProgress-bar": { bgcolor: colors.sky.main, borderRadius: 2 } }}
              />
              <Button component={Link} href="/play/more/shop" variant="outlined" sx={{ borderWidth: 2, alignSelf: "flex-start" }}>
                {t("wishes.toShop")}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </LearnerShell>
  );
}
