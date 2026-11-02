"use client";
import { useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { HELP_TOPICS } from "@trailbuddies/content";
import { deviceName } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { api } from "@/lib/account";
import { recentErrors } from "@/lib/errors";
import { APP_VERSION, RELEASE } from "@/lib/version";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";

/** What "include device diagnostics" sends: no names, media or progress (HLP-02). */
export function diagnostics() {
  const nav = typeof navigator === "undefined" ? {} : navigator;
  return {
    app_version: APP_VERSION,
    release: RELEASE,
    device: deviceName(nav.userAgent || ""),
    screen: typeof window === "undefined" ? "" : `${window.innerWidth}x${window.innerHeight}`,
    online: nav.onLine === false ? "offline" : "online",
    errors: recentErrors(),
  };
}

/** HLP-02 (P30): a message to support, with optional diagnostics and an emailed reference. */
export default function ContactSupport() {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const mode = useFamily((s) => s.mode);
  const email = useFamily((s) => s.user?.email || "");
  const [form, setForm] = useState({ topic: "other", subject: "", message: "", diag: true });
  const [state, setState] = useState({ ref: "", error: "", busy: false });
  if (!ready) return <Loading />;
  const diag = diagnostics();
  const send = async (e) => {
    e.preventDefault();
    setState({ ref: "", error: "", busy: true });
    try {
      const r = await api.contactSupport({
        topic: form.topic,
        subject: form.subject.trim(),
        message: form.message.trim(),
        diagnostics: form.diag ? diag : null,
      });
      setState({ ref: r.ref, error: "", busy: false });
    } catch (err) {
      setState({ ref: "", error: err.message, busy: false });
    }
  };
  return (
    <FamilyShell
      title={t("support.title")}
      sub={t("support.sub")}
      family={family}
      active="/family/settings"
      back="/family/help"
    >
      {state.ref ? (
        <Alert severity="success" role="status">
          {t("support.sent", { ref: state.ref, email })}
        </Alert>
      ) : mode !== "account" ? (
        <Alert severity="info">{t("support.demo")}</Alert>
      ) : (
        <Box
          component="form"
          onSubmit={send}
          noValidate
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.75,
            bgcolor: "background.paper",
            border: `2px solid ${colors.line}`,
            borderRadius: 4.5,
            p: { xs: 2, sm: 3 },
          }}
        >
          <TextField
            select
            label={t("support.topic")}
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
          >
            {HELP_TOPICS.map((x) => (
              <MenuItem key={x.id} value={x.id}>
                {x.title}
              </MenuItem>
            ))}
            <MenuItem value="other">{t("support.other")}</MenuItem>
          </TextField>
          <TextField
            label={t("support.subject")}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            label={t("support.message")}
            multiline
            minRows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 4000 } }}
            helperText={t("feedback.noNames")}
          />
          <FormControlLabel
            control={
              <Checkbox checked={form.diag} onChange={(e) => setForm({ ...form, diag: e.target.checked })} />
            }
            label={t("support.diag")}
          />
          {form.diag && (
            <Box
              component="dl"
              data-testid="diagnostics"
              sx={{ m: 0, p: 1.5, bgcolor: colors.sand, borderRadius: 3.5, fontSize: 14 }}
            >
              {Object.entries(diag).map(([k, v]) => (
                <Box key={k} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Box component="dt" sx={{ fontWeight: 800 }}>
                    {t(`support.diag.${k}`)}:
                  </Box>
                  <Box component="dd" sx={{ m: 0 }}>
                    {Array.isArray(v) ? v.join(", ") || t("support.none") : v}
                  </Box>
                </Box>
              ))}
              <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
                {t("support.diagNote")}
              </Typography>
            </Box>
          )}
          {state.error && <Alert severity="warning">{state.error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            disabled={state.busy || form.subject.trim().length < 3 || form.message.trim().length < 10}
            sx={{ alignSelf: "flex-start" }}
          >
            {t("support.send")}
          </Button>
        </Box>
      )}
      <Button component={Link} href="/family/help" sx={{ alignSelf: "flex-start" }}>
        {t("support.backToHelp")}
      </Button>
    </FamilyShell>
  );
}
