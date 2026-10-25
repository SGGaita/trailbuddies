"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { scrubPath } from "@trailbuddies/domain";
import { useFamily, useFlag } from "@/lib/store";
import { sendFeedback } from "@/lib/account";
import { APP_VERSION } from "@/lib/version";

const KINDS = ["idea", "problem", "praise"];

/** Beta feedback from the grown-up zone only (flag beta-feedback). Never shown to children. */
export default function FeedbackButton() {
  const on = useFlag("beta-feedback");
  const mode = useFamily((s) => s.mode);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("idea");
  const [message, setMessage] = useState("");
  const [state, setState] = useState({ step: "write", error: "" });
  if (!on) return null;
  const close = () => {
    setOpen(false);
    setState({ step: "write", error: "" });
  };
  const send = async () => {
    try {
      if (mode === "account")
        await sendFeedback({ kind, message: message.trim(), screen: scrubPath(path), version: APP_VERSION });
      setMessage("");
      setState({ step: "sent", error: "" });
    } catch (e) {
      setState({ step: "write", error: e.message });
    }
  };
  return (
    <>
      <Button variant="outlined" sx={{ borderWidth: 2, flex: "none" }} onClick={() => setOpen(true)}>
        {t("feedback.button")}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        aria-labelledby="feedback-title"
        slotProps={{
          paper: { sx: { borderRadius: 5.5, p: { xs: 2, sm: 3 }, gap: 1.5, width: "100%", maxWidth: 480 } },
        }}
      >
        <Typography id="feedback-title" variant="h5" component="h2">
          {t("feedback.title")}
        </Typography>
        {state.step === "sent" ? (
          <>
            <Alert severity="success">
              {mode === "account" ? t("feedback.thanks") : t("feedback.demoThanks")}
            </Alert>
            <Button variant="contained" onClick={close} sx={{ alignSelf: "flex-end" }}>
              {t("feedback.done")}
            </Button>
          </>
        ) : (
          <>
            <ToggleButtonGroup
              exclusive
              value={kind}
              onChange={(_, v) => v && setKind(v)}
              aria-label={t("feedback.kind")}
              sx={{ flexWrap: "wrap" }}
            >
              {KINDS.map((k) => (
                <ToggleButton key={k} value={k} sx={{ minHeight: 48, px: 2, fontWeight: 800 }}>
                  {t(`feedback.${k}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <TextField
              label={t("feedback.message")}
              multiline
              minRows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
              helperText={t("feedback.noNames")}
            />
            {state.error && <Alert severity="warning">{state.error}</Alert>}
            <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
              <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={close}>
                {t("common.cancel")}
              </Button>
              <Button variant="contained" onClick={send} disabled={message.trim().length < 3}>
                {t("feedback.send")}
              </Button>
            </Box>
          </>
        )}
      </Dialog>
    </>
  );
}
