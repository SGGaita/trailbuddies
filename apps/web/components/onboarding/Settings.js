"use client";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { useSetupGuard } from "@/lib/guard";
import Loading from "@/components/Loading";
import { FamilySettingsForm, PinSetup } from "@/components/SettingsForm";
import OnboardingShell from "./OnboardingShell";

/** Step 6: family settings and the optional PIN. */
export default function Settings() {
  const ok = useSetupGuard({ allow: "/start/settings" });
  const router = useRouter();
  if (!ok) return <Loading />;
  return (
    <OnboardingShell
      step={6}
      title={t("start.settingsTitle")}
      sub={t("start.settingsSub")}
      back="/start/interests"
      wide
    >
      <FamilySettingsForm />
      <Box sx={{ p: 2, bgcolor: colors.sand, borderRadius: 4.5 }}>
        <PinSetup />
      </Box>
      <Button variant="contained" size="large" onClick={() => router.push("/start/handover")}>
        {t("start.continue")}
      </Button>
    </OnboardingShell>
  );
}
