"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import { t } from "@trailbuddies/i18n";
import { api } from "@/lib/account";
import OnboardingShell from "./OnboardingShell";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Step 2: email magic link, or Google when it's set up. */
export default function Account() {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") === "google" ? t("start.googleFailed") : "");
  const [google, setGoogle] = useState(false);

  useEffect(() => {
    api
      .authConfig()
      .then((c) => setGoogle(!!c.google))
      .catch(() => setGoogle(false));
  }, []);

  const send = async (e) => {
    e?.preventDefault();
    if (!EMAIL.test(email.trim())) return setError(t("start.email"));
    setBusy(true);
    setError("");
    try {
      await api.magicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <OnboardingShell
        step={2}
        title={t("start.checkEmail")}
        sub={t("start.checkEmailSub", { email: email.trim() })}
        back="/start"
      >
        <Box sx={{ fontSize: 64, textAlign: "center" }} aria-hidden="true">
          📬
        </Box>
        <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={send} disabled={busy}>
          {t("start.resend")}
        </Button>
        <Button onClick={() => setSent(false)}>{t("start.differentEmail")}</Button>
      </OnboardingShell>
    );

  return (
    <OnboardingShell step={2} title={t("start.accountTitle")} sub={t("start.accountSub")} back="/start">
      {error && <Alert severity="warning">{error}</Alert>}
      <Box
        component="form"
        onSubmit={send}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        noValidate
      >
        <TextField
          label={t("start.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoFocus
        />
        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {t("start.sendLink")}
        </Button>
      </Box>
      {google && (
        <>
          <Divider>
            <Typography sx={{ color: "text.secondary" }}>{t("start.or")}</Typography>
          </Divider>
          <Button
            variant="outlined"
            size="large"
            sx={{ borderWidth: 2 }}
            onClick={() => router.push("/api/auth/google/start")}
          >
            {t("start.google")}
          </Button>
        </>
      )}
    </OnboardingShell>
  );
}
