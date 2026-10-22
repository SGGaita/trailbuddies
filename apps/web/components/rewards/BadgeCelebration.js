"use client";
import { useEffect, useEffectEvent, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { buddyLine } from "@trailbuddies/content";
import { speak } from "@/lib/speech";
import { playSound } from "@/lib/sounds";
import Buddy from "@/components/art/Buddy";
import BadgeArt from "./BadgeArt";
import CountUp from "./CountUp";

/**
 * BDG-03: a full-screen celebration for each new badge, one after another. The buddy says
 * its line, the badge flies off to the badge book and the treasures count up.
 * @param {{ badges: any[], learner: any, voice: boolean, onDone: () => void }} props
 */
export default function BadgeCelebration({ badges, learner, voice, onDone }) {
  const [i, setI] = useState(0);
  const [flying, setFlying] = useState(false);
  const badge = badges[i];
  const announce = useEffectEvent(() => {
    playSound("done");
    speak(buddyLine("badge.earned", { badge: badge.name, name: learner.name }, i, learner.buddy), {
      band: learner.band,
      buddy: learner.buddy,
      enabled: voice,
    });
  });
  useEffect(() => {
    if (badge) announce();
  }, [i, badge]);
  if (!badge) return null;
  const next = () => {
    if (flying) return; // one badge at a time, even with quick taps
    setFlying(true);
    setTimeout(() => {
      setFlying(false);
      if (i + 1 < badges.length) setI(i + 1);
      else onDone();
    }, 650);
  };
  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label={t("badges.new")}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        display: "grid",
        placeItems: "center",
        p: 2,
        background: `radial-gradient(circle at 50% 40%, ${colors.sun.soft}, rgba(38,51,34,.85) 70%)`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          textAlign: "center",
          maxWidth: 440,
        }}
      >
        <Typography variant="h4" component="h2" sx={{ color: "#fff", textShadow: "0 2px 0 rgba(0,0,0,.3)" }}>
          {t("badges.new")}
        </Typography>
        <Box key={badge.id} className={flying ? "badge-fly" : "starpop"}>
          <BadgeArt badge={badge} size={150} />
        </Box>
        <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, color: "#fff" }}>
          {badge.name}
        </Typography>
        <Typography sx={{ color: "#fff", opacity: 0.9 }}>{badge.how}</Typography>
        {badge.payout > 0 && (
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 999,
              px: 2,
              py: 0.75,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            💎 <CountUp value={badge.payout} prefix="+" />
          </Box>
        )}
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
          <Buddy id={learner.buddy} outfit={learner.outfit} mood="cheer" size={90} />
        </Box>
        <Button variant="contained" size="large" onClick={next} autoFocus sx={{ minWidth: 200 }}>
          {i + 1 < badges.length ? t("lesson.next") : t("badges.toBook")}
        </Button>
      </Box>
    </Box>
  );
}
