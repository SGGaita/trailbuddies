"use client";
import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { SOUNDS, recordedCount } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { canEdit } from "@/lib/account";
import { createRecorder, saveMedia, mediaUrl } from "@/lib/media";
import { speak, stop } from "@/lib/speech";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";

/**
 * LES-19 (P28): record each letter sound once. Recordings sync to every family device and play
 * in every lesson that uses the sound, instead of the voice pack or the device voice.
 */
export default function LetterSounds() {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const sounds = useFamily((s) => s.sounds);
  const setSound = useFamily((s) => s.setSound);
  const editable = useFamily(canEdit);
  const [recording, setRecording] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {"denied" | "other" | ""} */ (""));
  const rec = useRef(/** @type {ReturnType<typeof createRecorder> | null} */ (null));
  if (!ready) return <Loading />;
  const voiceOff = family?.consent && family.consent.scopes && !family.consent.scopes.voice;

  const start = async (id) => {
    setError("");
    stop();
    try {
      const r = createRecorder();
      await r.start();
      rec.current = r;
      setRecording(id);
    } catch (e) {
      setRecording(null);
      setError(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "denied" : "other");
    }
  };
  const finish = async () => {
    const id = recording;
    const r = rec.current;
    setRecording(null);
    rec.current = null;
    if (!r || !id) return;
    try {
      const blob = await r.stop();
      setSound(id, await saveMedia("voice", blob));
    } catch {
      setError("other");
    }
  };
  const play = async (id) => {
    const url = sounds[id] ? await mediaUrl(sounds[id]) : null;
    if (url) new Audio(url).play().catch(() => {});
    else speak(id);
  };

  return (
    <FamilyShell
      title={t("sounds.title")}
      sub={t("sounds.count", { n: recordedCount(sounds), total: SOUNDS.length })}
      family={family}
      active="/family/settings"
      back="/family/settings"
      wide
    >
      <Typography sx={{ maxWidth: 720 }}>{t("sounds.intro")}</Typography>
      {error === "denied" && (
        <Alert severity="warning" role="alert">
          {t("sounds.micDenied")}
        </Alert>
      )}
      {error === "other" && <Alert severity="warning">{t("sounds.micError")}</Alert>}
      {voiceOff && <Alert severity="info">{t("sounds.voiceOff")}</Alert>}
      <Box
        component="ul"
        aria-label={t("sounds.title")}
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        {SOUNDS.map((s) => {
          const has = Boolean(sounds[s.id]);
          const live = recording === s.id;
          return (
            <Box
              component="li"
              key={s.id}
              data-sound={s.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                p: 1.25,
                bgcolor: "background.paper",
                border: `2px solid ${live ? colors.coral.main : colors.line}`,
                borderRadius: 4.5,
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3.5,
                  bgcolor: colors.sand,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 24,
                }}
              >
                {s.id}
              </Box>
              <Box sx={{ flex: 1, minWidth: 90 }}>
                <Typography sx={{ fontWeight: 800 }}>{t("sounds.asIn", { word: s.example })}</Typography>
                <Chip
                  size="small"
                  label={has ? t("sounds.yours") : t("sounds.device")}
                  color={has ? "success" : "default"}
                  variant={has ? "filled" : "outlined"}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {live ? (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={finish}
                    aria-label={t("sounds.stopFor", { sound: s.id })}
                  >
                    {t("sounds.stop")}
                  </Button>
                ) : (
                  <Button
                    variant={has ? "outlined" : "contained"}
                    sx={has ? { borderWidth: 2 } : undefined}
                    disabled={!editable || Boolean(recording)}
                    onClick={() => start(s.id)}
                    aria-label={t("sounds.recordFor", { sound: s.id })}
                  >
                    {has ? t("sounds.again") : t("sounds.record")}
                  </Button>
                )}
                <Button onClick={() => play(s.id)} aria-label={t("sounds.playFor", { sound: s.id })}>
                  {t("sounds.play")}
                </Button>
                {has && (
                  <Button
                    disabled={!editable}
                    onClick={() => setSound(s.id, null)}
                    aria-label={t("sounds.deviceFor", { sound: s.id })}
                  >
                    {t("sounds.useDevice")}
                  </Button>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </FamilyShell>
  );
}
