"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { formatDate } from "@trailbuddies/domain";
import { api, refreshAccount } from "@/lib/account";
import { useFamily } from "@/lib/store";
import Buddy from "@/components/art/Buddy";

/** SAF-04: the link from the "Confirm: delete your family" email. One more tap confirms. */
export default function ConfirmDelete() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState({ step: "ask", date: null, error: "" });
  const confirm = async () => {
    try {
      const r = await api.confirmDeletion(token);
      setState({ step: "done", date: new Date(r.purge_after), error: "" });
      // Signed in on this device too: show the "Keep our family" banner in Settings straight away.
      if (useFamily.getState().mode === "account") refreshAccount();
    } catch (e) {
      setState({ step: "ask", date: null, error: e.message });
    }
  };
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 3,
        textAlign: "center",
      }}
    >
      <Buddy id="tumi" mood={state.step === "done" ? "happy" : "think"} size={110} />
      <Typography variant="h4" component="h1" sx={{ maxWidth: 560 }}>
        {state.step === "done" ? t("privacy.confirmedTitle") : t("privacy.confirmTitle")}
      </Typography>
      <Typography sx={{ maxWidth: 520 }}>
        {state.step === "done"
          ? t("privacy.confirmedSub", { date: formatDate(state.date) })
          : t("privacy.confirmSub")}
      </Typography>
      {state.error && <Alert severity="warning">{state.error}</Alert>}
      {state.step === "done" ? (
        <Button component={Link} href="/family/settings" variant="contained">
          {t("privacy.openSettings")}
        </Button>
      ) : (
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
          <Button component={Link} href="/family/settings" variant="outlined" sx={{ borderWidth: 2 }}>
            {t("privacy.keepFamily")}
          </Button>
          <Button variant="contained" color="error" onClick={confirm} disabled={!token}>
            {t("privacy.confirmButton")}
          </Button>
        </Box>
      )}
    </Box>
  );
}
