"use client";
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import {
  SHARE_DAYS,
  SHARE_MAX_ITEMS,
  packageMedia,
  sharePackage,
  shareProblems,
} from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { ChoiceChip } from "@/components/builder/parts";
import MediaImage from "@/components/MediaImage";
import { api } from "@/lib/account";
import { checkImage, warmUp } from "@/lib/imageCheck";
import { getMedia, mediaUrl } from "@/lib/media";
import ShareCode from "./ShareCode";

const pick = { display: "flex", gap: 1, flexWrap: "wrap" };

/** A photo as a blob: this device's copy, or the family's copy on the server. */
async function photoBlob(id) {
  const local = await getMedia(id);
  if (local?.blob) return local.blob;
  const url = await mediaUrl(id);
  if (!url) return null;
  const r = await fetch(url);
  return r.ok ? r.blob() : null;
}

/**
 * P17 "Share" (SHR-01, SHR-03, SHR-04): choose a lesson, a trail (lessons in order) or some
 * badges, go through the safety checklist, and get a code and QR. Every photo is checked for
 * faces on this device; a photo with a face must be confirmed as not a child, or left out.
 * @param {{ open: boolean, onClose: () => void, onShared?: (s: any) => void,
 *   owner: { familyId?: string, classId?: string }, lessons?: any[], badges?: any[],
 *   start?: { kind: string, ids: string[] } }} props
 */
export default function ShareDialog({ open, onClose, onShared, owner, lessons = [], badges = [], start }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 5.5 } } }}>
      {open && (
        <ShareSteps
          onClose={onClose}
          onShared={onShared}
          owner={owner}
          lessons={lessons}
          badges={badges}
          start={start}
        />
      )}
    </Dialog>
  );
}

function ShareSteps({ onClose, onShared, owner, lessons, badges, start }) {
  const kinds = owner.classId ? ["badges"] : ["lesson", "trail", "badges"].filter((k) => (k === "badges" ? badges.length : lessons.length >= (k === "trail" ? 2 : 1)));
  const [kind, setKind] = useState(start?.kind || kinds[0]);
  const [ids, setIds] = useState(/** @type {string[]} */ (start?.ids || []));
  const [step, setStep] = useState(/** @type {"pick" | "check" | "done"} */ (start?.ids?.length ? "check" : "pick"));
  const [faces, setFaces] = useState(/** @type {string[] | null} */ (null));
  const [notChild, setNotChild] = useState(/** @type {string[]} */ ([]));
  const [removed, setRemoved] = useState(/** @type {string[]} */ ([]));
  const [noNames, setNoNames] = useState(false);
  const [voice, setVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [share, setShare] = useState(/** @type {any} */ (null));

  const items = kind === "badges" ? badges : lessons;
  const chosen = ids.map((id) => items.find((x) => x.id === id)).filter(Boolean);
  const pkg = sharePackage(
    kind === "badges" ? { kind, badges: chosen } : { kind, lessons: chosen },
    { voice: true },
  );
  const { photos, voices } = packageMedia(pkg);
  const enough = kind === "trail" ? ids.length >= 2 : ids.length >= 1;

  useEffect(() => {
    warmUp();
  }, []);

  // The face check (SHR-03) runs over every photo when the checklist opens.
  useEffect(() => {
    if (step !== "check") return undefined;
    let live = true;
    (async () => {
      const found = [];
      for (const id of photos) {
        const blob = await photoBlob(id);
        const c = blob ? await checkImage(blob) : { ok: false, faces: 0 };
        // When the check can't run, the grown-up looks at the photo themselves.
        if (!c.ok || c.faces > 0) found.push(id);
      }
      if (live) setFaces(found);
    })();
    return () => {
      live = false;
    };
    // photos is derived from ids and kind, which only change on the pick step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggle = (id) =>
    setIds((cur) =>
      kind === "lesson" ? [id] : cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < SHARE_MAX_ITEMS ? [...cur, id] : cur,
    );
  const answer = (id, value) => {
    setNotChild((cur) => (value === "ok" ? [...new Set([...cur, id])] : cur.filter((x) => x !== id)));
    setRemoved((cur) => (value === "out" ? [...new Set([...cur, id])] : cur.filter((x) => x !== id)));
  };
  const problems = faces ? shareProblems({ noNames, notChild, removed }, faces) : ["faces"];

  const create = async () => {
    if (problems.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const s = await api.createShare(owner, {
        kind,
        ids,
        voice: voice && voices.length > 0,
        checklist: { no_names: true, faces_checked: true, not_child: notChild, removed },
      });
      setShare(s);
      setStep("done");
      onShared?.(s);
    } catch (e) {
      setError(e.code === "media_not_ready" ? t("share.mediaNotReady") : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
        {step === "done" ? t("share.doneTitle") : t("share.title")}
      </Typography>

      {step === "pick" && (
        <>
          {kinds.length > 1 && (
            <Box sx={pick} role="group" aria-label={t("share.what")}>
              {kinds.map((k) => (
                <ChoiceChip
                  key={k}
                  on={kind === k}
                  onClick={() => {
                    setKind(k);
                    setIds([]);
                  }}
                >
                  {t(`share.kind.${k}`)}
                </ChoiceChip>
              ))}
            </Box>
          )}
          <Typography sx={{ color: "text.secondary" }}>{t(`share.kindHint.${kind}`, { max: SHARE_MAX_ITEMS })}</Typography>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            {items.map((x) => {
              const on = ids.includes(x.id);
              const n = ids.indexOf(x.id) + 1;
              return (
                <li key={x.id}>
                  <Box
                    component="button"
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(x.id)}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.25,
                      borderRadius: 4.5,
                      border: `2px solid ${on ? colors.leaf.deep : colors.line}`,
                      bgcolor: on ? colors.leaf.soft : "background.paper",
                      color: "text.primary",
                      font: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <Box sx={{ flex: 1, fontWeight: 800 }}>{x.title || x.name}</Box>
                    {on && kind === "trail" && <b aria-label={t("share.order", { n })}>{n}</b>}
                  </Box>
                </li>
              );
            })}
          </Box>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button onClick={onClose}>{t("common.cancel")}</Button>
            <Button variant="contained" disabled={!enough} onClick={() => setStep("check")}>
              {t("share.next")}
            </Button>
          </Box>
        </>
      )}

      {step === "check" && (
        <>
          <Typography sx={{ fontWeight: 800 }}>{t("share.checklist")}</Typography>
          {photos.length > 0 && faces === null && (
            <Box role="status">
              <Typography sx={{ color: "text.secondary", mb: 1 }}>{t("share.checking", { n: photos.length })}</Typography>
              <LinearProgress />
            </Box>
          )}
          {faces?.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              <Typography>{t("share.facesFound", { n: faces.length })}</Typography>
              {faces.map((id) => {
                const value = notChild.includes(id) ? "ok" : removed.includes(id) ? "out" : "";
                return (
                  <Box key={id} data-face={id} sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <MediaImage id={id} alt={t("share.facePhoto")} sx={{ width: 64, height: 64, borderRadius: 3.5 }} />
                    <Box sx={pick}>
                      <ChoiceChip on={value === "ok"} onClick={() => answer(id, "ok")}>
                        {t("share.notChild")}
                      </ChoiceChip>
                      <ChoiceChip on={value === "out"} onClick={() => answer(id, "out")}>
                        {t("share.leaveOut")}
                      </ChoiceChip>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
          <FormControlLabel
            control={<Checkbox checked={noNames} onChange={(e) => setNoNames(e.target.checked)} />}
            label={<b>{t("share.noNames")}</b>}
          />
          <Typography sx={{ color: "text.secondary", mt: -1.5, ml: 4 }}>{t("share.noNamesSub")}</Typography>
          {voices.length > 0 && (
            <FormControlLabel
              control={<Checkbox checked={voice} onChange={(e) => setVoice(e.target.checked)} />}
              label={t("share.voice", { n: voices.length })}
            />
          )}
          <Alert severity="info" sx={{ borderRadius: 4 }}>
            {photos.length || (voice && voices.length) ? t("share.reviewNote") : t("share.privacyNote")}
          </Alert>
          {error && <Alert severity="warning">{error}</Alert>}
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button onClick={() => (start ? onClose() : setStep("pick"))}>{t("share.back")}</Button>
            <Button variant="contained" disabled={problems.length > 0 || busy} onClick={create}>
              {t("share.make")}
            </Button>
          </Box>
        </>
      )}

      {step === "done" && share && (
        <>
          <ShareCode code={share.code} />
          <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
            {share.status === "review" ? t("share.waiting") : t("share.works", { days: SHARE_DAYS })}
          </Typography>
          <Button variant="contained" onClick={onClose} sx={{ alignSelf: "center" }}>
            {t("share.done")}
          </Button>
        </>
      )}
    </Box>
  );
}
