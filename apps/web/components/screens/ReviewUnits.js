"use client";
import Link from "next/link";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { getSubjects, UNITS, ALL_ASSETS, SHOW_DRAFTS } from "@trailbuddies/content";
import { useFamily, useHydrated } from "@/lib/store";
import Loading from "@/components/Loading";

/**
 * Content review (CNT-04), development and previews only: every unit with its status and
 * pictures, and a button for each lesson that plays it as the chosen child would, without
 * locks and without recording anything. See docs/content.md.
 */
export default function ReviewUnits() {
  const ready = useHydrated();
  const learners = useFamily((s) => s.learners);
  const startDemo = useFamily((s) => s.startDemo);
  const [pick, setPick] = useState("");
  if (!ready) return <Loading />;
  if (!SHOW_DRAFTS)
    return (
      <Box component="main" sx={{ p: 4 }}>
        <Typography>Unit review is only available in development and preview builds.</Typography>
      </Box>
    );
  const kids = learners.filter((l) => l.buddy);
  const learnerId = pick || kids[0]?.id || "";
  return (
    <Box component="main" sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1100, mx: "auto", display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Typography variant="h4" component="h1">
        Review units
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        Play any lesson as a child would. Nothing is saved. When a unit is right, run{" "}
        <code>pnpm content unit:ready &lt;unit&gt;</code>.
      </Typography>
      {!kids.length ? (
        <Box>
          <Button variant="contained" onClick={() => startDemo()}>
            Load the demo family to review as
          </Button>
        </Box>
      ) : (
        <TextField select size="small" label="Play as" value={learnerId} onChange={(e) => setPick(e.target.value)} sx={{ maxWidth: 240 }}>
          {kids.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      {getSubjects().map((s) => (
        <Box key={s.id} component="section" aria-label={s.name} sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography variant="h5" component="h2">
            {s.name}
          </Typography>
          {s.units.map((entry) => {
            const u = UNITS[entry.id];
            const pics = ALL_ASSETS[entry.id]?.assets || [];
            const approved = pics.filter((a) => a.review_status === "approved").length;
            return (
              <Box
                key={entry.id}
                data-unit={entry.id}
                sx={{ bgcolor: "background.paper", border: `2px solid ${colors.line}`, borderRadius: 4.5, p: 1.75, display: "flex", flexDirection: "column", gap: 1 }}
              >
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 800 }}>{entry.title}</Typography>
                  <Chip size="small" label={entry.status} color={entry.status === "ready" ? "success" : entry.status === "draft" ? "warning" : "default"} />
                  <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                    {entry.id} · {entry.band}
                    {pics.length ? ` · pictures approved ${approved} of ${pics.length}` : ""}
                  </Typography>
                </Box>
                {u && learnerId && (
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                    {[...u.lessons.map((l, i) => [String(i + 1), l.title]), ["trophy", "Trophy"]].map(([step, title]) => (
                      <Button
                        key={step}
                        size="small"
                        variant="outlined"
                        component={Link}
                        href={`/play/go?unit=${entry.id}&step=${step}&preview=1&learner=${encodeURIComponent(learnerId)}`}
                        sx={{ borderWidth: 2 }}
                      >
                        {step === "trophy" ? "🏆 Trophy" : `${step}. ${title}`}
                      </Button>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
