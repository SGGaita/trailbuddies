"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { idleState } from "@trailbuddies/domain";
import { useFamily } from "@/lib/store";
import Buddy from "@/components/art/Buddy";

const TAPS = ["pointerdown", "keydown", "touchstart", "wheel"];

/**
 * CRM-03: on a classroom device, a child who stops playing is signed out after 3 minutes, with
 * a "Still there?" warning 10 seconds before, so the next child never plays on their profile.
 * Renders nothing on family devices or the class list.
 */
export default function ClassroomTimer() {
  const on = useFamily((s) => s.mode === "class" && !!s.family?.classroom && !!s.activeId);
  const buddy = useFamily((s) => s.learners.find((l) => l.id === s.activeId)?.buddy || "zip");
  const setActive = useFamily((s) => s.setActive);
  const router = useRouter();
  const last = useRef(0);
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    if (!on) return undefined;
    last.current = Date.now();
    const tap = () => {
      last.current = Date.now();
    };
    TAPS.forEach((e) => window.addEventListener(e, tap, { passive: true, capture: true }));
    const tick = setInterval(() => {
      const state = idleState(last.current, Date.now());
      if (state === "out") {
        setWarn(false);
        setActive(null);
        router.replace("/play");
      } else setWarn(state === "warn");
    }, 1000);
    return () => {
      TAPS.forEach((e) => window.removeEventListener(e, tap, { capture: true }));
      clearInterval(tick);
    };
  }, [on, setActive, router]);

  if (!on || !warn) return null;
  return (
    <Dialog
      open
      aria-labelledby="still-there"
      slotProps={{
        paper: { sx: { borderRadius: 5.5, p: 3, gap: 1.5, alignItems: "center", textAlign: "center" } },
      }}
    >
      <Buddy id={buddy} size={96} mood="happy" />
      <Typography id="still-there" variant="h5" component="h2">
        {t("classroom.still")}
      </Typography>
      <Typography>{t("classroom.stillSub")}</Typography>
      <Box>
        <Button variant="contained" size="large" autoFocus onClick={() => setWarn(false)}>
          {t("classroom.here")}
        </Button>
      </Box>
    </Dialog>
  );
}
