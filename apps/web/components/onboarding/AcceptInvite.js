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

/** /invite?token=…: a second parent or a carer joins the family (and is signed in). */
export default function AcceptInvite() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      try {
        await api.acceptInvite(params.get("token") || "");
        const r = await signedIn();
        if (r !== "ok") throw new Error("Couldn't reach Trailbuddies. Check your connection.");
        const s = useFamily.getState();
        s.unlockGate();
        router.replace(setupStep(s) || "/family");
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [params, router]);
  if (!error) return <Loading label={t("invite.title")} />;
  return (
    <OnboardingShell title={t("invite.failed")} mood="think">
      <Alert severity="warning">{error}</Alert>
      <Button variant="contained" onClick={() => router.push("/start")}>
        {t("gate.back")}
      </Button>
    </OnboardingShell>
  );
}
