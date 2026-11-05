"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { CLASS_BANDS, teacherChecklist } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { api, refreshAccount } from "@/lib/account";
import TeachShell from "@/components/shell/TeachShell";
import Loading from "@/components/Loading";

const card = {
  bgcolor: "background.paper",
  border: `2px solid ${colors.line}`,
  borderRadius: 4.5,
  p: { xs: 2, sm: 2.5 },
};

/** CLS-01: name, year group and age band. */
function NewClass({ onClose, onMade }) {
  const [form, setForm] = useState({ name: "", year_group: "", band: "sprout" });
  const [error, setError] = useState("");
  const make = async (e) => {
    e.preventDefault();
    try {
      onMade(await api.createClass({ ...form, name: form.name.trim() }));
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby="new-class"
      slotProps={{
        paper: { sx: { borderRadius: 5.5, p: { xs: 2, sm: 3 }, gap: 1.5, width: "100%", maxWidth: 460 } },
      }}
    >
      <Typography id="new-class" variant="h5" component="h2">
        {t("teach.newClass")}
      </Typography>
      {error && <Alert severity="warning">{error}</Alert>}
      <Box component="form" onSubmit={make} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <TextField
          label={t("teach.className")}
          placeholder="Class 1B"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <TextField
          label={t("teach.yearGroup")}
          placeholder="Grade 1"
          value={form.year_group}
          onChange={(e) => setForm({ ...form, year_group: e.target.value })}
        />
        <TextField
          select
          label={t("teach.band")}
          value={form.band}
          onChange={(e) => setForm({ ...form, band: e.target.value })}
        >
          {CLASS_BANDS.map((b) => (
            <MenuItem key={b} value={b}>
              {t(`band.${b}`)}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
          <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={!form.name.trim()}>
            {t("teach.create")}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

/** HLP-03: five first-week steps that tick themselves off. */
function Checklist({ teacher }) {
  const steps = teacherChecklist({
    classes: (teacher.classes || []).map((c) => ({
      students: c.students,
      printed: teacher.tips?.printed,
      played: teacher.tips?.played,
      viewed: teacher.tips?.viewed,
      assigned: teacher.tips?.assigned,
    })),
  });
  const done = steps.filter((s) => s.done).length;
  if (teacher.tips?.dismissed || done === steps.filter((s) => !s.soon).length) return null;
  return (
    <Box component="section" aria-label={t("teach.checklist")} sx={{ ...card, bgcolor: colors.sun.soft }}>
      <Typography component="h2" variant="h6">
        {t("teach.checklist")}
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 1 }}>
        {t("teach.checklistSub", { done, total: steps.length })}
      </Typography>
      <Box
        component="ol"
        sx={{ m: 0, pl: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 0.75 }}
      >
        {steps.map((s) => (
          <Box
            component="li"
            key={s.id}
            data-step={s.id}
            data-done={s.done ? "yes" : "no"}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                bgcolor: s.done ? colors.leaf.main : "background.paper",
                color: s.done ? "#fff" : "text.primary",
                border: `2px solid ${s.done ? colors.leaf.main : colors.line}`,
              }}
            >
              {s.done ? "✓" : ""}
            </Box>
            <Typography sx={{ fontWeight: 700, textDecoration: s.done ? "line-through" : "none" }}>
              {t(`teach.step.${s.id}`)}
              {s.done ? ` (${t("teach.done")})` : ""}
            </Typography>
            {s.soon && <Chip size="small" label={t("firstSteps.soon")} />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** T01 Teacher home: classes, a new-class button and the first-week checklist. */
export default function TeacherHome() {
  const ready = useHydrated();
  const router = useRouter();
  const teacher = useFamily((s) => s.teacher);
  const user = useFamily((s) => s.user);
  const mode = useFamily((s) => s.mode);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const go = ready ? (!user ? "/start" : !teacher ? "/teach/start" : null) : null;
  useEffect(() => {
    if (go) router.replace(go);
    else if (ready && mode === "account") refreshAccount().catch(() => setError("offline"));
  }, [go, ready, mode, router]);
  if (!ready || go || !teacher) return <Loading />;
  const classes = teacher.classes || [];
  return (
    <TeachShell
      title={t("teach.hello", { name: user?.name || "" })}
      sub={teacher.school?.name}
      active="/teach"
    >
      {error && <Alert severity="info">{t("teach.offline")}</Alert>}
      {classes.length === 0 && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" onClick={() => setCreating(true)}>
              {t("teach.newClass")}
            </Button>
          }
        >
          {t("teach.firstClass")}
        </Alert>
      )}
      <Checklist teacher={teacher} />
      <Box
        component="section"
        aria-label={t("teach.classes")}
        sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography component="h2" variant="h5" sx={{ flex: 1 }}>
            {t("teach.classes")}
          </Typography>
          <Button variant="contained" onClick={() => setCreating(true)}>
            {t("teach.newClass")}
          </Button>
        </Box>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 320px))",
            },
          }}
        >
          {classes.map((c) => (
            <Box
              key={c.id}
              component={Link}
              href={`/teach/class?id=${c.id}`}
              sx={{
                ...card,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                color: "text.primary",
                textDecoration: "none",
                "&:hover": { borderColor: colors.leaf.main },
              }}
            >
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>
                {c.name}
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>
                {[c.year_group, t(`band.${c.band}`)].filter(Boolean).join(" · ")}
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {t("teach.studentsCount", { n: c.students })} · {t("teach.code")}: <b>{c.join_code}</b>
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      {creating && (
        <NewClass
          onClose={() => setCreating(false)}
          onMade={async (c) => {
            setCreating(false);
            await refreshAccount();
            router.push(`/teach/class?id=${c.id}`);
          }}
        />
      )}
    </TeachShell>
  );
}
