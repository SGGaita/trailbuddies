"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";
import { Pill } from "@/components/builder/parts";
import { api, canEdit } from "@/lib/account";
import { useFamily, useHydrated } from "@/lib/store";
import ShareDialog from "./ShareDialog";

/** The status pill for a code (P17). */
export function ShareStatus({ status }) {
  return <Pill tone={status === "live" ? "ok" : "sand"}>{t(`share.state.${status}`)}</Pill>;
}

/**
 * Your share codes in a list: what each shares, whether it works, how many copies were made,
 * and Stop sharing. Used by families (P17) and teachers (class badges).
 * @param {{ shares: any[], onStop: (s: any) => void, canStop: boolean }} props
 */
export function ShareList({ shares, onStop, canStop }) {
  if (!shares.length) return <Typography sx={{ color: "text.secondary" }}>{t("share.none")}</Typography>;
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
      {shares.map((s) => (
        <Card component="li" key={s.id} data-share={s.code} sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography sx={{ font: "800 20px ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: ".06em" }}>
              {s.code}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>{s.title}</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
              {t(`share.kind.${s.kind}`)} · {t("share.imports", { n: s.imports })}
            </Typography>
          </Box>
          <ShareStatus status={s.status} />
          {canStop && (s.status === "live" || s.status === "review") && (
            <Button size="small" variant="outlined" onClick={() => onStop(s)}>
              {t("share.stop")}
            </Button>
          )}
        </Card>
      ))}
    </Box>
  );
}

/** P17 Share codes: share a lesson, trail or badges; see and stop your codes (SHR-01). */
export default function ShareCodes() {
  const ready = useHydrated();
  const s = useFamily();
  const [shares, setShares] = useState(/** @type {any[] | null} */ (null));
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reload, setReload] = useState(0);
  const familyId = s.family?.id;
  const account = s.mode === "account" && familyId;

  useEffect(() => {
    if (!account) return undefined;
    let live = true;
    api.shares({ familyId }).then(
      (r) => live && setShares(r.shares),
      () => live && setShares([]),
    );
    return () => {
      live = false;
    };
  }, [account, familyId, reload]);

  if (!ready) return <Loading />;
  const editable = canEdit(s);
  const stop = async (sh) => {
    await api.revokeShare({ familyId }, sh.id);
    setNote(t("share.stopped"));
    setReload((n) => n + 1);
  };

  return (
    <FamilyShell title={t("share.codesTitle")} family={s.family} active="/family/create" wide>
      {!account ? (
        <Alert severity="info">{t("share.needsAccount")}</Alert>
      ) : (
        <>
          <Card sx={{ p: { xs: 2, sm: 2.5 }, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{t("share.intro")}</Typography>
              <Typography sx={{ color: "text.secondary" }}>{t("share.introSub")}</Typography>
            </Box>
            {editable && (
              <Button variant="contained" onClick={() => setOpen(true)} disabled={!s.lessons.length && !s.customBadges.length}>
                {t("share.shareSomething")}
              </Button>
            )}
          </Card>
          {note && (
            <Alert severity="success" onClose={() => setNote("")}>
              {note}
            </Alert>
          )}
          <Typography variant="h6" component="h2">
            {t("share.yours")}
          </Typography>
          {shares === null ? <Loading /> : <ShareList shares={shares} onStop={stop} canStop={editable} />}
          <Button component={Link} href="/family/create/import" variant="outlined" sx={{ alignSelf: "flex-start" }}>
            {t("share.gotCode")}
          </Button>
          <ShareDialog
            open={open}
            onClose={() => setOpen(false)}
            onShared={() => setReload((n) => n + 1)}
            owner={{ familyId }}
            lessons={s.lessons}
            badges={s.customBadges}
          />
        </>
      )}
    </FamilyShell>
  );
}
