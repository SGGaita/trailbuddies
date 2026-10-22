"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { t } from "@trailbuddies/i18n";
import { useFamily, useHydrated } from "@/lib/store";
import LearnerShell from "@/components/shell/LearnerShell";
import FamilyShell from "@/components/shell/FamilyShell";
import TeachShell from "@/components/shell/TeachShell";
import Buddy from "@/components/art/Buddy";
import Loading from "@/components/Loading";

/**
 * A screen that's planned for a later sprint. Uses the real shell, so navigation
 * and device layouts can be checked now.
 * @param {{ area: "play" | "family" | "teach", title: string, sprint: string, href: string, story?: string }} props
 */
export default function Placeholder({ area, title, sprint, href, story }) {
  const ready = useHydrated();
  const s = useFamily();
  if (!ready) return <Loading />;
  const body = (
    <Card
      sx={{
        p: 3,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        gap: 2.5,
        maxWidth: 720,
      }}
    >
      <Buddy id={area === "teach" ? "juma" : "zip"} size={110} mood="think" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>{t("placeholder.sprint", { sprint })}</Typography>
        {story && (
          <Typography
            sx={{ fontSize: 13, fontFamily: "var(--font-mono, monospace)", color: "text.secondary" }}
          >
            Stories: {story}
          </Typography>
        )}
      </Box>
    </Card>
  );
  if (area === "teach")
    return (
      <TeachShell title={title} sub="Teacher tools arrive in Phase 2 (Sprints 9 to 11)." active={href}>
        {body}
      </TeachShell>
    );
  if (area === "family")
    return (
      <FamilyShell title={title} family={s.family} active={href} back="/family">
        {body}
      </FamilyShell>
    );
  const learner = s.learners.find((l) => l.id === s.activeId) || s.learners[0];
  return (
    <LearnerShell learner={learner} title={title} back="/play/map" active={href} goal={s.settings.goal}>
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        {body}
        <Button component={Link} href="/play/map" variant="contained" sx={{ mt: 2 }}>
          Back to the map
        </Button>
      </Box>
    </LearnerShell>
  );
}
