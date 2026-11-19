"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import { buddyLine } from "@trailbuddies/content";
import { t } from "@trailbuddies/i18n";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { speak, stop } from "@/lib/speech";
import { BUDDIES, BUDDY_ART } from "@/lib/art";
import BuddyMotion from "@/components/art/BuddyMotion";
import Loading from "@/components/Loading";

const ART = BUDDY_ART;
const TINTS = { zip: "#e0e6fa", tumi: "#f8e9c7", jumbo: "#f5e5ef", kiki: "#e8f1cf" };
const PANEL = {
  bgcolor: "#fcf8ee",
  border: "1px solid #e4d3b6",
  borderRadius: 5,
  p: { xs: 1.5, sm: 2 },
  boxShadow: "0 4px 0 #ac87302b",
};
const DISPLAY = { fontFamily: "Georgia, serif", fontWeight: 900, color: "#32204f" };
const PLAY_ACTIONS = ["talk", "walk", "wave"];

function Portrait({ id, sx, ...props }) {
  return (
    <Box
      component="img"
      src={`${ART}/${id}.webp`}
      alt=""
      draggable={false}
      sx={{ objectFit: "contain", ...sx }}
      {...props}
    />
  );
}

export default function MeetBuddies() {
  const ready = useHydrated();
  const learner = useLearner();
  const router = useRouter();
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  if (!ready || !learner) return <Loading />;
  return <BuddyPicker key={learner.id} learner={learner} />;
}

function BuddyPicker({ learner }) {
  const router = useRouter();
  const voice = useFamily((s) => s.settings.voice);
  const updateLearner = useFamily((s) => s.updateLearner);
  const current = BUDDIES[learner.buddy] ? learner.buddy : null;
  const [selection, setSelection] = useState(null);
  const [previewSound, setPreviewSound] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [action, setAction] = useState({ name: null, count: 0 });
  const [caption, setCaption] = useState("");
  const spoke = useRef(false);
  const id = selection || current || "zip";
  const buddy = BUDDIES[id];
  const unchanged = id === current;

  useEffect(
    () => () => {
      if (spoke.current) stop();
    },
    [],
  );

  function play(name) {
    setAction((previous) => ({ name, count: previous.count + 1 }));
    if (name !== "talk") return;
    const line = buddyLine("buddy.intro", {}, 0, id);
    setCaption(line);
    if (voice && previewSound) {
      spoke.current = true;
      speak(line, { band: learner.band, buddy: id });
    }
  }

  function select(next) {
    if (next === id) return;
    if (spoke.current) stop();
    setSelection(next);
    setCaption("");
    setAction((previous) => ({ ...previous, name: null }));
  }

  function choose() {
    updateLearner(learner.id, { buddy: id });
    spoke.current = false; // Let the chosen buddy's greeting continue on the map.
    speak(buddyLine("buddies.chosen", { name: learner.name }, 0, id), {
      band: learner.band,
      buddy: id,
      enabled: voice && previewSound,
    });
    router.push("/play/map");
  }

  return (
    <Box sx={{ minHeight: "100dvh", color: "#32204f", bgcolor: "#fff5d9" }}>
      <Box component="header" sx={{ bgcolor: "#fcf8ec", borderBottom: "1px solid #e8d9bd" }}>
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            px: { xs: 2, sm: 3 },
            py: 1.25,
            minHeight: 68,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{ display: "flex", gap: 1, alignItems: "center", ...DISPLAY, fontSize: { xs: 20, sm: 24 } }}
          >
            <Portrait
              id={current || id}
              sx={{ width: 42, height: 42, p: 0.5, borderRadius: 3, bgcolor: TINTS[current || id] }}
            />
            Trailbuddies
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {current && (
              <Button component={Link} href="/play/map" variant="outlined">
                {t("buddies.trailMap")}
              </Button>
            )}
            <Button
              variant="outlined"
              aria-pressed={voice && previewSound}
              disabled={!voice}
              onClick={() => {
                if (previewSound && spoke.current) stop();
                setPreviewSound(!previewSound);
              }}
            >
              {t(voice && previewSound ? "buddies.soundOn" : "buddies.soundOff")}
            </Button>
          </Box>
        </Box>
      </Box>
      <Box
        component="main"
        sx={{
          minHeight: "calc(100dvh - 68px)",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 6 },
          background: `linear-gradient(180deg, #fff9e3aa, #fff5d744 52%, #fff4d100 75%), url("${ART}/trail.webp") center 64% / cover no-repeat`,
        }}
      >
        <Box sx={{ maxWidth: 1130, mx: "auto" }}>
          <Box sx={{ textAlign: "center", mb: { xs: 2.5, sm: 3.5 } }}>
            <Typography
              component="h1"
              sx={{
                ...DISPLAY,
                fontSize: { xs: "clamp(2rem, 7vw, 3.4rem)", md: "4.25rem" },
                lineHeight: 1.07,
                letterSpacing: "-0.04em",
              }}
            >
              {t("buddies.title")}
            </Typography>
            <Typography sx={{ mt: 1, fontWeight: 700 }}>{t("buddies.prompt")}</Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.28fr) minmax(0, 1fr)" },
              gap: 2,
            }}
          >
            <Box component="section" aria-label={t("buddies.title")} sx={PANEL}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
                  gap: 1,
                }}
              >
                {Object.entries(BUDDIES).map(([key, option]) => (
                  <Box
                    key={key}
                    component="button"
                    type="button"
                    aria-pressed={key === id}
                    onClick={() => select(key)}
                    aria-label={t("buddies.select", { buddy: option.name, kind: option.kind })}
                    sx={{
                      minWidth: 0,
                      display: "grid",
                      justifyItems: "center",
                      p: 1,
                      borderRadius: 3,
                      border: "2px solid",
                      borderColor: key === id ? "#7450a8" : "#564a3b32",
                      bgcolor: TINTS[key],
                      color: "#32204f",
                      cursor: "pointer",
                      boxShadow: key === id ? "0 2px 0 #7450a855" : "none",
                      "&:focus-visible": { outline: "3px solid #32204f", outlineOffset: 2 },
                    }}
                  >
                    <Portrait id={key} sx={{ width: "min(100%, 88px)", height: { xs: 64, sm: 80 } }} />
                    <Typography component="span" sx={{ fontWeight: 800 }}>
                      {option.name}
                    </Typography>
                    <Typography component="span" sx={{ fontSize: "0.875rem", textTransform: "capitalize" }}>
                      {option.kind}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={() => (unchanged ? router.push("/play/map") : setConfirm(true))}
                sx={{ mt: 2 }}
              >
                {unchanged ? t("buddies.return") : t("buddies.pickBuddy", { buddy: buddy.name })}
              </Button>
            </Box>
            <Box component="section" aria-label={t("buddies.preview")} sx={PANEL}>
              <Typography component="h2" sx={{ ...DISPLAY, fontSize: "1.5rem", lineHeight: 1.15 }}>
                {buddy.name}
              </Typography>
              <Typography sx={{ textTransform: "capitalize", fontSize: "0.875rem", fontWeight: 700, mb: 1 }}>
                {buddy.kind}
              </Typography>
              <Box
                component="button"
                type="button"
                onClick={() => play("talk")}
                aria-label={t("buddies.hello", { buddy: buddy.name, kind: buddy.kind })}
                sx={{
                  position: "relative",
                  width: "100%",
                  display: "block",
                  aspectRatio: "3 / 2",
                  overflow: "hidden",
                  border: "1px solid #c9b8de",
                  borderRadius: 3,
                  cursor: "pointer",
                  background: `url("${ART}/world.webp") center / cover no-repeat, ${TINTS[id]}`,
                }}
              >
                <Portrait
                  key={`${id}-${action.count}`}
                  id={id}
                  data-buddy-art=""
                  sx={{
                    position: "absolute",
                    top: "6%",
                    left: "12%",
                    width: "76%",
                    height: "88%",
                    filter: "drop-shadow(0 7px 8px #302c3855)",
                  }}
                />
                <BuddyMotion id={id} gesture={action.name} replay={action.count} stage />
              </Box>
              <Typography
                role="status"
                sx={{
                  my: 1,
                  p: 1,
                  minHeight: 48,
                  border: "1px solid #e3d4ed",
                  borderRadius: 2,
                  bgcolor: "#fffdf7",
                  fontWeight: 700,
                }}
              >
                {caption || t("buddies.tap", { buddy: buddy.name })}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0.75 }}>
                {PLAY_ACTIONS.map((name) => (
                  <Button
                    key={name}
                    variant={name === "talk" ? "contained" : "outlined"}
                    onClick={() => play(name)}
                    sx={{
                      px: 0.5,
                      bgcolor: name === "talk" ? "#5d3b91" : "#f3eafb",
                      color: name === "talk" ? "#fff" : "#44316a",
                      borderColor: "#dac9eb",
                      "&:hover": { bgcolor: name === "talk" ? "#4d2c7d" : "#e7d9f5" },
                    }}
                  >
                    {t(`buddies.${name}`)}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        aria-labelledby="buddy-confirm-title"
        slotProps={{ paper: { sx: { ...PANEL, textAlign: "center", alignItems: "center", gap: 1.5, p: 3 } } }}
      >
        <Portrait id={id} sx={{ width: 120, height: 120 }} />
        <Typography id="buddy-confirm-title" variant="h5" component="h2">
          {buddyLine("buddies.confirm", { buddy: buddy.name })}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={() => setConfirm(false)}>
            {t("buddies.notYet")}
          </Button>
          <Button variant="contained" onClick={choose} autoFocus>
            {t("buddies.confirm", { buddy: buddy.name })}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
