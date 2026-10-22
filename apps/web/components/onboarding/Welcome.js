"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { useFamily } from "@/lib/store";
import Buddy from "@/components/art/Buddy";
import OnboardingShell from "./OnboardingShell";

/** Step 1: welcome, meet the buddies, and choose parent, teacher or the demo. */
export default function Welcome() {
  const router = useRouter();
  const startDemo = useFamily((s) => s.startDemo);
  const [teacher, setTeacher] = useState(false);
  const demo = async () => {
    await startDemo();
    router.push("/play");
  };
  return (
    <OnboardingShell step={1} title={t("start.welcome")} sub={t("start.welcomeSub")} mood="cheer">
      <Box
        aria-hidden="true"
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: { xs: 1, sm: 2 },
          py: 1.5,
          bgcolor: colors.sand,
          borderRadius: 4.5,
        }}
      >
        {["zip", "tumi", "juma", "kiki"].map((b) => (
          <Buddy key={b} id={b} size={72} mood="cheer" />
        ))}
      </Box>
      <Button variant="contained" size="large" onClick={() => router.push("/start/account")}>
        {t("start.parent")}
      </Button>
      <Button variant="outlined" size="large" sx={{ borderWidth: 2 }} onClick={() => setTeacher(true)}>
        {t("start.teacher")}
      </Button>
      {teacher && (
        <Typography role="status" sx={{ color: "text.secondary", textAlign: "center" }}>
          {t("start.teacherSoon")}
        </Typography>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 1 }}>
        <Button onClick={() => router.push("/start/account")}>{t("start.haveAccount")}</Button>
        <Button onClick={demo}>{t("start.demo")}</Button>
      </Box>
    </OnboardingShell>
  );
}
