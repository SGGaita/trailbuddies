"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";
import { canEdit, lessonFromApi } from "@/lib/account";
import { useFamily, useHydrated } from "@/lib/store";
import ImportByCode from "./ImportByCode";

/** P23 Import by code for a family: the copy goes into the Lesson Builder library (SHR-02). */
export default function ImportLesson() {
  const ready = useHydrated();
  const s = useFamily();
  const initial = useSearchParams().get("code") || "";
  const [done, setDone] = useState(/** @type {{ lessons: any[], badges: any[] } | null} */ (null));
  if (!ready) return <Loading />;
  const account = s.mode === "account" && s.family?.id;

  const imported = (r) => {
    useFamily.setState((st) => ({
      lessons: [...st.lessons, ...r.lessons.map(lessonFromApi)],
      customBadges: [...st.customBadges, ...r.badges],
    }));
    setDone(r);
  };
  const first = done?.lessons[0];

  return (
    <FamilyShell title={t("import.title")} family={s.family} active="/family/create">
      {!account ? (
        <Alert severity="info">{t("share.needsAccount")}</Alert>
      ) : (
        <>
          <Typography sx={{ color: "text.secondary" }}>{t("import.intro")}</Typography>
          <ImportByCode target={{ familyId: s.family.id }} initial={initial} onImported={imported} disabled={!canEdit(s)} />
          {done && (
            <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }} role="status">
              <Typography sx={{ fontWeight: 800 }}>
                {first ? t("import.doneLesson", { n: done.lessons.length }) : t("import.doneBadges", { n: done.badges.length })}
              </Typography>
              <Button
                component={Link}
                variant="contained"
                href={first ? `/family/create/lesson?id=${first.id}` : `/family/create/badge?id=${done.badges[0].id}`}
              >
                {first ? t("import.chooseWho") : t("import.seeBadges")}
              </Button>
            </Card>
          )}
        </>
      )}
    </FamilyShell>
  );
}
