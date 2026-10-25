"use client";
import { useEffect } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { buddyLine } from "@trailbuddies/content";
import { t } from "@trailbuddies/i18n";
import { useFamily } from "@/lib/store";
import { reportError } from "@/lib/errors";
import { salvage } from "@/lib/salvage";
import { speak } from "@/lib/speech";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";

/**
 * OFF-07: never a scary error. The buddy says "Oops, let's try that again", progress so far is
 * kept, and the error is reported without child data (lib/errors.js scrubs it).
 * @param {{ error?: Error, reset?: () => void, home?: string, line?: string, children?: React.ReactNode }} props
 */
export default function CalmError({ error, reset, home = "/play/map", line = "calm.oops", children }) {
  const buddy = useFamily((s) => s.learners.find((l) => l.id === s.activeId)?.buddy || "zip");
  const voice = useFamily((s) => s.settings.voice);
  const text = buddyLine(line);
  useEffect(() => {
    if (error) {
      salvage();
      reportError(error);
    }
    speak(text, { buddy, enabled: voice });
  }, [error, text, buddy, voice]);
  return (
    <Box
      component="main"
      role="alert"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2.5,
        p: 3,
        textAlign: "center",
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}
      >
        <Buddy id={buddy} mood="think" size={130} />
        <Bubble>{text}</Bubble>
      </Box>
      {children}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
        {reset && (
          <Button variant="contained" size="large" onClick={reset}>
            {t("calm.tryAgain")}
          </Button>
        )}
        <Button component={Link} href={home} variant="outlined" size="large" sx={{ borderWidth: 2 }}>
          {t("calm.backToMap")}
        </Button>
      </Box>
    </Box>
  );
}
