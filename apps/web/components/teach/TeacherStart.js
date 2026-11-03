"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { useFamily, useHydrated } from "@/lib/store";
import { api, refreshAccount } from "@/lib/account";
import Loading from "@/components/Loading";
import OnboardingShell from "@/components/onboarding/OnboardingShell";

/** ONB-13 (T00): a teacher's name as children say it, and their school. */
export default function TeacherStart() {
  const ready = useHydrated();
  const router = useRouter();
  const user = useFamily((s) => s.user);
  const [name, setName] = useState(user?.name || "");
  const [school, setSchool] = useState("");
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ready) return <Loading />;
  if (!user) {
    router.replace("/start/account");
    return <Loading />;
  }
  const done = async () => {
    try {
      localStorage.removeItem("tb_intent");
    } catch {
      /* fine */
    }
    await refreshAccount();
    router.push("/teach");
  };
  const send = async (extra = {}) => {
    setBusy(true);
    setError("");
    try {
      if (name.trim() && name.trim() !== user.name) await api.updateMe(name.trim());
      const r = await api.becomeTeacher({ school_name: school.trim(), ...extra });
      if (r.offer && !extra.join_school && !extra.separate) {
        setOffer(r.offer);
        setBusy(false);
        return;
      }
      await done();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <OnboardingShell title={t("teach.startTitle")} sub={t("teach.startSub")} back="/start">
      {error && <Alert severity="warning">{error}</Alert>}
      {offer ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="h6" component="h2">
            {t("teach.offer", { school: offer.name })}
          </Typography>
          <Typography>{t("teach.offerSub", { domain: offer.domain })}</Typography>
          <Button
            variant="contained"
            size="large"
            disabled={busy}
            onClick={() => send({ join_school: offer.id })}
          >
            {t("teach.join", { school: offer.name })}
          </Button>
          <Button
            variant="outlined"
            sx={{ borderWidth: 2 }}
            disabled={busy}
            onClick={() => send({ separate: true })}
          >
            {t("teach.separate")}
          </Button>
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}
        >
          <TextField
            label={t("teach.yourName")}
            helperText={t("teach.yourNameHelp")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            label={t("teach.school")}
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={busy || school.trim().length < 2 || !name.trim()}
          >
            {t("start.continue")}
          </Button>
        </Box>
      )}
    </OnboardingShell>
  );
}
