"use client";
import { useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors, avatarColors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { LEGAL } from "@trailbuddies/content";
import {
  ageFrom,
  bandForAge,
  firstNameOnly,
  MIN_AGE,
  formatDate,
  purgeDate,
  undoDaysLeft,
} from "@trailbuddies/domain";
import { useFamily, useFlag } from "@/lib/store";
import { requestExport, requestDeletion, undoDeletion, api } from "@/lib/account";
import LearnerAvatar from "@/components/LearnerAvatar";
import { Frame } from "./SettingsSections";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dialogPaper = {
  paper: { sx: { borderRadius: 5.5, p: { xs: 2, sm: 3 }, gap: 1.5, width: "100%", maxWidth: 480 } },
};

/** FAM-03: change a learner's nickname, colour or birth date. Progress is kept. */
function EditLearner({ learner, onClose }) {
  const updateLearner = useFamily((s) => s.updateLearner);
  const [form, setForm] = useState({
    name: learner.name,
    color: learner.color,
    month: String(learner.birth?.month || ""),
    year: String(learner.birth?.year || ""),
  });
  const [error, setError] = useState("");
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - MIN_AGE - 1919 }, (_, i) => thisYear - MIN_AGE - i);
  const nick = firstNameOnly(form.name);
  const birth = { year: Number(form.year), month: Number(form.month) };
  const band = form.year && form.month ? bandForAge(ageFrom(birth)) : null;
  const save = () => {
    if (!nick.name) return setError(t("start.learnerName"));
    if (ageFrom(birth) < MIN_AGE) return setError(t("start.tooYoung"));
    updateLearner(learner.id, { name: nick.name, color: form.color, birth });
    onClose();
  };
  return (
    <Dialog open onClose={onClose} aria-labelledby="edit-learner" slotProps={dialogPaper}>
      <Typography id="edit-learner" variant="h5" component="h2">
        {t("learners.editTitle", { name: learner.name })}
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      <TextField
        label={t("start.learnerName")}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        autoComplete="off"
        slotProps={{ htmlInput: { maxLength: 40 } }}
        helperText={nick.trimmed ? t("start.nicknameEnough", { name: nick.name }) : " "}
      />
      <Box sx={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 1.5 }}>
        <TextField
          select
          label={t("start.birthMonth")}
          value={form.month}
          onChange={(e) => setForm({ ...form, month: e.target.value })}
        >
          {MONTHS.map((m, i) => (
            <MenuItem key={m} value={String(i + 1)}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t("start.birthYear")}
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
        >
          {years.map((y) => (
            <MenuItem key={y} value={String(y)}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {band && (
        <Typography sx={{ fontSize: 14, color: "text.secondary" }} data-testid="new-band">
          {t("learners.bandNow", { band: t(`band.${band}`) })}
        </Typography>
      )}
      <Box
        role="radiogroup"
        aria-label={t("start.colour")}
        sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
      >
        {Object.keys(avatarColors).map((c) => (
          <Box
            key={c}
            component="button"
            type="button"
            role="radio"
            aria-checked={form.color === c}
            aria-label={c}
            onClick={() => setForm({ ...form, color: c })}
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: avatarColors[c],
              border: `3px solid ${form.color === c ? colors.ink : "#fff"}`,
              boxShadow: form.color === c ? `0 0 0 2px ${avatarColors[c]}` : "none",
              cursor: "pointer",
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" onClick={save}>
          {t("learners.save")}
        </Button>
      </Box>
    </Dialog>
  );
}

/** FAM-03: removing asks twice, then waits 7 days so it can be undone. */
function RemoveLearner({ learner, onClose }) {
  const scheduleRemoval = useFamily((s) => s.scheduleRemoval);
  const [sure, setSure] = useState(false);
  return (
    <Dialog open onClose={onClose} aria-labelledby="remove-learner" slotProps={dialogPaper}>
      <Typography id="remove-learner" variant="h5" component="h2">
        {sure
          ? t("learners.removeSure", { name: learner.name })
          : t("learners.removeTitle", { name: learner.name })}
      </Typography>
      <Typography>
        {sure ? t("learners.removeSureSub") : t("learners.removeSub", { name: learner.name })}
      </Typography>
      <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={onClose}>
          {t("learners.keep", { name: learner.name })}
        </Button>
        {sure ? (
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              scheduleRemoval(learner.id);
              onClose();
            }}
          >
            {t("learners.removeNow")}
          </Button>
        ) : (
          <Button variant="contained" color="error" onClick={() => setSure(true)}>
            {t("learners.remove")}
          </Button>
        )}
      </Box>
    </Dialog>
  );
}

/** FAM-03: every learner with Edit and Remove, and the ones waiting to be deleted with Undo. */
export function LearnersSection({ disabled }) {
  const learners = useFamily((s) => s.learners);
  const removing = useFamily((s) => s.removing);
  const undoRemoval = useFamily((s) => s.undoRemoval);
  const country = useFamily((s) => s.family?.country);
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const row = {
    display: "flex",
    alignItems: "center",
    gap: 1.5,
    flexWrap: "wrap",
    py: 1.25,
    borderBottom: `1px solid ${colors.line}`,
    "&:last-of-type": { borderBottom: 0 },
  };
  return (
    <Frame title={t("learners.title")} sub={t("learners.sub")}>
      {learners.map((l) => (
        <Box key={l.id} sx={row} data-learner={l.name}>
          <LearnerAvatar learner={l} size={44} />
          <Box sx={{ flex: 1, minWidth: 120 }}>
            <Typography sx={{ fontWeight: 800 }}>{l.name}</Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
              {MONTHS[(l.birth?.month || 1) - 1]} {l.birth?.year}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            sx={{ borderWidth: 2 }}
            disabled={disabled}
            onClick={() => setEdit(l)}
            aria-label={t("learners.editTitle", { name: l.name })}
          >
            {t("learners.edit")}
          </Button>
          <Button
            color="error"
            disabled={disabled}
            onClick={() => setRemove(l)}
            aria-label={t("learners.removeTitle", { name: l.name })}
          >
            {t("learners.remove")}
          </Button>
        </Box>
      ))}
      {removing.map((l) => (
        <Box key={l.id} sx={{ ...row, opacity: 0.85 }} data-removing={l.name}>
          <LearnerAvatar learner={l} size={44} />
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Typography sx={{ fontWeight: 800 }}>{l.name}</Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
              {t("learners.deletedOn", {
                date: formatDate(purgeDate(l.removing_at), country),
                days: undoDaysLeft(l.removing_at),
              })}
            </Typography>
          </Box>
          <Button variant="contained" disabled={disabled} onClick={() => undoRemoval(l.id)}>
            {t("learners.undo", { name: l.name })}
          </Button>
        </Box>
      ))}
      {edit && <EditLearner learner={edit} onClose={() => setEdit(null)} />}
      {remove && <RemoveLearner learner={remove} onClose={() => setRemove(null)} />}
    </Frame>
  );
}

/** SAF-10, SAF-03, SAF-04: the policy, download our data, delete our family. */
export function PrivacySection() {
  const mode = useFamily((s) => s.mode);
  const family = useFamily((s) => s.family);
  const email = useFamily((s) => s.user?.email || "");
  const [exportState, setExportState] = useState("");
  const [deleteState, setDeleteState] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const account = mode === "account";
  const owner = family?.role === "owner";
  const parent = owner || family?.role === "parent";
  const pending = family?.deletion?.purge_after;

  const doExport = async () => {
    setError("");
    setExportState("busy");
    try {
      await requestExport();
      setExportState("sent");
    } catch (e) {
      setError(e.message);
      setExportState("");
    }
  };
  const doDelete = async () => {
    setError("");
    setConfirm(false);
    try {
      await requestDeletion();
      setDeleteState("sent");
    } catch (e) {
      setError(e.message);
    }
  };
  const keep = async () => {
    setError("");
    try {
      await undoDeletion();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Frame title={t("privacy.title")} sub={t("legal.version", { version: LEGAL.version, date: LEGAL.date })}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {pending && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={keep} sx={{ fontWeight: 800 }}>
                {t("privacy.keepFamily")}
              </Button>
            }
          >
            {t("privacy.deletingOn", { date: formatDate(new Date(pending), family?.country) })}
          </Alert>
        )}
        {error && <Alert severity="warning">{error}</Alert>}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button component={Link} href="/privacy" variant="outlined" sx={{ borderWidth: 2 }}>
            {t("privacy.readPolicy")}
          </Button>
          <Button component={Link} href="/terms" variant="outlined" sx={{ borderWidth: 2 }}>
            {t("legal.termsTitle")}
          </Button>
        </Box>
        {!LEGAL.reviewed && (
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("legal.draftShort")}</Typography>
        )}

        <Box sx={{ borderTop: `1px solid ${colors.line}`, pt: 1.5 }}>
          <Typography sx={{ fontWeight: 800 }}>{t("privacy.exportTitle")}</Typography>
          <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 1 }}>
            {t("privacy.exportSub")}
          </Typography>
          {!account ? (
            <Typography sx={{ fontSize: 14 }}>{t("privacy.demoNote")}</Typography>
          ) : exportState === "sent" ? (
            <Alert severity="success">{t("privacy.exportSent", { email })}</Alert>
          ) : (
            <Button variant="contained" onClick={doExport} disabled={!parent || exportState === "busy"}>
              {exportState === "busy" ? t("privacy.exportBusy") : t("privacy.exportButton")}
            </Button>
          )}
        </Box>

        <Box sx={{ borderTop: `1px solid ${colors.line}`, pt: 1.5 }}>
          <Typography sx={{ fontWeight: 800 }}>{t("privacy.deleteTitle")}</Typography>
          <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 1 }}>
            {t("privacy.deleteSub")}
          </Typography>
          {!account ? (
            <Typography sx={{ fontSize: 14 }}>{t("privacy.demoNote")}</Typography>
          ) : deleteState === "sent" ? (
            <Alert severity="info">{t("privacy.deleteSent")}</Alert>
          ) : (
            !pending && (
              <Button
                variant="outlined"
                color="error"
                sx={{ borderWidth: 2 }}
                disabled={!owner}
                onClick={() => setConfirm(true)}
              >
                {t("privacy.deleteButton")}
              </Button>
            )
          )}
          {account && !owner && (
            <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
              {t("privacy.ownerOnly")}
            </Typography>
          )}
        </Box>
      </Box>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        aria-labelledby="delete-family"
        slotProps={dialogPaper}
      >
        <Typography id="delete-family" variant="h5" component="h2">
          {t("privacy.deleteAsk")}
        </Typography>
        <Typography>{t("privacy.deleteAskSub")}</Typography>
        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={() => setConfirm(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={doDelete}>
            {t("privacy.sendLink")}
          </Button>
        </Box>
      </Dialog>
    </Frame>
  );
}

/** Closed beta: join with an invite code, and the beta questions (flag beta-faq). */
export function BetaSection() {
  const mode = useFamily((s) => s.mode);
  const family = useFamily((s) => s.family);
  const faq = useFlag("beta-faq");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const inBeta = (family?.cohorts || []).includes("beta") || mode === "demo";
  const join = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await api.joinBeta(family.id, code.trim());
      useFamily.setState((s) => ({ family: { ...s.family, cohorts: r.cohorts, flags: r.flags } }));
      setMsg({ ok: true, text: t("beta.joined") });
      setCode("");
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };
  return (
    <Frame title={t("beta.title")} sub={inBeta ? t("beta.inBeta") : t("beta.sub")}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {msg && <Alert severity={msg.ok ? "success" : "warning"}>{msg.text}</Alert>}
        {mode === "account" && !inBeta && (
          <Box component="form" onSubmit={join} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              label={t("beta.code")}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              slotProps={{ htmlInput: { maxLength: 16, autoCapitalize: "characters" } }}
              sx={{ flex: 1, minWidth: 180 }}
            />
            <Button type="submit" variant="contained" disabled={code.trim().length < 4}>
              {t("beta.join")}
            </Button>
          </Box>
        )}
        {faq && (
          <Button
            component={Link}
            href="/family/help"
            variant="outlined"
            sx={{ borderWidth: 2, alignSelf: "flex-start" }}
          >
            {t("beta.faqLink")}
          </Button>
        )}
      </Box>
    </Frame>
  );
}
