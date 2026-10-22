"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { t } from "@trailbuddies/i18n";
import { api, signedIn, setupStep } from "@/lib/account";
import { useFamily } from "@/lib/store";
import Loading from "@/components/Loading";
import OnboardingShell from "./OnboardingShell";

/** Where to go after signing in: the next setup step, or the profile picker. */
function landing() {
  const s = useFamily.getState();
  if (sessionStorage.getItem("tb_reset_pin") === "1" && s.family) {
    sessionStorage.removeItem("tb_reset_pin");
    s.setPin(null);
  }
  s.unlockGate(); // just proved they own the email
  return setupStep(s) || "/play";
}

/**
 * The magic link lands here (/auth/verify?token=…); Google lands on /auth/done with the
 * cookie already set. Either way, load the account and move on.
 * @param {{ google?: boolean }} props
 */
export default function SignedIn({ google = false }) {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      try {
        if (!google) await api.verify(params.get("token") || "");
        const r = await signedIn();
        if (r !== "ok") throw new Error("Couldn't reach Trailbuddies. Check your connection.");
        router.replace(landing());
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [google, params, router]);

  if (!error) return <Loading label={t("start.verifying")} />;
  return (
    <OnboardingShell title={t("start.linkFailed")} mood="think" back="/start/account">
      <Alert severity="warning">{error}</Alert>
      <Button variant="contained" onClick={() => router.push("/start/account")}>
        {t("start.resend")}
      </Button>
    </OnboardingShell>
  );
}
