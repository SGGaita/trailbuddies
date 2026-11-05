"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getReadyUnits } from "@trailbuddies/content";
import { assignmentStatus, studentName, targetLabel, targetsOf, isOverdue } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { api } from "@/lib/account";
import { lessonsTotal } from "@/lib/classWork";
import TeachShell from "@/components/shell/TeachShell";
import Loading from "@/components/Loading";
import { useTeachClass, ClassPicker } from "./classPick";

const NONE = [];

export const card = {
  bgcolor: "background.paper",
  border: `2px solid ${colors.line}`,
  borderRadius: 4.5,
  p: { xs: 2, sm: 2.5 },
};

export const dateLabel = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const pickSx = (on) => ({
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 0.25,
  p: 1.25,
  borderRadius: 4.5,
  border: `2px solid ${on ? colors.leaf.main : colors.line}`,
  bgcolor: on ? colors.leaf.soft : "background.paper",
  color: "text.primary",
  cursor: "pointer",
  font: "inherit",
  minHeight: 64,
  "&:hover, &:focus-visible": { borderColor: colors.leaf.main },
});

/** T03 Assign work (ASN-01, CLS-07): a unit or one of my lessons, for whom, and when. */
export default function AssignWork() {
  const ready = useHydrated();
  const { id, classes, cls, error } = useTeachClass();
  // Select each value on its own: a selector that makes a new [] each time loops forever.
  const lessons = useFamily((s) => s.lessons);
  const mode = useFamily((s) => s.mode);
  const myLessons = mode === "account" ? lessons : NONE;
  const [work, setWork] = useState(
    /** @type {null | { kind: "unit" | "custom", id: string, title: string }} */ (null),
  );
  const [who, setWho] = useState("class");
  const [chosen, setChosen] = useState(/** @type {string[]} */ ([]));
  const [due, setDue] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState(/** @type {any} */ (null));
  const [busy, setBusy] = useState(false);

  const refresh = useMemo(
    () => () =>
      id
        ? api
            .classProgress(id)
            .then(setProgress)
            .catch(() => setProgress(null))
        : Promise.resolve(),
    [id],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!ready || (!cls && !error && id)) return <Loading />;
  if (!id)
    return (
      <TeachShell title={t("teach.assignTitle")} active="/teach/assign">
        <Alert severity="info">
          <Link href="/teach">{t("teach.noClassYet")}</Link>
        </Alert>
      </TeachShell>
    );
  if (!cls)
    return (
      <TeachShell title={t("teach.assignTitle")} active="/teach/assign">
        <Alert severity="warning">{error}</Alert>
      </TeachShell>
    );

  const groups = cls.groups || [];
  const target =
    who === "class"
      ? { type: "class" }
      : who === "pick"
        ? { type: "students", student_ids: chosen }
        : { type: "group", group_id: who };
  const to = targetsOf({ target }, cls.roster, groups);
  const names = Object.fromEntries(cls.roster.map((s) => [s.id, studentName(s)]));
  const assign = async () => {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const body =
        work.kind === "unit"
          ? { kind: "unit", unit_id: work.id, title: work.title }
          : { kind: "custom", lesson_id: work.id };
      const a = await api.assign(cls.id, { ...body, target, due_on: due || null });
      setMsg(t("teach.assigned", { title: a.title, n: a.to.length }));
      setWork(null);
      await refresh();
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };
  const open = progress?.assignments || [];
  const doneCount = (a) =>
    a.to.filter(
      (sid) =>
        assignmentStatus(
          a,
          (progress?.events || []).filter((e) => e.learnerId === sid),
          lessonsTotal(a),
        ).done,
    ).length;

  return (
    <TeachShell title={t("teach.assignTitle")} sub={t("teach.assignSub")} active="/teach/assign">
      <ClassPicker id={id} classes={classes} />
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) minmax(0, 1fr)" },
          alignItems: "start",
        }}
      >
        <Box
          component="section"
          aria-label={t("teach.units")}
          sx={{ ...card, display: "flex", flexDirection: "column", gap: 2 }}
        >
          {getSubjects().map((s) => {
            const units = getReadyUnits(s.id);
            if (!units.length) return null;
            return (
              <Box key={s.id}>
                <Typography component="h2" sx={{ fontWeight: 800, mb: 0.75 }}>
                  {s.name}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(3, minmax(0, 1fr))",
                    },
                  }}
                >
                  {units.map((u) => {
                    const on = work?.kind === "unit" && work.id === u.id;
                    return (
                      <Box
                        key={u.id}
                        component="button"
                        type="button"
                        aria-pressed={on}
                        onClick={() => setWork({ kind: "unit", id: u.id, title: u.title })}
                        sx={pickSx(on)}
                      >
                        <Typography sx={{ fontWeight: 800 }}>{u.title}</Typography>
                        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                          {t("teach.lessonsN", { n: u.lessons.length })}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
          <Box>
            <Typography component="h2" sx={{ fontWeight: 800, mb: 0.75 }}>
              {t("teach.myLessons")}
            </Typography>
            {myLessons.length === 0 && (
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                {t("teach.myLessonsNone")}
              </Typography>
            )}
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {myLessons.map((l) => {
                const on = work?.kind === "custom" && work.id === l.id;
                return (
                  <Box
                    key={l.id}
                    component="button"
                    type="button"
                    aria-pressed={on}
                    onClick={() => setWork({ kind: "custom", id: l.id, title: l.title })}
                    sx={pickSx(on)}
                  >
                    <Typography sx={{ fontWeight: 800 }}>{l.title}</Typography>
                    <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                      {t("builder.cardsN", { n: l.cards.length })}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <Box
            component="section"
            aria-label={t("teach.assignTitle")}
            sx={{ ...card, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            <Typography component="h2" variant="h6">
              {work ? work.title : t("teach.pickWork")}
            </Typography>
            <Box>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }} id="who">
                {t("teach.who")}
              </Typography>
              <ToggleButtonGroup
                aria-labelledby="who"
                exclusive
                value={who}
                onChange={(_, v) => v && setWho(v)}
                sx={{
                  flexWrap: "wrap",
                  gap: 0.5,
                  "& .MuiToggleButton-root": {
                    borderRadius: "16px !important",
                    border: `2px solid ${colors.line} !important`,
                    textTransform: "none",
                    fontWeight: 700,
                  },
                }}
              >
                <ToggleButton value="class">{t("teach.wholeClass")}</ToggleButton>
                {groups.map((g) => (
                  <ToggleButton key={g.id} value={g.id}>
                    {g.name}
                  </ToggleButton>
                ))}
                <ToggleButton value="pick">{t("teach.chooseChildren")}</ToggleButton>
              </ToggleButtonGroup>
              <Box sx={{ mt: 0.5 }}>
                <Link href={`/teach/class?id=${cls.id}#groups`} style={{ fontSize: 14 }}>
                  {t("teach.groups")}
                </Link>
              </Box>
            </Box>
            {who === "pick" ? (
              <Box
                sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}
                role="group"
                aria-label={t("teach.chooseChildren")}
              >
                {cls.roster.map((s) => {
                  const on = chosen.includes(s.id);
                  return (
                    <Chip
                      key={s.id}
                      label={studentName(s)}
                      aria-pressed={on}
                      color={on ? "primary" : "default"}
                      variant={on ? "filled" : "outlined"}
                      onClick={() => setChosen(on ? chosen.filter((x) => x !== s.id) : [...chosen, s.id])}
                    />
                  );
                })}
              </Box>
            ) : (
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                {to.map((sid) => names[sid]).join(", ")}
              </Typography>
            )}
            <Box>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{t("teach.due")}</Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Button
                  variant={due ? "outlined" : "contained"}
                  onClick={() => setDue("")}
                  sx={{ borderWidth: 2 }}
                >
                  {t("teach.noDate")}
                </Button>
                <TextField
                  type="date"
                  size="small"
                  label={t("teach.dueDate")}
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            </Box>
            {err && <Alert severity="warning">{err}</Alert>}
            {msg && (
              <Alert severity="success" role="status">
                {msg}
              </Alert>
            )}
            <Button variant="contained" size="large" disabled={!work || !to.length || busy} onClick={assign}>
              {to.length === 1 ? t("teach.assignToOne") : t("teach.assignTo", { n: to.length })}
            </Button>
          </Box>

          <Box
            component="section"
            aria-label={t("teach.openWork")}
            sx={{ ...card, display: "flex", flexDirection: "column", gap: 1 }}
          >
            <Typography component="h2" variant="h6">
              {t("teach.openWork")}
            </Typography>
            {open.length === 0 && (
              <Typography sx={{ color: "text.secondary" }}>{t("teach.noWork")}</Typography>
            )}
            {open.map((a) => (
              <Box
                key={a.id}
                data-open-work={a.title}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.75,
                  borderBottom: `1px solid ${colors.line}`,
                  "&:last-of-type": { borderBottom: 0 },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }}>{a.title}</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                    {targetLabel(a, groups, names) ?? t("teach.wholeClass")} ·{" "}
                    {a.due_on ? t("teach.dueOn", { date: dateLabel(a.due_on) }) : t("teach.noDue")}
                    {isOverdue(a) ? ` · ${t("teach.overdue")}` : ""} ·{" "}
                    {t("teach.doneN", { done: doneCount(a), n: a.to.length })}
                  </Typography>
                </Box>
                <Button
                  aria-label={t("teach.removeWork", { title: a.title })}
                  onClick={async () => {
                    await api.unassign(cls.id, a.id);
                    await refresh();
                  }}
                >
                  {t("teach.remove")}
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </TeachShell>
  );
}
