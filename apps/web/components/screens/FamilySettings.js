"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getReadyUnits } from "@trailbuddies/content";
import { DIFFICULTY_SETTINGS, describeLevel } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearners } from "@/lib/store";
import { signOut, syncNow } from "@/lib/account";
import FamilyShell from "@/components/shell/FamilyShell";
import LearnerAvatar from "@/components/LearnerAvatar";
import Loading from "@/components/Loading";
import { FamilySettingsForm, PinSetup } from "@/components/SettingsForm";

const Section = ({ title, sub, children }) => (
  <Card sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography variant="h6" component="h2">
      {title}
    </Typography>
    {sub && <Typography sx={{ color: "text.secondary", mb: 1.5 }}>{sub}</Typography>}
    {children}
  </Card>
);

/** Account and sync status for this device. */
function AccountSection() {
  const router = useRouter();
  const mode = useFamily((s) => s.mode);
  const user = useFamily((s) => s.user);
  const sync = useFamily((s) => s.sync);
  const clear = useFamily((s) => s.clear);
  if (mode === "demo")
    return (
      <Section title={t("settings.account")} sub={t("settings.demo")}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={() => {
              clear();
              router.push("/start/account");
            }}
          >
            {t("start.parent")}
          </Button>
          <Button
            onClick={() => {
              clear();
              router.push("/start");
            }}
          >
            {t("settings.leaveDemo")}
          </Button>
        </Box>
      </Section>
    );
  const status =
    sync.state === "syncing"
      ? t("settings.syncing")
      : sync.state === "offline"
        ? t("settings.offline")
        : t("settings.sync");
  return (
    <Section title={t("settings.account")} sub={user ? t("settings.signedInAs", { email: user.email }) : ""}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }} role="status">
        <Box
          aria-hidden="true"
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: sync.state === "offline" ? colors.warn.main : colors.leaf.main,
          }}
        />
        <Typography sx={{ fontWeight: 700 }}>{status}</Typography>
        {sync.pending > 0 && (
          <Typography sx={{ color: "text.secondary" }}>
            · {t("settings.pending", { n: sync.pending })}
          </Typography>
        )}
        <Button size="small" onClick={() => syncNow()}>
          ↻
        </Button>
      </Box>
      <Button
        variant="outlined"
        sx={{ borderWidth: 2 }}
        onClick={async () => {
          await signOut();
          router.push("/start");
        }}
      >
        {t("settings.signOut")}
      </Button>
    </Section>
  );
}

/**
 * P11 Settings: account and sync, family settings (goal, limit, bedtime, voice, sound),
 * the grown-up PIN, and each learner's difficulty (Auto or a fixed level 1–3).
 */
export default function FamilySettings() {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const setDifficulty = useFamily((s) => s.setDifficulty);
  const learners = useLearners();
  if (!ready) return <Loading />;
  const subjects = getSubjects().filter((s) => getReadyUnits(s.id).length);

  return (
    <FamilyShell title={t("nav.settings")} family={family} active="/family/settings" back="/family">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 760 }}>
        <AccountSection />
        <Section title={t("start.settingsTitle")}>
          <FamilySettingsForm />
        </Section>
        <Card sx={{ p: { xs: 2, sm: 3 } }}>
          <PinSetup />
        </Card>
        <Section title={t("settings.difficulty")} sub={t("settings.difficultySub")}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {learners.map((l) => (
              <Box
                key={l.id}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 1.5,
                  pb: 2,
                  borderBottom: `1px solid ${colors.line}`,
                  "&:last-of-type": { borderBottom: 0, pb: 0 },
                }}
              >
                <LearnerAvatar learner={l} size={44} />
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography sx={{ fontWeight: 800 }}>{l.name}</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                    {subjects
                      .map(
                        (s) =>
                          `${s.name}: ${t("settings.levelNow", { level: describeLevel(l.levelFor(s.id)) })}`,
                      )
                      .join(" · ")}
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={l.difficulty || "auto"}
                  onChange={(_, v) => v && setDifficulty(l.id, v)}
                  aria-label={`${t("settings.difficulty")} for ${l.name}`}
                >
                  {DIFFICULTY_SETTINGS.map((d) => (
                    <ToggleButton key={d} value={d} sx={{ minWidth: 52, minHeight: 44, fontWeight: 800 }}>
                      {d === "auto" ? t("settings.auto") : d}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
            <Button component={Link} href="/start/learners" variant="outlined" sx={{ borderWidth: 2 }}>
              {t("start.addLearner")}
            </Button>
            <Button component={Link} href="/start/interests">
              {t("start.interestsTitle")}
            </Button>
          </Box>
        </Section>
      </Box>
    </FamilyShell>
  );
}
