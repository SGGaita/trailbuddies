"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import {
  PICTURES,
  PICTURE_COUNT,
  afterWrongTry,
  checkPictureLock,
  makePictureLock,
} from "@trailbuddies/domain";
import { speak } from "@/lib/speech";
import { playSound } from "@/lib/sounds";
import PictureIcon from "@/components/art/PictureIcon";
import LearnerAvatar from "@/components/LearnerAvatar";

const paper = {
  paper: {
    sx: {
      borderRadius: 5.5,
      p: { xs: 2, sm: 3 },
      gap: 1.5,
      alignItems: "center",
      width: "100%",
      maxWidth: 460,
    },
  },
};

/** The 3 x 3 grid of pictures. Tiles are 88px or more: easy for small fingers (ACC-01). */
function Grid({ onPick, glow, chosen = [] }) {
  return (
    <Box
      role="group"
      aria-label={t("pictures.grid")}
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: { xs: 1, sm: 1.5 },
        width: "100%",
        maxWidth: 360,
      }}
    >
      {PICTURES.map((p) => (
        <Box
          key={p}
          component="button"
          type="button"
          data-picture={p}
          aria-label={t(`pictures.${p}`)}
          onClick={() => onPick(p)}
          className={glow === p ? "glow" : undefined}
          sx={{
            aspectRatio: "1",
            minHeight: 88,
            display: "grid",
            placeItems: "center",
            bgcolor: chosen.includes(p) ? colors.leaf.soft : "background.paper",
            border: `3px solid ${glow === p ? colors.sun.deep : chosen.includes(p) ? colors.leaf.main : colors.line}`,
            borderRadius: 4.5,
            cursor: "pointer",
            p: 0.5,
          }}
        >
          <PictureIcon id={p} size={60} />
        </Box>
      ))}
    </Box>
  );
}

/** Dots showing how many pictures have been tapped. */
const Dots = ({ n }) => (
  <Box aria-hidden="true" sx={{ display: "flex", gap: 1 }}>
    {Array.from({ length: PICTURE_COUNT }, (_, i) => (
      <Box
        key={i}
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          bgcolor: i < n ? colors.leaf.main : colors.sand,
          border: `2px solid ${colors.line}`,
        }}
      />
    ))}
  </Box>
);

/**
 * FAM-02: a child opens their profile by tapping their 3 pictures in order. After 3 wrong tries
 * the first picture glows as a hint; a grown-up can reset it in Settings.
 * @param {{ learner: any, voice: boolean, onOpen: () => void, onClose: () => void }} props
 */
export function PictureLockDialog({ learner, voice, onOpen, onClose }) {
  const [seq, setSeq] = useState(/** @type {string[]} */ ([]));
  const [wrong, setWrong] = useState(0);
  const [shake, setShake] = useState(false);
  const lock = learner.picture_lock;
  const hint = afterWrongTry(wrong).hint ? lock.hint : null;
  const say = (text) => speak(text, { buddy: learner.buddy, enabled: voice });

  const pick = async (p) => {
    const next = [...seq, p];
    setSeq(next);
    if (next.length < PICTURE_COUNT) return;
    if (await checkPictureLock(next, lock)) {
      playSound("right");
      onOpen();
      return;
    }
    playSound("miss");
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setWrong(wrong + 1);
    setSeq([]);
    say(afterWrongTry(wrong + 1).hint ? t("pictures.hintSay") : t("pictures.tryAgain"));
  };

  return (
    <Dialog open onClose={onClose} aria-labelledby="pic-lock" slotProps={paper}>
      <LearnerAvatar learner={learner} size={64} />
      <Typography id="pic-lock" variant="h5" component="h2" sx={{ textAlign: "center" }}>
        {t("pictures.tapYours", { name: learner.name })}
      </Typography>
      <Box className={shake ? "shake" : undefined}>
        <Dots n={seq.length} />
      </Box>
      {wrong > 0 && (
        <Typography role="status" sx={{ fontWeight: 700, color: "text.secondary", textAlign: "center" }}>
          {hint ? t("pictures.hint") : t("pictures.tryAgain")}
        </Typography>
      )}
      <Grid onPick={pick} glow={hint && seq.length === 0 ? hint : null} />
      <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={onClose}>
        {t("common.notNow")}
      </Button>
    </Dialog>
  );
}

/**
 * FAM-02, grown-up side: choose the 3 pictures together with the child, then confirm them once.
 * @param {{ learner: any, onSave: (lock: any) => void, onClose: () => void }} props
 */
export function PictureLockSetup({ learner, onSave, onClose }) {
  const [first, setFirst] = useState(/** @type {string[] | null} */ (null));
  const [seq, setSeq] = useState(/** @type {string[]} */ ([]));
  const [error, setError] = useState("");
  const pick = async (p) => {
    const next = [...seq, p];
    setSeq(next);
    if (next.length < PICTURE_COUNT) return;
    if (!first) {
      setFirst(next);
      setSeq([]);
      setError("");
      return;
    }
    if (next.join() !== first.join()) {
      setFirst(null);
      setSeq([]);
      setError(t("pictures.noMatch"));
      return;
    }
    onSave(await makePictureLock(next));
  };
  return (
    <Dialog open onClose={onClose} aria-labelledby="pic-setup" slotProps={paper}>
      <Typography id="pic-setup" variant="h5" component="h2" sx={{ textAlign: "center" }}>
        {first ? t("pictures.confirm") : t("pictures.choose", { name: learner.name })}
      </Typography>
      <Typography sx={{ color: "text.secondary", textAlign: "center", fontSize: 14 }}>
        {t("pictures.setupSub")}
      </Typography>
      <Dots n={seq.length} />
      {error && <Typography sx={{ color: "error.main", fontWeight: 700 }}>{error}</Typography>}
      <Grid onPick={pick} chosen={seq} />
      <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={onClose}>
        {t("common.cancel")}
      </Button>
    </Dialog>
  );
}
