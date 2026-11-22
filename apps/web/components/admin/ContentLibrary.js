"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { bundledContent } from "@trailbuddies/content";
import { can } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { Pill, inputSx } from "@/components/builder/parts";
import { api } from "@/lib/account";
import { StaffHead, useStaff } from "./StaffShell";

/** Save the published version as a file, for `pnpm content export:apply` (CMS-02). */
async function exportFile() {
  const data = await api.request("/admin/content/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `trailbuddies-content-v${data.version}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** The live version, or the draft with what changed and the admin's Publish (CMS-02, CMS-04). */
function VersionBanner({ data, me, onDone, say }) {
  const [note, setNote] = useState("");
  const [own, setOwn] = useState(false);
  const [problems, setProblems] = useState(/** @type {string[]} */ ([]));
  const [busy, setBusy] = useState(false);
  const draft = data.draft;
  if (!draft)
    return (
      <Card sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }} data-testid="version-banner">
        <Pill tone="ok">{t("cms.live")}</Pill>
        <Typography sx={{ flex: "1 1 260px" }}>{t("cms.liveLine", { v: data.live.version })}</Typography>
      </Card>
    );
  const publish = async (confirmOwn) => {
    if (note.trim().length < 3) return say("error", t("cms.needNote"));
    setBusy(true);
    try {
      await api.publishContent(note.trim(), confirmOwn);
      setOwn(false);
      setProblems([]);
      setNote("");
      say("success", t("cms.published", { v: draft.version }));
      onDone();
    } catch (e) {
      if (e.code === "own") setOwn(true);
      else if (e.code === "assets") setProblems(e.problems);
      else say("error", e.message);
    }
    setBusy(false);
  };
  return (
    <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25, bgcolor: colors.sun.soft, borderColor: colors.sun.deep }} data-testid="version-banner">
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
        <Pill tone="sun">{t("cms.draft")}</Pill>
        <Typography sx={{ flex: "1 1 260px" }}>
          <b>{t("cms.versionN", { v: draft.version })}</b> · {t("cms.draftLine", { n: draft.changes.length, v: data.live.version })}
        </Typography>
        {can(me.role, "edit") && (
          <Button size="small" color="inherit" onClick={async () => (await api.discardDraft(), say("success", t("cms.discarded")), onDone())}>
            {t("cms.discard")}
          </Button>
        )}
      </Box>
      <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 14 }}>
        {draft.changes.map((c) => (
          <li key={c.unit}>
            <b>{c.title}</b>: {c.changes.join("; ")} <Box component="span" sx={{ color: "text.secondary" }}>· {c.by}</Box>
          </li>
        ))}
      </Box>
      {can(me.role, "publish") ? (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start" }}>
          <TextField
            size="small"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("cms.notePlaceholder")}
            slotProps={{ htmlInput: { "aria-label": t("cms.note"), maxLength: 300 } }}
            sx={{ ...inputSx, flex: "1 1 280px" }}
          />
          <Button variant="contained" disabled={busy} onClick={() => publish(false)}>
            {t("cms.publish")}
          </Button>
        </Box>
      ) : (
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("cms.adminPublishes")}</Typography>
      )}
      {own && (
        <Alert
          severity="warning"
          sx={{ borderRadius: 4 }}
          action={
            <Button color="inherit" size="small" disabled={busy} onClick={() => publish(true)}>
              {t("cms.publishOwn")}
            </Button>
          }
        >
          {t("cms.ownWarning")}
        </Alert>
      )}
      {problems.length > 0 && (
        <Alert severity="error" sx={{ borderRadius: 4 }}>
          {t("cms.assetsBlock")}
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </Box>
        </Alert>
      )}
    </Card>
  );
}

/** Uploaded pictures waiting for a reviewer or admin (CMS-03). Children never see them before. */
function Approvals({ me, onDone, say }) {
  const [list, setList] = useState(/** @type {any[] | null} */ (null));
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    api.contentAssets().then((d) => live && setList(d.assets), () => live && setList([]));
    return () => {
      live = false;
    };
  }, [reload]);
  const waiting = (list || []).filter((a) => a.approval === "waiting");
  if (!waiting.length) return null;
  const decide = async (a, approve) => {
    try {
      await api.decideContentAsset(a.id, approve);
      say("success", t(approve ? "cms.pic.approved" : "cms.pic.refused"));
      setReload((n) => n + 1);
      onDone();
    } catch (e) {
      say("error", e.message);
    }
  };
  return (
    <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25 }} data-testid="approvals">
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18 }}>
        {t("cms.pic.waitingTitle", { n: waiting.length })}
      </Typography>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {waiting.map((a) => (
          <Box key={a.id} data-asset={a.id} sx={{ border: `2px solid ${colors.line}`, borderRadius: 4.5, p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box
              role="img"
              aria-label={a.label || t("cms.pic.upload")}
              sx={{ aspectRatio: "1", borderRadius: 3.5, bgcolor: colors.sand, backgroundImage: `url("${api.contentAssetUrl(a.id)}")`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <Typography sx={{ fontSize: 14 }}>
              <b>{a.label || t("cms.pic.unnamed")}</b>
              <br />
              <Box component="span" sx={{ color: "text.secondary" }}>
                {t("cms.pic.by", { who: a.uploaded_by })}
              </Box>
            </Typography>
            {a.uploaded_by === me.email && me.role !== "admin" ? (
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{t("cms.pic.notOwn")}</Typography>
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" variant="contained" onClick={() => decide(a, true)}>
                  {t("cms.pic.approve")}
                </Button>
                <Button size="small" color="error" onClick={() => decide(a, false)}>
                  {t("cms.pic.refuse")}
                </Button>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Card>
  );
}

/**
 * E02 Content library (CMS-02): every built-in trail and unit, as the draft has it. The first
 * time, an admin imports the content files bundled in this app as version 1; after that, edits
 * go into a draft of the next version and children keep the published one until an admin
 * publishes it (the content packs devices download are rebuilt then).
 */
export default function ContentLibrary() {
  const me = useStaff();
  const [data, setData] = useState(/** @type {any} */ (null));
  const [msg, setMsg] = useState(/** @type {{ tone: "success" | "error" | "info", text: string } | null} */ (null));
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const say = (tone, text) => setMsg({ tone, text });
  const refresh = () => setReload((n) => n + 1);

  useEffect(() => {
    let live = true;
    api.content().then(
      (d) => live && setData(d),
      (e) => live && setMsg({ tone: "error", text: e.message }),
    );
    return () => {
      live = false;
    };
  }, [reload]);

  const importNow = async () => {
    setBusy(true);
    try {
      await api.importContent(bundledContent());
      say("success", t("cms.imported"));
      refresh();
    } catch (e) {
      say("error", [e.message, ...(e.problems || []).slice(0, 5)].join(" · "));
    }
    setBusy(false);
  };

  const subjects = data?.subjects || [];
  const units = subjects.reduce((n, s) => n + s.units.length, 0);
  return (
    <>
      <StaffHead title={t("cms.title")} sub={data?.imported ? t("cms.sub", { trails: subjects.length, units }) : t("cms.subEmpty")}>
        {data?.imported && can(me.role, "publish") && (
          <Button variant="outlined" onClick={() => exportFile().catch((e) => say("error", e.message))}>
            {t("cms.export")}
          </Button>
        )}
      </StaffHead>
      {msg && (
        <Alert severity={msg.tone} onClose={() => setMsg(null)} sx={{ borderRadius: 4 }} role="status">
          {msg.text}
        </Alert>
      )}
      {data && !data.imported && (
        <Card sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.25, maxWidth: 720 }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 20 }}>
            {t("cms.importTitle")}
          </Typography>
          <Typography>{t("cms.importBody")}</Typography>
          {can(me.role, "publish") ? (
            <Button variant="contained" disabled={busy} onClick={importNow} sx={{ alignSelf: "flex-start" }}>
              {t("cms.import")}
            </Button>
          ) : (
            <Typography sx={{ color: "text.secondary" }}>{t("cms.importAdmin")}</Typography>
          )}
        </Card>
      )}
      {data?.imported && (
        <>
          <VersionBanner data={data} me={me} onDone={refresh} say={say} />
          {can(me.role, "approve-asset") && <Approvals me={me} onDone={refresh} say={say} />}
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", alignItems: "start" }}>
            {subjects.map((s) => (
              <Card key={s.id} sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0.5 }} data-subject={s.id}>
                <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
                  {s.name}
                </Typography>
                {s.units.map((u) => {
                  const body = (
                    <>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          {u.title}
                        </Box>
                        <br />
                        <Box component="span" sx={{ color: "text.secondary", fontSize: 13 }}>
                          {u.has_content ? t("cms.unitLine", { n: u.items, band: t(`band.${u.band}`) }) : t("cms.planned")}
                        </Box>
                      </Box>
                      {u.edited ? <Pill tone="sun">{t("cms.edited")}</Pill> : u.status === "draft" && <Pill>{t("cms.status.draft")}</Pill>}
                      {u.has_content && (
                        <Box component="span" sx={{ color: colors.leaf.deep, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
                          {can(me.role, "edit") ? t("cms.edit") : t("cms.view")} ›
                        </Box>
                      )}
                    </>
                  );
                  const sx = { display: "flex", alignItems: "center", gap: 1, py: 1, borderTop: `1px solid ${colors.line}`, textDecoration: "none", color: "text.primary" };
                  return u.has_content ? (
                    <Box key={u.id} component={Link} href={`/admin/content/unit?id=${encodeURIComponent(u.id)}`} sx={sx} data-unit={u.id}>
                      {body}
                    </Box>
                  ) : (
                    <Box key={u.id} sx={{ ...sx, opacity: 0.6 }} data-unit={u.id}>
                      {body}
                    </Box>
                  );
                })}
              </Card>
            ))}
          </Box>
        </>
      )}
    </>
  );
}
