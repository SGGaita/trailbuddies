"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { exportRows } from "@trailbuddies/domain";
import { useHydrated } from "@/lib/store";
import { api } from "@/lib/account";
import { lessonsTotal } from "@/lib/classWork";
import Loading from "@/components/Loading";
import { useTeachClass } from "./classPick";
import { useClassData } from "./ClassProgress";

/**
 * ASN-04: a print-ready class progress report; "Save as PDF" from the print dialog. The same
 * fields as the CSV: first names, assignments, stars and completion dates only.
 */
export default function ProgressReport() {
  const ready = useHydrated();
  const { id, cls, error } = useTeachClass();
  const [data, setData] = useState(/** @type {any} */ (null));
  useEffect(() => {
    if (id)
      api
        .classProgress(id)
        .then((r) => setData({ id, ...r }))
        .catch(() => setData({ id, failed: true }));
  }, [id]);
  const d = useClassData(cls, data?.id === id && !data?.failed ? data : null);
  if (!ready || (!cls && !error) || (cls && !data)) return <Loading />;
  if (!cls || !d) return <Alert severity="warning">{error || t("teach.offline")}</Alert>;
  const rows = exportRows({
    assignments: d.assignments,
    roster: cls.roster,
    groups: d.groups,
    byStudent: d.byStudent,
    lessonsTotal,
  });
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const cell = { px: 1.5, py: 0.75, borderBottom: `1px solid ${colors.line}`, textAlign: "left" };
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100dvh", "@media print": { bgcolor: "#fff" } }}>
      <Box
        className="no-print"
        sx={{
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
          p: 2,
          maxWidth: 820,
          mx: "auto",
          "@media print": { display: "none" },
        }}
      >
        <Box sx={{ flex: 1 }} />
        <Button component={Link} href={`/teach/progress?id=${cls.id}`}>
          {t("teach.progressTitle")}
        </Button>
        <Button variant="contained" onClick={() => window.print()}>
          {t("teach.print")}
        </Button>
      </Box>
      <Box
        component="article"
        sx={{
          bgcolor: "#fff",
          maxWidth: 794,
          mx: "auto",
          mb: 3,
          p: { xs: 3, sm: 6 },
          boxShadow: "0 2px 10px rgba(0,0,0,.08)",
          "@media print": { boxShadow: "none", p: 0 },
        }}
      >
        <Typography component="h1" variant="h4">
          {t("teach.reportTitle", { name: cls.name })}
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 2 }}>
          {t("teach.reportDate", { date: today })}
        </Typography>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["csvName", "csvWork", "csvStars", "csvDone"].map((k) => (
                <Box
                  component="th"
                  key={k}
                  scope="col"
                  sx={{ ...cell, borderBottom: `2px solid ${colors.ink}` }}
                >
                  {t(`teach.${k}`)}
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <Box
                  component="td"
                  sx={{ ...cell, fontWeight: i === 0 || rows[i - 1].first_name !== r.first_name ? 800 : 400 }}
                >
                  {i === 0 || rows[i - 1].first_name !== r.first_name ? r.first_name : ""}
                </Box>
                <Box component="td" sx={cell}>
                  {r.assignment}
                </Box>
                <Box component="td" sx={cell}>
                  {r.stars === "" ? "–" : "★".repeat(r.stars) || "0"}
                </Box>
                <Box component="td" sx={cell}>
                  {r.completed || "–"}
                </Box>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
}
