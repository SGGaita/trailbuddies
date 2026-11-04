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

const CONFETTI_COLOURS = [colors.sun.main, colors.coral.main, colors.sky.main, colors.berry.main, "#ffffff"];
/** Fixed confetti layout (no Math.random in render), spread evenly with a little jitter. */
const CONFETTI = Array.from({ length: 36 }, (_, n) => ({
  left: ((n * 37) % 100) + (n % 3) * 0.7,
  delay: ((n * 53) % 150) / 100,
  duration: 2.4 + ((n * 29) % 10) / 10,
  colour: CONFETTI_COLOURS[n % CONFETTI_COLOURS.length],
  tilt: (n * 47) % 360,
}));

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
        overflowY: "auto",
        overflowX: "hidden",
        color: "#fff",
        // A solid celebration green, so the screen underneath never shows through: bright
        // behind the badge, deeper where the white text sits.
        bgcolor: colors.cheer.main,
        backgroundImage: `radial-gradient(circle at 50% 34%, ${colors.cheer.bright} 0%, ${colors.cheer.bright} 12%, ${colors.cheer.main} 38%, ${colors.cheer.deep} 100%)`,
      }}
    >
      <Box className="badge-rays" aria-hidden="true" />
      <Box className="conf" aria-hidden="true">
        {CONFETTI.map((c, n) => (
          <i
            key={n}
            style={{
              left: `${c.left}%`,
              background: c.colour,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              rotate: `${c.tilt}deg`,
            }}
          />
        ))}
      </Box>
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          textAlign: "center",
          maxWidth: 440,
        }}
      >
        <Typography
          variant="h4"
          component="h2"
          sx={{ color: "#fff", letterSpacing: ".04em", textShadow: `0 3px 0 ${colors.cheer.deep}` }}
        >
          {t("badges.new")}
        </Typography>
        <Box key={badge.id} className={flying ? "badge-fly" : "starpop"}>
          <BadgeArt badge={badge} size={150} />
        </Box>
        <Typography
          sx={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 28,
            color: "#fff",
            textShadow: `0 2px 0 ${colors.cheer.deep}`,
          }}
        >
          {badge.name}
        </Typography>
        <Typography
          sx={{
            bgcolor: "#fff",
            color: colors.ink,
            borderRadius: 5.5,
            px: 2.5,
            py: 1.25,
            fontWeight: 700,
            boxShadow: `0 4px 0 ${colors.cheer.deep}`,
          }}
        >
          {badge.how}
        </Typography>
        {badge.payout > 0 && (
          <Box
            sx={{
              bgcolor: "#fff",
              color: colors.ink,
              border: `2px solid ${colors.sun.main}`,
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
        <Box
          sx={{
            display: "grid",
            placeItems: "center",
            width: 118,
            height: 118,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,.28)",
          }}
        >
          <Buddy id={learner.buddy} outfit={learner.outfit} mood="cheer" size={90} />
        </Box>
        <Button
          variant="contained"
          size="large"
          onClick={next}
          autoFocus
          sx={{
            minWidth: 200,
            bgcolor: "#fff",
            color: colors.leaf.deep,
            boxShadow: `0 4px 0 ${colors.cheer.deep}`,
            "&:hover": { bgcolor: colors.leaf.soft, boxShadow: `0 4px 0 ${colors.cheer.deep}` },
          }}
        >
          {i + 1 < badges.length ? t("lesson.next") : t("badges.toBook")}
        </Button>
      </Box>
    </Box>
  );
}
