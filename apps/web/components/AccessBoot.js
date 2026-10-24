"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { colors } from "@trailbuddies/tokens";
import { useFamily } from "@/lib/store";
import { onSpeech } from "@/lib/speech";

/**
 * Accessibility settings for the whole app.
 * ACC-02 calm mode: sets html[data-calm] from the family setting, or from the device's
 * reduced-motion setting when it's "device".
 * ACC-03 captions: while the buddy speaks, the words show in a caption at the bottom.
 */
export default function AccessBoot() {
  const calm = useFamily((s) => s.settings?.calm || "device");
  const captions = useFamily((s) => s.settings?.captions !== false);
  const [line, setLine] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const on = calm === "on" || (calm === "device" && !!mq?.matches);
      document.documentElement.dataset.calm = on ? "1" : "0";
    };
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, [calm]);

  // A caption stays up long enough to read, even when the voice is quick (or missing).
  useEffect(() => {
    let since = 0;
    let timer = null;
    return onSpeech((text) => {
      clearTimeout(timer);
      if (text) {
        since = Date.now();
        setLine(text);
      } else {
        const left = Math.max(0, 2500 - (Date.now() - since));
        timer = setTimeout(() => setLine(null), left);
      }
    });
  }, []);

  if (!captions || !line) return null;
  return (
    <Box
      data-testid="caption"
      aria-hidden="true"
      sx={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: { xs: "calc(env(safe-area-inset-bottom, 0px) + 84px)", sm: 24 },
        zIndex: 1500,
        maxWidth: "min(640px, calc(100vw - 32px))",
        px: 2,
        py: 1,
        borderRadius: 3.5,
        bgcolor: "rgba(38,51,34,.88)",
        color: "#fff",
        fontWeight: 700,
        fontSize: { xs: 16, sm: 18 },
        lineHeight: 1.35,
        textAlign: "center",
        pointerEvents: "none",
        border: `2px solid ${colors.sun.main}`,
      }}
    >
      {line}
    </Box>
  );
}
