"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
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
import StaffDialog from "./StaffDialog";
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

/** A choice card: big, tappable, with a line saying what it does. */
function StartCard({ on, title, hint, onClick, testid }) {
  return (
    <Box
      component="button"
      type="button"
      role="radio"
      aria-checked={on}
      data-testid={testid}
      onClick={onClick}
      sx={{
        textAlign: "left",
        font: "inherit",
        cursor: "pointer",
        p: 1.5,
        borderRadius: 4.5,
        border: `2px solid ${on ? colors.leaf.deep : colors.line}`,
        bgcolor: on ? colors.leaf.soft : "background.paper",
        color: "text.primary",
        display: "flex",
        gap: 1.25,
        alignItems: "flex-start",
      }}
    >
      <Box aria-hidden sx={{ mt: 0.25, width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${on ? colors.leaf.deep : colors.line}`, display: "grid", placeItems: "center" }}>
        {on && <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colors.leaf.deep }} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box component="b" sx={{ display: "block", fontSize: 15 }}>
          {title}
        </Box>
        <Box component="span" sx={{ fontSize: 13, color: "text.secondary" }}>
          {hint}
        </Box>
      </Box>
    </Box>
  );
}

/** A new unit: blank (four starter words) or a copy of another unit's lessons (CMS-05). */
function UnitFields({ value, onChange, subjects, idPrefix = "nu" }) {
  const copying = value.copy_from !== null && value.copy_from !== undefined;
  const trails = subjects.filter((s) => s.units.some((u) => u.has_content));
  const first = trails[0]?.units.find((u) => u.has_content)?.id || "";
  return (
    <>
      <Field label={t("cms.map.unitTitle")} id={`${idPrefix}-title`}>
        <TextField
          id={`${idPrefix}-title`}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          sx={inputSx}
          placeholder={t("cms.map.unitPh")}
          slotProps={{ htmlInput: { maxLength: 60 } }}
        />
      </Field>
      <Field label={t("cms.f.band")} id={`${idPrefix}-band`}>
        <TextField id={`${idPrefix}-band`} select value={value.band} onChange={(e) => onChange({ ...value, band: e.target.value })} sx={inputSx}>
          {BANDS.map((b) => (
            <MenuItem key={b} value={b}>
              {t(`band.${b}`)}
            </MenuItem>
          ))}
        </TextField>
      </Field>
      <Box role="radiogroup" aria-label={t("cms.map.startFrom")} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary" }}>{t("cms.map.startFrom")}</Typography>
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <StartCard testid={`${idPrefix}-blank`} on={!copying} title={t("cms.map.blankTitle")} hint={t("cms.map.blankHint")} onClick={() => onChange({ ...value, copy_from: null })} />
          <StartCard testid={`${idPrefix}-copy`} on={copying} title={t("cms.map.copyTitle")} hint={t("cms.map.copyHint")} onClick={() => onChange({ ...value, copy_from: value.copy_from || first })} />
        </Box>
      </Box>
      {copying && (
        <Field label={t("cms.map.copyWhich")} id={`${idPrefix}-from`}>
          <TextField id={`${idPrefix}-from`} select value={value.copy_from} onChange={(e) => onChange({ ...value, copy_from: e.target.value })} sx={inputSx}>
            {trails.flatMap((s) => [
              <ListSubheader key={`h-${s.id}`} sx={{ fontWeight: 800, lineHeight: "36px" }}>
                {s.name}
              </ListSubheader>,
              ...s.units
                .filter((u) => u.has_content)
                .map((u) => (
                  <MenuItem key={u.id} value={u.id} sx={{ pl: 3 }}>
                    {u.title}
                  </MenuItem>
                )),
            ])}
          </TextField>
        </Field>
      )}
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
                {adding == null && <UnitFields value={unit} onChange={setUnit} subjects={subjects} />}
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
        <StaffDialog
          size="xs"
          tone="danger"
          title={t("cms.map.archiveTitle", { name: archiving.name })}
          onClose={() => setArchiving(null)}
          actions={
            <>
              <Button color="inherit" onClick={() => setArchiving(null)}>
                {t("cms.cancel")}
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
            </>
          }
        >
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <IslandThumb s={archiving} width={88} />
            <Box>
              <b>{archiving.name}</b>
              <br />
              <Box component="span" sx={{ color: "text.secondary", fontSize: 14 }}>
                {t("cms.map.unitsCount", { n: archiving.units.length })}
              </Box>
            </Box>
          </Box>
          <Box component="ul" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.5, fontSize: 15 }}>
            <li>{t("cms.map.archiveLeaves")}</li>
            <li>{t("cms.map.archiveKeeps")}</li>
            <li>{t("cms.map.archiveBack")}</li>
          </Box>
        </StaffDialog>
      )}
      {adding && (
        <StaffDialog
          title={t("cms.map.addUnitTo", { name: subjects.find((s) => s.id === adding)?.name || "" })}
          sub={t("cms.map.addUnitSub")}
          onClose={() => setAdding(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!unit.title.trim()) return;
            const sid = adding;
            const ok = await run(() => api.addUnit(sid, { ...unit, title: unit.title.trim() }), t("cms.map.unitAdded", { title: unit.title.trim() }));
            if (ok) setAdding(null);
          }}
          actions={
            <>
              {!unit.title.trim() && (
                <Typography sx={{ mr: "auto", fontSize: 13, color: "text.secondary" }} role="status">
                  {t("cms.map.needUnitName")}
                </Typography>
              )}
              <Button color="inherit" onClick={() => setAdding(null)}>
                {t("cms.cancel")}
              </Button>
              <Button type="submit" variant="contained" disabled={busy || !unit.title.trim()}>
                {t("cms.map.addUnitGo")}
              </Button>
            </>
          }
        >
          <UnitFields value={unit} onChange={setUnit} subjects={subjects} idPrefix="dlg" />
        </StaffDialog>
      )}
    </>
  );
}
