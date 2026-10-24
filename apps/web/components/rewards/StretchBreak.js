"use client";
import { useEffect, useEffectEvent, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { STRETCH_MOVES } from "@trailbuddies/domain";
import { speak } from "@/lib/speech";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";

const ICONS = { reach: "🙌", wiggle: "🖐️", breathe: "🌬️" };

/**
 * PAR-04: a 30-second stretch the buddy leads after a lesson: three moves of 10 seconds,
 * each said aloud. When it's over, the child goes back to playing.
 * @param {{ learner: any, voice: boolean, onDone: () => void }} props
 */
export default function StretchBreak({ learner, voice, onDone }) {
  const [i, setI] = useState(0);
  const finished = i >= STRETCH_MOVES.length;
  const move = STRETCH_MOVES[Math.min(i, STRETCH_MOVES.length - 1)];
  const say = useEffectEvent((text) => speak(text, { band: learner.band, buddy: learner.buddy, enabled: voice }));
  useEffect(() => {
    say(finished ? t("stretch.done") : i === 0 ? `${t("stretch.title")} ${move.say}` : move.say);
    if (finished) return undefined;
    const id = setTimeout(() => setI(i + 1), move.seconds * 1000);
    return () => clearTimeout(id);
  }, [i, finished, move]);

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label={t("stretch.title")}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        display: "grid",
        placeItems: "center",
        p: 2,
        background: `radial-gradient(circle at 50% 35%, ${colors.sky.soft}, ${colors.cream} 70%)`,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center", maxWidth: 560 }}>
        <Typography variant="h4" component="h2" sx={{ fontSize: { xs: 28, sm: 36 } }}>
          {finished ? t("stretch.doneTitle") : t("stretch.title")}
        </Typography>
        <Box aria-hidden="true" sx={{ fontSize: { xs: 72, sm: 96 }, lineHeight: 1 }}>
          {finished ? "⭐" : ICONS[move.id]}
        </Box>
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
          <Buddy id={learner.buddy} outfit={learner.outfit} mood="cheer" size={110} />
          <Bubble sx={{ maxWidth: 360 }}>{finished ? t("stretch.done") : move.say}</Bubble>
        </Box>
        <Box role="progressbar" aria-label={t("stretch.progress")} aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(i, 3)} sx={{ display: "flex", gap: 1 }}>
          {STRETCH_MOVES.map((m, k) => (
            <Box
              key={m.id}
              sx={{
                width: 48,
                height: 16,
                borderRadius: 2,
                bgcolor: k < i ? colors.leaf.main : k === i ? colors.sun.main : colors.sand,
              }}
            />
          ))}
        </Box>
        {finished && (
          <Button variant="contained" size="large" onClick={onDone} autoFocus>
            {t("stretch.back")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
