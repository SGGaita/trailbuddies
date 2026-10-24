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
 * ACC-03 captions: while the buddy speaks, words that aren't already on screen show in a
 * caption at the top.
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
        // Words already on screen (a speech bubble, a heading) need no caption.
        const shown = (document.querySelector("main")?.innerText || "").replace(/\s+/g, " ");
        if (shown.includes(text.replace(/\s+/g, " ").trim())) return;
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
        // At the top, so it never covers a button the child needs.
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        zIndex: 1500,
        maxWidth: "min(640px, calc(100vw - 32px))",
        px: 2,
        py: 1,
        borderRadius: 3.5,
        bgcolor: "rgba(38,51,34,.88)",
        color: "#fff",
        fontWeight: 700,
        fontSize: { xs: 15, sm: 18 },
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
