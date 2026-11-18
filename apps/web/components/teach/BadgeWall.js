"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { builtInBadges } from "@trailbuddies/content";
import { t } from "@trailbuddies/i18n";
import BadgeArt from "@/components/rewards/BadgeArt";
import Loading from "@/components/Loading";
import { api } from "@/lib/account";

const badgeById = new Map(builtInBadges.map((badge) => [badge.id, badge]));

export default function BadgeWall() {
  const id = useSearchParams().get("id");
  return <ClassBadgeWall key={id} id={id} />;
}

function ClassBadgeWall({ id }) {
  const wall = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenFailed, setFullscreenFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    api.classBadgeWall(id).then(
      (result) => active && setData(result),
      () => active && setError(true),
    );
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === wall.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggleFullscreen() {
    try {
      if (fullscreen) await document.exitFullscreen();
      else await wall.current.requestFullscreen();
    } catch {
      setFullscreenFailed(true);
    }
  }

  const students = (data?.students || [])
    .map((student) => ({
      ...student,
      badges: student.badge_ids
        .map((badgeId) => badgeById.get(badgeId))
        .filter(Boolean)
        .map((badge) => ({ ...badge, tier: student.badge_tiers?.[badge.id] || badge.tier })),
    }))
    .filter((student) => student.badges.length);

  return (
    <Box
      component="main"
      ref={wall}
      sx={{
        bgcolor: "background.default",
        color: "text.primary",
        minHeight: "100dvh",
        overflow: "auto",
        p: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 3 }}>
          <Button component={Link} href={id ? `/teach/class?id=${encodeURIComponent(id)}` : "/teach"}>
            {t("teach.badgeWallBack")}
          </Button>
          {data && document.fullscreenEnabled && !fullscreenFailed && (
            <Button variant="outlined" onClick={toggleFullscreen}>
              {t(fullscreen ? "teach.badgeWallExit" : "teach.badgeWallFullscreen")}
            </Button>
          )}
        </Box>
        <Typography component="h1" variant="h3">
          {t("teach.badgeWall")}
        </Typography>
        {data && (
          <Typography sx={{ mt: 1, mb: 3, fontSize: 20 }}>
            {data.class_name} · {t("teach.badgeWallWeek")}
          </Typography>
        )}
        {(!id || error) && <Alert severity="warning">{t("teach.badgeWallError")}</Alert>}
        {id && !data && !error && <Loading />}
        {data && !students.length && <Typography>{t("teach.badgeWallEmpty")}</Typography>}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: 2,
          }}
        >
          {students.map((student, index) => (
            <Box component="section" key={index} sx={{ bgcolor: "background.paper", borderRadius: 4, p: 2 }}>
              <Typography component="h2" variant="h5" sx={{ mb: 2 }}>
                {student.first_name}
              </Typography>
              <Box
                component="ul"
                sx={{ display: "flex", flexWrap: "wrap", gap: 2, listStyle: "none", m: 0, p: 0 }}
              >
                {student.badges.map((badge) => (
                  <Box
                    component="li"
                    key={badge.id}
                    sx={{ display: "grid", justifyItems: "center", gap: 1, width: 100, textAlign: "center" }}
                  >
                    <BadgeArt badge={badge} size={72} />
                    <Typography sx={{ fontWeight: 700 }}>{badge.name}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
