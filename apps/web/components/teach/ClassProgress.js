"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { getUnit } from "@trailbuddies/content";
import {
  assignmentStatus,
  cellDetail,
  exportRows,
  heatLevel,
  strugglingItems,
  studentName,
  targetsOf,
  toCsv,
} from "@trailbuddies/domain";
import { useHydrated } from "@/lib/store";
import { api } from "@/lib/account";
import { lessonsTotal } from "@/lib/classWork";
import TeachShell from "@/components/shell/TeachShell";
import Loading from "@/components/Loading";
import { useTeachClass, ClassPicker } from "./classPick";
import { card, dateLabel } from "./AssignWork";

/** Cell colours (prototype T04): green secure, yellow getting there, coral needs help. */
export const HEAT = {
  secure: "#bfe6cc",
  getting: "#fdf0c4",
  help: "#f8d3c8",
  started: colors.sky.soft,
  none: colors.sand,
};

/** An item's label: from the unit, or the custom lesson's card. */
export function itemLabel(a, itemId) {
  if (a.kind === "custom") return a.lesson?.cards?.find((c) => c.id === itemId)?.label || itemId;
  return getUnit(a.unit_id)?.items?.find((i) => i.id === itemId)?.label || itemId;
}

/** Everything the screens need, worked out once: events per child and each cell's status. */
export function useClassData(cls, data) {
  return useMemo(() => {
    if (!cls || !data) return null;
    const byStudent = Object.fromEntries(cls.roster.map((s) => [s.id, []]));
    for (const e of data.events || []) byStudent[e.learnerId]?.push(e);
    const groups = data.groups || cls.groups || [];
    const assignments = data.assignments || [];
    const cells = {};
    for (const a of assignments) {
      const to = new Set(targetsOf(a, cls.roster, groups));
      for (const s of cls.roster) {
        if (!to.has(s.id)) continue;
        const status = assignmentStatus(a, byStudent[s.id], lessonsTotal(a));
        const detail = cellDetail(a, byStudent[s.id]);
        cells[`${s.id}/${a.id}`] = { status, detail, level: heatLevel(status) };
      }
    }
    return { byStudent, groups, assignments, cells };
  }, [cls, data]);
}

function Cell({ s, a, cell, onOpen }) {
  if (!cell)
    return (
      <Box
        component="td"
        sx={{ bgcolor: "background.paper", textAlign: "center", color: "text.disabled" }}
        aria-label={t("teach.notFor")}
      >
        ·
      </Box>
    );
  const { status, detail, level } = cell;
  const label = t("teach.cellLabel", {
    name: studentName(s),
    title: a.title,
    status: [
      status.done
        ? t("teach.cellStars", { stars: status.stars })
        : status.started
          ? t("teach.cellStarted", { done: status.lessonsDone, n: status.lessonsTotal })
          : t("teach.cellNone"),
      detail.weak.length ? t("teach.cellWeak", { n: detail.weak.length }) : "",
    ]
      .filter(Boolean)
      .join(", "),
  });
  return (
    <Box component="td" sx={{ p: 0, bgcolor: HEAT[level], borderBottom: `1px solid ${colors.line}` }}>
      <Box
        component="button"
        type="button"
        aria-label={label}
        data-level={level}
        onClick={onOpen}
        sx={{
          width: "100%",
          minWidth: 96,
          minHeight: 48,
          border: 0,
          bgcolor: "transparent",
          font: "inherit",
          fontWeight: 800,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.75,
          "&:focus-visible": { outline: `3px solid ${colors.leaf.main}`, outlineOffset: -3 },
        }}
      >
        <Box
          component="span"
          aria-hidden="true"
          sx={{ color: status.done ? colors.ink : "text.secondary", letterSpacing: ".05em" }}
        >
          {status.done
            ? "★".repeat(status.stars) || "–"
            : status.started
              ? `${status.lessonsDone}/${status.lessonsTotal}`
              : "–"}
        </Box>
        {detail.weak.length > 0 && (
          <Box
            component="span"
            aria-hidden="true"
            sx={{
              minWidth: 20,
              height: 20,
              px: 0.5,
              borderRadius: 999,
              bgcolor: colors.bad.main,
              color: "#fff",
              fontSize: 12,
              display: "grid",
              placeItems: "center",
            }}
          >
            {detail.weak.length}
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** ASN-02 scenario 2: a child's answers and weak items for one piece of work. */
function CellPanel({ s, a, cell, onClose }) {
  const { status, detail } = cell;
  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby="cell-title"
      slotProps={{
        paper: { sx: { borderRadius: 5.5, p: { xs: 2, sm: 3 }, gap: 1.25, width: "100%", maxWidth: 520 } },
      }}
    >
      <Typography id="cell-title" variant="h5" component="h2">
        {t("teach.cellTitle", { name: studentName(s), title: a.title })}
      </Typography>
      <Typography>
        {t("teach.lessonsDone", { done: status.lessonsDone, n: status.lessonsTotal })}
        {status.done ? ` · ${t("teach.cellStars", { stars: status.stars })}` : ""}
      </Typography>
      <Typography sx={{ fontWeight: 800 }}>{t("teach.answers")}</Typography>
      {detail.items.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>{t("teach.noAnswers")}</Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
          {detail.items.map((i) => (
            <Box
              component="li"
              key={i.itemId}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                py: 0.5,
                borderBottom: `1px solid ${colors.line}`,
              }}
            >
              <Typography sx={{ fontWeight: 700, flex: 1 }}>{itemLabel(a, i.itemId)}</Typography>
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                {t("teach.firstTryOf", { right: i.firstTry, tries: i.tries })}
              </Typography>
              {i.struggled && (
                <Chip
                  size="small"
                  label={t("teach.tricky")}
                  sx={{ bgcolor: colors.bad.soft, color: colors.bad.main, fontWeight: 800 }}
                />
              )}
            </Box>
          ))}
        </Box>
      )}
      <Button variant="contained" onClick={onClose} sx={{ alignSelf: "flex-end" }}>
        {t("feedback.done")}
      </Button>
    </Dialog>
  );
}

/** ASN-03: the hardest items in one piece of work, once enough children have finished it. */
function Hardest({ cls, d }) {
  const [pick, setPick] = useState("");
  const a = d.assignments.find((x) => x.id === pick) || d.assignments[0];
  if (!a) return null;
  const to = targetsOf(a, cls.roster, d.groups);
  const r = strugglingItems(
    a,
    Object.fromEntries(to.map((id) => [id, d.byStudent[id] || []])),
    lessonsTotal(a),
  );
  const names = Object.fromEntries(cls.roster.map((s) => [s.id, studentName(s)]));
  return (
    <Box
      component="section"
      aria-label={t("teach.hardest")}
      sx={{ ...card, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Typography component="h2" variant="h6" sx={{ flex: 1 }}>
          {t("teach.hardest")}
        </Typography>
        {d.assignments.length > 1 && (
          <TextField
            select
            size="small"
            label={t("teach.assignTitle")}
            value={a.id}
            onChange={(e) => setPick(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {d.assignments.map((x) => (
              <MenuItem key={x.id} value={x.id}>
                {x.title}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
      <Typography sx={{ fontWeight: 700 }}>{t("teach.hardestFor", { title: a.title })}</Typography>
      {!r.ready ? (
        <Typography sx={{ color: "text.secondary" }}>{t("teach.hardestWait", { n: r.finished })}</Typography>
      ) : r.items.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>{t("teach.hardestNone")}</Typography>
      ) : (
        <Box component="ol" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {r.items.map((i) => (
            <li key={i.itemId}>
              <Typography sx={{ fontWeight: 800 }}>
                {t("teach.hardestRow", { item: itemLabel(a, i.itemId), pct: Math.round(i.accuracy * 100) })}
              </Typography>
              {i.students.length > 0 && (
                <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                  {t("teach.struggling", { names: i.students.map((id) => names[id]).join(", ") })}
                </Typography>
              )}
            </li>
          ))}
        </Box>
      )}
    </Box>
  );
}

/** ASN-04: the CSV holds first names, assignments, stars and completion dates only. */
export function csvFor(cls, d) {
  const rows = exportRows({
    assignments: d.assignments,
    roster: cls.roster,
    groups: d.groups,
    byStudent: d.byStudent,
    lessonsTotal,
  });
  return toCsv([t("teach.csvName"), t("teach.csvWork"), t("teach.csvStars"), t("teach.csvDone")], rows, [
    "first_name",
    "assignment",
    "stars",
    "completed",
  ]);
}

/** T04 Class progress (ASN-02..04). */
export default function ClassProgress() {
  const ready = useHydrated();
  const { id, classes, cls, error } = useTeachClass();
  const [data, setData] = useState(/** @type {any} */ (null));
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(/** @type {null | { s: any, a: any }} */ (null));
  useEffect(() => {
    if (!id) return;
    api
      .classProgress(id)
      .then((r) => setData({ id, ...r }))
      .catch((e) => setLoadError(e.message));
  }, [id]);
  const current = data?.id === id ? data : null;
  const d = useClassData(cls, current);

  if (!ready || (id && !error && !loadError && (!cls || !d))) return <Loading />;
  if (!id || !cls)
    return (
      <TeachShell title={t("teach.progressTitle")} active="/teach/progress">
        <Alert severity={id ? "warning" : "info"}>
          {id ? error : <Link href="/teach">{t("teach.noClassYet")}</Link>}
        </Alert>
      </TeachShell>
    );
  if (!d)
    return (
      <TeachShell title={t("teach.progressTitle")} active="/teach/progress">
        <Alert severity="warning">{t("teach.offline")}</Alert>
      </TeachShell>
    );

  const download = () => {
    const blob = new Blob([csvFor(cls, d)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cls.name.replace(/[^\w-]+/g, "-")}-progress.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <TeachShell title={t("teach.progressTitle")} sub={t("teach.progressSub")} active="/teach/progress">
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <ClassPicker id={id} classes={classes} />
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          sx={{ borderWidth: 2 }}
          onClick={download}
          disabled={!d.assignments.length}
        >
          {t("teach.exportCsv")}
        </Button>
        <Button
          component={Link}
          href={`/teach/report?id=${cls.id}`}
          variant="outlined"
          sx={{ borderWidth: 2 }}
          disabled={!d.assignments.length}
        >
          {t("teach.printReport")}
        </Button>
      </Box>
      {d.assignments.length === 0 ? (
        <Box sx={card}>
          <Typography>
            <Link href={`/teach/assign?id=${cls.id}`}>{t("teach.noAssignments")}</Link>
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ ...card, p: 0, overflowX: "auto" }}>
            <Box
              component="table"
              sx={{ borderCollapse: "collapse", width: "100%", "& th, & td": { px: 1.5, py: 0.75 } }}
            >
              <thead>
                <tr>
                  <Box
                    component="th"
                    scope="col"
                    sx={{
                      textAlign: "left",
                      position: "sticky",
                      left: 0,
                      bgcolor: "background.paper",
                      zIndex: 1,
                    }}
                  >
                    {t("teach.student")}
                  </Box>
                  {d.assignments.map((a) => (
                    <Box
                      component="th"
                      scope="col"
                      key={a.id}
                      sx={{ textAlign: "center", fontSize: 14, minWidth: 110 }}
                    >
                      {a.title}
                      {a.due_on && (
                        <Box
                          component="span"
                          sx={{ display: "block", fontWeight: 400, color: "text.secondary", fontSize: 12 }}
                        >
                          {t("teach.dueOn", { date: dateLabel(a.due_on) })}
                        </Box>
                      )}
                    </Box>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cls.roster.map((s) => (
                  <tr key={s.id} data-row={studentName(s)}>
                    <Box
                      component="th"
                      scope="row"
                      sx={{
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        position: "sticky",
                        left: 0,
                        bgcolor: "background.paper",
                        borderBottom: `1px solid ${colors.line}`,
                      }}
                    >
                      {studentName(s)}
                    </Box>
                    {d.assignments.map((a) => (
                      <Cell
                        key={a.id}
                        s={s}
                        a={a}
                        cell={d.cells[`${s.id}/${a.id}`]}
                        onOpen={() => setOpen({ s, a })}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1.75, flexWrap: "wrap" }} aria-hidden="true">
            {["secure", "getting", "help", "started", "none"].map((k) => (
              <Box
                key={k}
                sx={{
                  display: "flex",
                  gap: 0.75,
                  alignItems: "center",
                  fontSize: 14,
                  color: "text.secondary",
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 1,
                    bgcolor: HEAT[k],
                    border: `1px solid ${colors.line}`,
                  }}
                />
                {t(`teach.key.${k}`)}
              </Box>
            ))}
            <Box
              sx={{ display: "flex", gap: 0.75, alignItems: "center", fontSize: 14, color: "text.secondary" }}
            >
              <Box sx={{ width: 16, height: 16, borderRadius: 999, bgcolor: colors.bad.main }} />
              {t("teach.key.weak")}
            </Box>
          </Box>
          <Hardest cls={cls} d={d} />
        </>
      )}
      {open && (
        <CellPanel
          s={open.s}
          a={open.a}
          cell={d.cells[`${open.s.id}/${open.a.id}`]}
          onClose={() => setOpen(null)}
        />
      )}
    </TeachShell>
  );
}
