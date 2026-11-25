"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { can, moveId } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import Island from "@/components/art/Island";
import { Field, Pill, inputSx } from "@/components/builder/parts";
import { api } from "@/lib/account";
import { uploadContentPicture } from "@/lib/contentUpload";
import DraftBanner from "./DraftBanner";
import { StaffHead, useStaff } from "./StaffShell";

const BANDS = ["seedling", "sprout", "explorer", "voyager", "trailblazer"];

/** The island a trail shows: its uploaded art (staff see it before approval) or the built-in one. */
function IslandThumb({ s, width = 84 }) {
  if (s.art)
    return (
      <Box
        role="img"
        aria-label={s.place}
        sx={{ width, height: width * 0.66, flex: "none", borderRadius: 3.5, bgcolor: colors.sand, backgroundImage: `url("${api.contentAssetUrl(s.art)}")`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
    );
  return (
    <Box sx={{ width, height: width * 0.66, flex: "none", overflow: "hidden", borderRadius: 3.5 }} aria-hidden>
      <Island kind={s.island} width={width} height={width * 0.66} />
    </Box>
  );
}

/** Pick or upload island art. Children see it once a reviewer or admin approves it. */
function ArtField({ art, label, onArt }) {
  const [busy, setBusy] = useState("");
  return (
    <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap" }}>
      {art && <IslandThumb s={{ art, place: label }} width={96} />}
      <Button component="label" variant="outlined" size="small">
        {t(art ? "cms.map.changeArt" : "cms.map.uploadArt")}
        <input
          hidden
          type="file"
          accept="image/*"
          data-testid="island-file"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(t("cms.pic.checking"));
            try {
              onArt(await uploadContentPicture(file, label || "Island"));
              setBusy("");
            } catch (err) {
              setBusy(err.message);
            }
          }}
        />
      </Button>
      {art && <Pill tone="sun">{t("cms.pic.waitingShort")}</Pill>}
      {busy && <Typography sx={{ fontSize: 13, color: "text.secondary" }} role="status">{busy}</Typography>}
    </Box>
  );
}

/** A new unit: blank (four starter words) or a copy of another unit's lessons (CMS-05). */
function UnitFields({ value, onChange, units }) {
  return (
    <>
      <Field label={t("cms.map.unitTitle")} id="nu-title">
        <TextField id="nu-title" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} sx={inputSx} placeholder={t("cms.map.unitPh")} />
      </Field>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <Field label={t("cms.f.band")} id="nu-band">
          <TextField id="nu-band" select value={value.band} onChange={(e) => onChange({ ...value, band: e.target.value })} sx={{ ...inputSx, minWidth: 170 }}>
            {BANDS.map((b) => (
              <MenuItem key={b} value={b}>
                {t(`band.${b}`)}
              </MenuItem>
            ))}
          </TextField>
        </Field>
        <Field label={t("cms.map.startFrom")} id="nu-from">
          <TextField id="nu-from" select value={value.copy_from || ""} onChange={(e) => onChange({ ...value, copy_from: e.target.value || null })} sx={{ ...inputSx, minWidth: 220 }}>
            <MenuItem value="">{t("cms.map.blank")}</MenuItem>
            {units.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {t("cms.map.copyOf", { title: u.title })}
              </MenuItem>
            ))}
          </TextField>
        </Field>
      </Box>
    </>
  );
}

/**
 * E04 Map & trails (CMS-05). The order here is the order on every child's map; units follow
 * their trail's order unless a grown-up reordered a child's trail (PAR-10). Archiving takes a
 * trail off the map for everyone; children keep their stars, badges and treasure. Everything
 * goes into the draft and reaches children once it's reviewed and published.
 */
export default function MapTrails() {
  const me = useStaff();
  const edit = can(me.role, "edit");
  const [data, setData] = useState(/** @type {any} */ (null));
  const [msg, setMsg] = useState(/** @type {{ tone: "success" | "error", text: string } | null} */ (null));
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(/** @type {any} */ (null));
  const [adding, setAdding] = useState(/** @type {string | null} */ (null)); // subject id for a new unit
  const [unit, setUnit] = useState({ title: "", band: "sprout", copy_from: null });
  const [trail, setTrail] = useState({ name: "", place: "", art: "" });

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

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
      setReload((n) => n + 1);
      return true;
    } catch (e) {
      setMsg({ tone: "error", text: [e.message, ...(e.problems || []).slice(0, 3)].join(" · ") });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const subjects = data?.subjects || [];
  const order = subjects.map((s) => s.id);
  const allUnits = subjects.flatMap((s) => s.units.filter((u) => u.has_content));
  const moveTrail = (id, d) => run(() => api.reorderContent(moveId(order, id, d)), t("cms.map.moved"));
  const moveUnit = (s, uid, d) =>
    run(() => api.reorderContent(order, { [s.id]: moveId(s.units.map((u) => u.id), uid, d) }), t("cms.map.moved"));

  const addTrail = async (e) => {
    e.preventDefault();
    if (!trail.name.trim() || !trail.place.trim() || !trail.art || !unit.title.trim()) return setMsg({ tone: "error", text: t("cms.map.needAll") });
    const ok = await run(() => api.addTrail({ name: trail.name.trim(), place: trail.place.trim(), art: trail.art, unit: { ...unit, title: unit.title.trim() } }), t("cms.map.trailAdded", { name: trail.name.trim() }));
    if (ok) {
      setTrail({ name: "", place: "", art: "" });
      setUnit({ title: "", band: "sprout", copy_from: null });
    }
  };

  return (
    <>
      <StaffHead title={t("cms.map.title")} sub={t("cms.map.sub")} />
      {msg && (
        <Alert severity={msg.tone} onClose={() => setMsg(null)} sx={{ borderRadius: 4 }} role="status">
          {msg.text}
        </Alert>
      )}
      {data && !data.imported && (
        <Alert severity="info" sx={{ borderRadius: 4 }}>
          {t("cms.importFirst")} <Link href="/admin/content">{t("cms.title")}</Link>
        </Alert>
      )}
      {data?.imported && <DraftBanner data={data} compact />}
      {data?.imported && (
        <Box sx={{ display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) minmax(0, 1fr)" }, alignItems: "start" }}>
          <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }} data-testid="map-order">
            <Typography sx={{ fontWeight: 800 }}>{t("cms.map.order")}</Typography>
            {subjects.map((s, i) => (
              <Box key={s.id} data-trail={s.id} sx={{ border: `2px solid ${colors.line}`, borderRadius: 4.5, p: 1.25, opacity: s.archived ? 0.6 : 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Box component="b" sx={{ width: 22, textAlign: "right" }}>
                    {i + 1}
                  </Box>
                  <IslandThumb s={s} width={64} />
                  <Box sx={{ flex: "1 1 140px", minWidth: 0 }}>
                    <b>{s.name}</b> {s.archived && <Pill tone="bad">{t("cms.map.archived")}</Pill>}
                    <br />
                    <Box component="span" sx={{ color: "text.secondary", fontSize: 13 }}>
                      {s.place}
                    </Box>
                  </Box>
                  {edit && (
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                      <IconButton size="small" aria-label={t("cms.up", { word: s.name })} disabled={busy || i === 0} onClick={() => moveTrail(s.id, -1)}>
                        ↑
                      </IconButton>
                      <IconButton size="small" aria-label={t("cms.down", { word: s.name })} disabled={busy || i === subjects.length - 1} onClick={() => moveTrail(s.id, 1)}>
                        ↓
                      </IconButton>
                      <Button
                        size="small"
                        color={s.archived ? "inherit" : "error"}
                        disabled={busy}
                        onClick={() => (s.archived ? run(() => api.changeTrail(s.id, { archived: false }), t("cms.map.restored", { name: s.name })) : setArchiving(s))}
                      >
                        {t(s.archived ? "cms.map.restore" : "cms.map.archive")}
                      </Button>
                    </Box>
                  )}
                </Box>
                <Box component="ol" sx={{ m: 0, pl: { xs: 3, sm: 7.5 }, display: "flex", flexDirection: "column", gap: 0.25 }}>
                  {s.units.map((u, ui) => (
                    <Box component="li" key={u.id} sx={{ fontSize: 14 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Box component={Link} href={`/admin/content/unit?id=${encodeURIComponent(u.id)}`} sx={{ flex: 1, color: "text.primary" }}>
                          {u.title}
                        </Box>
                        {u.status === "draft" && <Pill>{t("cms.status.draft")}</Pill>}
                        {edit && (
                          <IconButton size="small" aria-label={t("cms.up", { word: u.title })} disabled={busy || ui === 0} onClick={() => moveUnit(s, u.id, -1)} sx={{ width: 32, height: 32 }}>
                            ↑
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
                {edit && !s.archived && (
                  <Button size="small" sx={{ alignSelf: "flex-start", ml: { sm: 6.5 } }} onClick={() => (setAdding(s.id), setUnit({ title: "", band: "sprout", copy_from: null }))}>
                    {t("cms.map.addUnit")}
                  </Button>
                )}
              </Box>
            ))}
          </Card>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
            {edit && (
              <Card component="form" onSubmit={addTrail} sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.25 }} data-testid="add-trail">
                <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18 }}>
                  {t("cms.map.addTrail")}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{t("cms.map.addTrailNote")}</Typography>
                <Field label={t("cms.map.name")} id="tr-name">
                  <TextField id="tr-name" value={trail.name} onChange={(e) => setTrail({ ...trail, name: e.target.value })} placeholder="Weather" sx={inputSx} />
                </Field>
                <Field label={t("cms.map.place")} id="tr-place">
                  <TextField id="tr-place" value={trail.place} onChange={(e) => setTrail({ ...trail, place: e.target.value })} placeholder="Weather Hill" sx={inputSx} />
                </Field>
                <Field label={t("cms.map.art")} id="tr-art">
                  <ArtField art={trail.art} label={trail.place} onArt={(art) => setTrail({ ...trail, art })} />
                </Field>
                <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{t("cms.map.firstUnit")}</Typography>
                {adding == null && <UnitFields value={unit} onChange={setUnit} units={allUnits} />}
                <Button type="submit" variant="contained" disabled={busy}>
                  {t("cms.map.addTrailGo")}
                </Button>
              </Card>
            )}
            <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography sx={{ fontWeight: 800 }}>{t("cms.map.parentsTitle")}</Typography>
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("cms.map.parentsBody")}</Typography>
            </Card>
          </Box>
        </Box>
      )}

      {archiving && (
        <Dialog open onClose={() => setArchiving(null)} PaperProps={{ sx: { borderRadius: 5.5, p: 2.5, maxWidth: 460 } }}>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 22, mb: 1 }}>
            {t("cms.map.archiveTitle", { name: archiving.name })}
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 2 }}>{t("cms.map.archiveBody")}</Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button color="inherit" onClick={() => setArchiving(null)}>
              {t("cms.close")}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                const s = archiving;
                setArchiving(null);
                run(() => api.changeTrail(s.id, { archived: true }), t("cms.map.archivedMsg", { name: s.name }));
              }}
            >
              {t("cms.map.archiveGo")}
            </Button>
          </Box>
        </Dialog>
      )}
      {adding && (
        <Dialog open onClose={() => setAdding(null)} PaperProps={{ sx: { borderRadius: 5.5, p: 2.5, width: "100%", maxWidth: 520 } }}>
          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!unit.title.trim()) return;
              const sid = adding;
              const ok = await run(() => api.addUnit(sid, { ...unit, title: unit.title.trim() }), t("cms.map.unitAdded", { title: unit.title.trim() }));
              if (ok) setAdding(null);
            }}
          >
            <Typography component="h2" sx={{ fontWeight: 800, fontSize: 22 }}>
              {t("cms.map.addUnitTo", { name: subjects.find((s) => s.id === adding)?.name || "" })}
            </Typography>
            <UnitFields value={unit} onChange={setUnit} units={allUnits} />
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button color="inherit" onClick={() => setAdding(null)}>
                {t("cms.close")}
              </Button>
              <Button type="submit" variant="contained" disabled={busy}>
                {t("cms.map.addUnitGo")}
              </Button>
            </Box>
          </Box>
        </Dialog>
      )}
    </>
  );
}

