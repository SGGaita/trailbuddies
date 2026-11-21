"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { REPORT_REASONS } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { api } from "@/lib/account";
import { useFamily } from "@/lib/store";

/**
 * SHR-05: report a lesson or badge imported from a code. The report goes to the safety team;
 * reports from three families suspend the code until it's reviewed. A grown-up's screen, so a
 * short note is allowed.
 * @param {{ shareId: string, what: "lesson" | "badge" }} props
 */
export default function ReportShare({ shareId, what }) {
  const familyId = useFamily((s) => s.family?.id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  if (!familyId) return null;
  const send = async () => {
    setError("");
    try {
      const r = await api.reportShare(shareId, familyId, reason, note.trim() || undefined);
      setSent(r.already ? t("report.already") : t("report.sent"));
      setOpen(false);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      {sent ? (
        <Alert severity="success" sx={{ borderRadius: 4 }}>
          {sent}
        </Alert>
      ) : (
        <Button variant="text" onClick={() => setOpen(true)} sx={{ alignSelf: "flex-start" }}>
          {t(`report.button.${what}`)}
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 5.5 } } }}>
        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
            {t("report.title")}
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>{t("report.sub")}</Typography>
          <RadioGroup value={reason} onChange={(e) => setReason(e.target.value)} aria-label={t("report.why")}>
            {REPORT_REASONS.map((r) => (
              <FormControlLabel key={r} value={r} control={<Radio />} label={t(`report.reason.${r}`)} />
            ))}
          </RadioGroup>
          <TextField
            label={t("report.note")}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            multiline
            minRows={2}
          />
          {error && <Alert severity="warning">{error}</Alert>}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="contained" color="error" disabled={!reason} onClick={send}>
              {t("report.send")}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
