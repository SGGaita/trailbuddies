"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import Loading from "@/components/Loading";
import TeachShell from "@/components/shell/TeachShell";
import { useFamily, useHydrated } from "@/lib/store";

export default function ClassBadgesPage() {
  const ready = useHydrated();
  const teacher = useFamily((s) => s.teacher);
  if (!ready) return <Loading />;
  const classes = teacher?.classes || [];

  return (
    <TeachShell title={t("teach.classBadges")} active="/teach/badges">
      {classes.length ? (
        <Box component="ul" sx={{ display: "grid", gap: 1.5, maxWidth: 720, listStyle: "none", p: 0, m: 0 }}>
          {classes.map((cls) => (
            <Card
              component="li"
              key={cls.id}
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                p: 2,
              }}
            >
              <Typography component="h2" variant="h6">
                {cls.name}
              </Typography>
              <Button
                component={Link}
                href={`/teach/badge-wall?id=${encodeURIComponent(cls.id)}`}
                variant="outlined"
                aria-label={t("teach.badgeWallFor", { name: cls.name })}
              >
                {t("teach.badgeWall")}
              </Button>
            </Card>
          ))}
        </Box>
      ) : (
        <Card sx={{ p: 2, maxWidth: 720 }}>
          <Typography>{t("teach.noClassYet")}</Typography>
          <Button component={Link} href="/teach">
            {t("teach.home")}
          </Button>
        </Card>
      )}
    </TeachShell>
  );
}
