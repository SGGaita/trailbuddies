"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ALL_ASSETS, assetSrc, searchLibrary } from "@trailbuddies/content";
import { validate } from "@trailbuddies/content-schema";
import {
  EXERCISE_TYPES,
  TAKES_CHOICES,
  can,
  fieldErrors,
  newItemId,
  removeItem,
  uploadAssetEntry,
  uploadedMediaId,
} from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { ulid } from "@trailbuddies/sync";
import { colors } from "@trailbuddies/tokens";
import { ChoiceChip, Field, Pill, inputSx } from "@/components/builder/parts";
import { api } from "@/lib/account";
import { previewHref } from "@/lib/cmsPreview";
import { checkImage, scanForServer } from "@/lib/imageCheck";
import { preparePhoto } from "@/lib/media";
import { StaffHead, useStaff } from "./StaffShell";

const BANDS = ["seedling", "sprout", "explorer", "voyager", "trailblazer"];
const clone = (x) => JSON.parse(JSON.stringify(x));

/** Approved illustrations from every built-in unit, to reuse in this one (the picture library). */
function libraryArt() {
  const seen = new Set();
  const out = [];
  for (const m of Object.values(ALL_ASSETS))
    for (const a of m?.assets || [])
      if (a.kind === "image" && a.review_status === "approved" && !seen.has(a.path)) {
        seen.add(a.path);
        out.push(a);
      }
  return out;
}

/** Where an item's picture comes from, for the tile. */
function picFor(item, manifest) {
  const a = item.image && manifest.assets.find((x) => x.id === item.image);
  if (!a) return null;
  const up = uploadedMediaId(a);
  return up ? api.contentAssetUrl(up) : assetSrc(a);
}

function Tile({ item, manifest, size = 52 }) {
  const src = picFor(item, manifest);
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 3.5,
        bgcolor: colors.sand,
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.55,
        backgroundImage: src ? `url("${src}")` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!src && (item.emoji || "⭐")}
    </Box>
  );
}

/** Validator wording, in plain words for the editor. */
const nice = (m) =>
  m
    .replace(/must NOT have fewer than 1 characters/, t("cms.err.empty"))
    .replace(/must NOT have more than (\d+) characters/, (_, n) => t("cms.err.long", { n }))
    .replace(/must NOT have fewer than (\d+) items/, (_, n) => t("cms.err.few", { n }));

const Err = ({ list }) =>
  list.length ? (
    <Box role="alert" sx={{ color: colors.bad.main, fontWeight: 700, fontSize: 13 }}>
      {list.join(" · ")}
    </Box>
  ) : null;

/**
 * The picture chooser (CMS-03): this unit's pictures, the approved library, an emoji, or an
 * upload. Uploads are cropped and re-encoded on this device (no EXIF), pass the on-device image
 * check, and children only see them once a reviewer or admin approves them.
 */
function PicturePicker({ item, manifest, onPick, onClose }) {
  const [tab, setTab] = useState(/** @type {"unit" | "library" | "emoji"} */ ("unit"));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const art = tab === "unit" ? manifest.assets.filter((a) => a.kind === "image") : tab === "library" ? libraryArt() : [];
  const upload = async (file) => {
    if (!file) return;
    setBusy(t("cms.pic.checking"));
    try {
      const blob = await preparePhoto(file);
      const check = await checkImage(blob, { faces: false });
      if (check.flagged) throw new Error(t("cms.pic.flagged"));
      const id = ulid();
      const r = await api.startContentAsset({ id, content_type: "image/jpeg", bytes: blob.size, label: item.label.slice(0, 80) });
      if (r.upload) {
        const put = await fetch(r.upload.url, { method: "PUT", body: blob, headers: r.upload.headers });
        if (!put.ok) throw new Error(t("cms.pic.uploadFailed"));
      }
      await api.completeContentAsset(id, scanForServer(check));
      onPick({ asset: uploadAssetEntry(id), upload: id });
    } catch (e) {
      setBusy(e.message);
      return;
    }
    setBusy("");
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 5.5, p: 2.25 } }}>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: 20, mb: 1 }}>
        {t("cms.pic.title", { word: item.label })}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }} role="group">
        {["unit", "library", "emoji"].map((k) => (
          <ChoiceChip key={k} on={tab === k} onClick={() => setTab(k)}>
            {t(`cms.pic.tab.${k}`)}
          </ChoiceChip>
        ))}
        <Button component="label" variant="outlined" size="small" sx={{ ml: "auto" }}>
          {t("cms.pic.upload")}
          <input hidden type="file" accept="image/*" data-testid="picture-file" onChange={(e) => upload(e.target.files?.[0])} />
        </Button>
      </Box>
      {busy && (
        <Alert severity="info" sx={{ borderRadius: 4, mb: 1.5 }} role="status">
          {busy}
        </Alert>
      )}
      {tab === "emoji" ? (
        <>
          <TextField size="small" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("cms.pic.search")} sx={{ ...inputSx, mb: 1.5 }} slotProps={{ htmlInput: { "aria-label": t("cms.pic.search") } }} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, maxHeight: 320, overflowY: "auto" }}>
            {searchLibrary(q)
              .slice(0, 120)
              .map((p) => (
                <Box
                  key={p.emoji}
                  component="button"
                  type="button"
                  title={p.name}
                  aria-label={p.name}
                  onClick={() => onPick({ emoji: p.emoji })}
                  sx={{ fontSize: 28, width: 52, height: 52, borderRadius: 3.5, border: `2px solid ${colors.line}`, bgcolor: "background.paper", cursor: "pointer" }}
                >
                  {p.emoji}
                </Box>
              ))}
          </Box>
        </>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 1, maxHeight: 360, overflowY: "auto" }}>
          {art.length === 0 && <Typography sx={{ color: "text.secondary", gridColumn: "1 / -1" }}>{t("cms.pic.none")}</Typography>}
          {art.map((a) => (
            <Box
              key={a.id + a.path}
              component="button"
              type="button"
              aria-label={a.id}
              data-pick={a.id}
              onClick={() => onPick({ asset: a })}
              sx={{
                aspectRatio: "1",
                borderRadius: 3.5,
                border: `2px solid ${item.image === a.id ? colors.leaf.deep : colors.line}`,
                bgcolor: colors.sand,
                backgroundImage: `url("${uploadedMediaId(a) ? api.contentAssetUrl(uploadedMediaId(a)) : assetSrc(a)}")`,
                backgroundSize: "cover",
                cursor: "pointer",
              }}
            />
          ))}
        </Box>
      )}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
        <Button color="inherit" onClick={() => onPick({ clear: true })}>
          {t("cms.pic.clear")}
        </Button>
        <Button onClick={onClose}>{t("cms.close")}</Button>
      </Box>
    </Dialog>
  );
}

/** E03 Unit & lesson editor (CMS-03, CMS-04). Mounted once the unit has loaded. */
function Editor({ loaded, me, onSaved, flash }) {
  const router = useRouter();
  const [unit, setUnit] = useState(() => clone(loaded.unit));
  const [manifest, setManifest] = useState(() => clone(loaded.assets));
  const [uploads, setUploads] = useState(() => ({ ...loaded.uploads }));
  const [dirty, setDirty] = useState(false);
  const [picking, setPicking] = useState(/** @type {number | null} */ (null));
  const [word, setWord] = useState("");
  const [serverProblems, setServerProblems] = useState(/** @type {string[]} */ ([]));
  const [msg, setMsg] = useState(/** @type {{ tone: "success" | "error", text: string } | null} */ (flash));
  const [busy, setBusy] = useState(false);
  const edit = can(me.role, "edit");

  const change = (next) => {
    setUnit(next);
    setDirty(true);
    setServerProblems([]);
  };
  const setField = (k, v) => change({ ...unit, [k]: v });
  const setItem = (i, patch) => {
    const items = unit.items.slice();
    items[i] = { ...items[i], ...patch };
    // Optional fields are left out when empty; the word stays, so the check can point at it.
    for (const k of Object.keys(patch)) if (k !== "label" && (patch[k] === "" || patch[k] == null)) delete items[i][k];
    change({ ...unit, items });
  };
  const setLesson = (li, patch) => change({ ...unit, lessons: unit.lessons.map((l, i) => (i === li ? { ...l, ...patch } : l)) });

  const { errors } = validate("unit", unit);
  const usedAssets = new Set(unit.items.map((i) => i.image).filter(Boolean));
  const missingArt = unit.items.filter((i) => i.image && !manifest.assets.some((a) => a.id === i.image)).map((i) => `/items item "${i.id}": its picture isn't in the unit`);
  const problems = fieldErrors([...errors, ...missingArt, ...serverProblems]).map((p) => ({ ...p, message: nice(p.message) }));
  const err = (field) => problems.filter((p) => p.field === field).map((p) => p.message);
  const errUnder = (prefix) => problems.filter((p) => p.field.startsWith(prefix)).map((p) => p.message);
  const blocked = problems.length > 0;

  const pick = (i, choice) => {
    const it = unit.items[i];
    if (choice.clear) setItem(i, { image: "" });
    else if (choice.emoji) setItem(i, { emoji: choice.emoji, image: "" });
    else if (choice.asset) {
      let a = choice.asset;
      if (!manifest.assets.some((x) => x.id === a.id)) {
        // A library picture from another unit: copied into this unit's list under a free id.
        let id = a.id;
        for (let n = 2; manifest.assets.some((x) => x.id === id); n++) id = `${a.id}-${n}`;
        a = { ...a, id };
        setManifest({ ...manifest, assets: [...manifest.assets, a] });
      }
      if (choice.upload) setUploads({ ...uploads, [choice.upload]: "waiting" });
      setItem(i, { image: a.id, emoji: it.emoji });
    }
    setPicking(null);
  };

  const addItem = (e) => {
    e.preventDefault();
    const label = word.trim();
    if (!label) return;
    const id = newItemId(label, unit.items.map((i) => i.id));
    // Every item must be taught somewhere: a new one joins the last lesson (change it below).
    const last = unit.lessons.length - 1;
    change({
      ...unit,
      items: [...unit.items, { id, label: label.toLowerCase(), emoji: "⭐" }],
      lessons: unit.lessons.map((l, i) => (i === last ? { ...l, focus: [...l.focus, id] } : l)),
    });
    setWord("");
  };
  const move = (i, d) => {
    const items = unit.items.slice();
    [items[i], items[i + d]] = [items[i + d], items[i]];
    change({ ...unit, items });
  };

  const save = async () => {
    setBusy(true);
    try {
      // Only pictures the unit still uses are kept in its list (built-in ones always stay).
      const keep = { ...manifest, assets: manifest.assets.filter((a) => !uploadedMediaId(a) || usedAssets.has(a.id)) };
      const r = await api.saveContentUnit(unit.id, unit, keep);
      onSaved(r);
    } catch (e) {
      setServerProblems(e.problems || []);
      setMsg({ tone: "error", text: e.message });
    }
    setBusy(false);
  };
  const preview = (step) => router.push(previewHref(unit, manifest, step));

  const waiting = unit.items.filter((i) => {
    const a = manifest.assets.find((x) => x.id === i.image);
    const id = uploadedMediaId(a);
    return id && uploads[id] !== "approved";
  });

  return (
    <>
      <StaffHead title={unit.title || t("cms.untitled")} sub={t("cms.unitSub", { id: unit.id })}>
        <Button component={Link} href="/admin/content" color="inherit">
          {t("cms.back")}
        </Button>
        <Button variant="outlined" disabled={blocked} onClick={() => preview(1)}>
          {t("cms.preview")}
        </Button>
        {edit && (
          <Button variant="contained" disabled={blocked || busy || !dirty} onClick={save}>
            {t("cms.save")}
          </Button>
        )}
      </StaffHead>
      {msg && (
        <Alert severity={msg.tone} onClose={() => setMsg(null)} sx={{ borderRadius: 4 }} role="status">
          {msg.text}
        </Alert>
      )}
      <Card sx={{ p: 1.75, bgcolor: loaded.changes.length || dirty ? colors.sun.soft : "background.paper" }} data-testid="unit-status">
        <Typography sx={{ fontSize: 14 }}>
          {dirty ? t("cms.unsaved") : loaded.changes.length ? t("cms.inDraft", { list: loaded.changes.join("; ") }) : t("cms.sameAsLive")}
        </Typography>
      </Card>

      <Box sx={{ display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.5fr) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Field label={t("cms.f.title")} id="u-title">
            <TextField id="u-title" value={unit.title} disabled={!edit} onChange={(e) => setField("title", e.target.value)} sx={inputSx} error={err("title").length > 0} />
          </Field>
          <Err list={err("title")} />
          <Field label={t("cms.f.summary")} id="u-summary">
            <TextField id="u-summary" value={unit.summary || ""} disabled={!edit} multiline minRows={2} onChange={(e) => setField("summary", e.target.value)} sx={inputSx} />
          </Field>
          <Err list={err("summary")} />
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Field label={t("cms.f.band")} id="u-band">
              <TextField id="u-band" select value={unit.band} disabled={!edit} onChange={(e) => setField("band", e.target.value)} sx={{ ...inputSx, minWidth: 180 }}>
                {BANDS.map((b) => (
                  <MenuItem key={b} value={b}>
                    {t(`band.${b}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
            <Field label={t("cms.f.status")} id="u-status">
              <TextField id="u-status" select value={unit.status} disabled={!can(me.role, "publish")} onChange={(e) => setField("status", e.target.value)} sx={{ ...inputSx, minWidth: 200 }}>
                {["draft", "ready"].map((s) => (
                  <MenuItem key={s} value={s}>
                    {t(`cms.status.${s}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
          </Box>

          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 18, mt: 1 }}>
            {t("cms.items", { n: unit.items.length })}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: -1 }}>{t("cms.itemsNote")}</Typography>
          <Err list={err("items")} />
          {unit.items.map((it, i) => (
            <Box key={it.id} data-item={it.id} sx={{ border: `2px solid ${errUnder(`items.${i}`).length ? colors.bad.main : colors.line}`, borderRadius: 4.5, p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", gap: 1.25, alignItems: "center" }}>
                <Box component="button" type="button" disabled={!edit} onClick={() => setPicking(i)} aria-label={t("cms.pic.change", { word: it.label })} sx={{ p: 0, border: 0, bgcolor: "transparent", cursor: edit ? "pointer" : "default", borderRadius: 3.5 }}>
                  <Tile item={it} manifest={manifest} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <b>{it.label || "…"}</b>{" "}
                  <Box component="span" sx={{ color: "text.secondary", fontSize: 13 }}>
                    · {t("cms.itemId", { id: it.id })}
                  </Box>
                  {waiting.includes(it) && (
                    <Box sx={{ mt: 0.5 }}>
                      <Pill tone="sun">{t("cms.pic.waiting")}</Pill>
                    </Box>
                  )}
                </Box>
                {edit && (
                  <>
                    <IconButton size="small" aria-label={t("cms.up", { word: it.label })} disabled={i === 0} onClick={() => move(i, -1)}>
                      ↑
                    </IconButton>
                    <IconButton size="small" aria-label={t("cms.down", { word: it.label })} disabled={i === unit.items.length - 1} onClick={() => move(i, 1)}>
                      ↓
                    </IconButton>
                    <Button size="small" color="error" onClick={() => change(removeItem(unit, it.id))}>
                      {t("cms.remove")}
                    </Button>
                  </>
                )}
              </Box>
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                <TextField size="small" label={t("cms.f.word")} value={it.label} disabled={!edit} onChange={(e) => setItem(i, { label: e.target.value })} slotProps={{ htmlInput: { "data-field": `items.${i}.label` } }} error={err(`items.${i}.label`).length > 0} />
                <TextField size="small" label={t("cms.f.say")} value={it.say || ""} disabled={!edit} onChange={(e) => setItem(i, { say: e.target.value })} />
                <TextField size="small" label={t("cms.f.fact")} value={it.fact || ""} disabled={!edit} onChange={(e) => setItem(i, { fact: e.target.value })} sx={{ gridColumn: { sm: "1 / -1" } }} slotProps={{ htmlInput: { "data-field": `items.${i}.fact` } }} />
              </Box>
              <Err list={errUnder(`items.${i}`)} />
            </Box>
          ))}
          {edit && (
            <Box component="form" onSubmit={addItem} sx={{ display: "flex", gap: 1, bgcolor: colors.sand, borderRadius: 4.5, p: 1.25 }}>
              <TextField size="small" value={word} onChange={(e) => setWord(e.target.value)} placeholder={t("cms.addPlaceholder")} slotProps={{ htmlInput: { "aria-label": t("cms.addItem") } }} sx={{ flex: 1, bgcolor: "background.paper" }} />
              <Button type="submit" variant="contained" size="small">
                {t("cms.add")}
              </Button>
            </Box>
          )}
        </Card>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
          {unit.lessons.map((l, li) => (
            <Card key={l.id} sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }} data-lesson={l.id}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField size="small" value={l.title} disabled={!edit} onChange={(e) => setLesson(li, { title: e.target.value })} slotProps={{ htmlInput: { "aria-label": t("cms.lessonTitle", { n: li + 1 }) } }} sx={{ flex: 1 }} />
                <Button size="small" disabled={blocked} onClick={() => preview(li + 1)}>
                  {t("cms.previewLesson")}
                </Button>
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary" }}>{t("cms.teaches")}</Typography>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {unit.items.map((it) => {
                  const on = l.focus.includes(it.id);
                  return (
                    <ChoiceChip key={it.id} on={on} disabled={!edit} onClick={() => setLesson(li, { focus: on ? l.focus.filter((f) => f !== it.id) : [...l.focus, it.id] })}>
                      {it.label}
                    </ChoiceChip>
                  );
                })}
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", mt: 0.5 }}>{t("cms.mix")}</Typography>
              {l.exercises.map((x, xi) => (
                <Box key={xi} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    select
                    size="small"
                    value={x.type}
                    disabled={!edit}
                    slotProps={{ htmlInput: { "aria-label": t("cms.exercise", { n: xi + 1 }) } }}
                    onChange={(e) => setLesson(li, { exercises: l.exercises.map((y, yi) => (yi === xi ? (TAKES_CHOICES.has(e.target.value) ? { ...y, type: e.target.value } : { type: e.target.value }) : y)) })}
                    sx={{ flex: 1 }}
                  >
                    {EXERCISE_TYPES.map((k) => (
                      <MenuItem key={k} value={k}>
                        {t(`cms.ex.${k}`)}
                      </MenuItem>
                    ))}
                  </TextField>
                  {TAKES_CHOICES.has(x.type) && (
                    <TextField
                      select
                      size="small"
                      value={x.choices || ""}
                      disabled={!edit}
                      slotProps={{ htmlInput: { "aria-label": t("cms.choices") } }}
                      onChange={(e) => setLesson(li, { exercises: l.exercises.map((y, yi) => (yi === xi ? (e.target.value ? { ...y, choices: Number(e.target.value) } : { type: y.type }) : y)) })}
                      sx={{ width: 110 }}
                    >
                      <MenuItem value="">{t("cms.choicesAuto")}</MenuItem>
                      {[2, 3, 4, 5, 6].map((n) => (
                        <MenuItem key={n} value={n}>
                          {t("cms.choicesN", { n })}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  {edit && (
                    <IconButton size="small" aria-label={t("cms.removeExercise", { n: xi + 1 })} disabled={l.exercises.length <= 3} onClick={() => setLesson(li, { exercises: l.exercises.filter((_, yi) => yi !== xi) })}>
                      ✕
                    </IconButton>
                  )}
                </Box>
              ))}
              {edit && l.exercises.length < 8 && (
                <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => setLesson(li, { exercises: [...l.exercises, { type: "listen-tap" }] })}>
                  {t("cms.addExercise")}
                </Button>
              )}
              <Err list={[...errUnder(`lessons.${li}`), ...err(`lesson:${l.id}`)]} />
            </Card>
          ))}
          <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0.75 }} data-testid="checks">
            <Typography sx={{ fontWeight: 800 }}>{t("cms.checks")}</Typography>
            {[
              ["schema", !blocked],
              ["ids", true],
              ["pictures", waiting.length === 0],
            ].map(([k, ok]) => (
              <Box key={k} sx={{ display: "flex", gap: 1, alignItems: "center", fontSize: 14 }}>
                <Pill tone={ok ? "ok" : k === "pictures" ? "sun" : "bad"}>{ok ? t("cms.ok") : k === "pictures" ? t("cms.wait") : t("cms.fix")}</Pill>
                {t(`cms.check.${k}`)}
              </Box>
            ))}
            {blocked && (
              <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 13, color: colors.bad.main }}>
                {problems.slice(0, 8).map((p, i) => (
                  <li key={i}>{p.message}</li>
                ))}
              </Box>
            )}
          </Card>
        </Box>
      </Box>
      {picking != null && <PicturePicker item={unit.items[picking]} manifest={manifest} onPick={(c) => pick(picking, c)} onClose={() => setPicking(null)} />}
    </>
  );
}

/** Loads the unit as the draft has it, then mounts the editor (a fresh one after each save). */
export default function UnitEditor({ id }) {
  const me = useStaff();
  const [loaded, setLoaded] = useState(/** @type {any} */ (null));
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    api.contentUnit(id).then(
      (d) => live && setLoaded(d),
      (e) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [id]);
  if (error)
    return (
      <Alert severity="warning" sx={{ borderRadius: 4 }}>
        {error} <Link href="/admin/content">{t("cms.back")}</Link>
      </Alert>
    );
  if (!loaded) return <Typography>{t("staff.loading")}</Typography>;
  return (
    <Editor
      key={round}
      loaded={loaded}
      me={me}
      flash={round ? { tone: "success", text: t("cms.saved") } : null}
      onSaved={(d) => {
        setLoaded(d);
        setRound((n) => n + 1);
      }}
    />
  );
}
