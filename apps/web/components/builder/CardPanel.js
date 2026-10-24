"use client";
import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { searchLibrary } from "@trailbuddies/content";
import { LIMITS } from "@trailbuddies/domain";
import { preparePhoto, saveMedia, createRecorder, mediaUrl, StorageFullError } from "@/lib/media";
import { speak } from "@/lib/speech";
import Card from "@mui/material/Card";
import FamilyShell from "@/components/shell/FamilyShell";
import Icon from "@/components/Icon";
import MediaImage from "@/components/MediaImage";
import { ChoiceChip, Field, inputSx } from "./parts";

/** Suggested groups for sorting games (prototype P11); the grown-up can type their own too. */
const SUGGESTED = ["land", "water", "air", "home", "outside"];

/**
 * P11 Add a card (BLD-01, BLD-02): a photo (camera or upload) or a library picture, the word,
 * an optional fun fact, an optional group for sorting, and the grown-up's own voice (hold to
 * record). Its own screen: the back arrow cancels, Save card sits in the pinned footer.
 * @param {{ title: string, family: any, card: any, groups: string[], ensureConsent: (scope: "photos" | "voice") => Promise<boolean>, onSave: (card: any) => void, onCancel: () => void, children?: React.ReactNode }} props
 */
export default function CardPanel({
  title,
  family,
  card: start,
  groups,
  ensureConsent,
  onSave,
  onCancel,
  children,
}) {
  const [card, setCard] = useState(start);
  const [library, setLibrary] = useState(false);
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState(
    /** @type {null | "full" | "photo" | "mic" | "silent" | "name"} */ (null),
  );
  const [busy, setBusy] = useState(/** @type {null | "photo" | "rec" | "trim"} */ (null));
  const rec = useRef(/** @type {ReturnType<typeof createRecorder> | null} */ (null));
  const file = useRef(/** @type {HTMLInputElement | null} */ (null));
  const set = (patch) => setCard((c) => ({ ...c, ...patch }));
  // A group typed by hand stays in the box; picking a chip clears it.
  const [typed, setTyped] = useState(() =>
    start.group && !SUGGESTED.concat(groups).some((g) => g.toLowerCase() === start.group.toLowerCase())
      ? start.group
      : "",
  );

  const pickPhoto = async () => {
    if (await ensureConsent("photos")) file.current?.click();
  };
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setProblem(null);
    setBusy("photo");
    try {
      // Cropped, resized and re-encoded here: the saved copy has no EXIF (SAF-02).
      const id = await saveMedia("photo", await preparePhoto(f));
      setCard((c) => {
        const { emoji: _e, ...rest } = c;
        return { ...rest, photo: id };
      });
      setLibrary(false);
    } catch (err) {
      setProblem(err instanceof StorageFullError ? "full" : "photo");
    } finally {
      setBusy(null);
    }
  };

  const startRec = async (e) => {
    e.preventDefault();
    if (busy) return;
    setProblem(null);
    if (!(await ensureConsent("voice"))) return;
    try {
      rec.current = createRecorder();
      await rec.current.start();
      setBusy("rec");
    } catch {
      rec.current = null;
      setProblem("mic");
    }
  };
  const stopRec = async () => {
    if (!rec.current || busy !== "rec") return;
    const r = rec.current;
    rec.current = null;
    setBusy("trim");
    try {
      const clip = await r.stop();
      if (!clip) setProblem("silent");
      else set({ voice: await saveMedia("voice", clip) });
    } catch (err) {
      setProblem(err instanceof StorageFullError ? "full" : "mic");
    } finally {
      setBusy(null);
    }
  };
  const playVoice = async () => {
    const url = card.voice ? await mediaUrl(card.voice) : null;
    if (url) new Audio(url).play().catch(() => {});
    else speak(card.label);
  };
  const save = () => {
    const label = String(card.label || "").trim();
    if (!label) return setProblem("name");
    onSave({
      ...card,
      label,
      group: String(card.group || "").trim() || undefined,
      fact: String(card.fact || "").trim() || undefined,
    });
  };

  const pics = library ? searchLibrary(query).slice(0, 48) : [];
  const group = String(card.group || "");
  // The suggestions plus groups already used in this lesson, without repeats.
  const chips = [...SUGGESTED, ...groups].filter(
    (g, i, all) => all.findIndex((x) => x.toLowerCase() === g.toLowerCase()) === i,
  );

  return (
    <FamilyShell
      title={title}
      onBack={onCancel}
      family={family}
      active="/family/create"
      foot={
        <Button variant="contained" onClick={save} disabled={!!busy}>
          {t("builder.saveCard")}
        </Button>
      }
    >
      <Box
        sx={{
          height: 200,
          borderRadius: 5.5,
          bgcolor: colors.sand,
          display: "grid",
          placeItems: "center",
          fontSize: 110,
          lineHeight: 1,
          overflow: "hidden",
          position: "relative",
        }}
        aria-label={card.photo ? t("builder.photo") : card.emoji ? card.emoji : undefined}
      >
        {card.photo ? (
          <MediaImage id={card.photo} sx={{ width: "100%", height: "100%", borderRadius: 0 }} />
        ) : (
          card.emoji || "⭐"
        )}
        {card.photo && (
          <Chip
            size="small"
            color="success"
            label={t("builder.photoReady")}
            sx={{ position: "absolute", left: 10, top: 10, fontWeight: 800 }}
          />
        )}
      </Box>
      <input
        ref={file}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
        data-testid="photo-input"
      />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
        <Button
          variant="outlined"
          onClick={pickPhoto}
          disabled={busy === "photo"}
          startIcon={<Icon name="camera" size={20} />}
          sx={{ borderWidth: 2, minHeight: 52 }}
        >
          {t("builder.photo")}
        </Button>
        <Button
          variant={library ? "contained" : "outlined"}
          onClick={() => setLibrary(!library)}
          startIcon={<Icon name="image" size={20} />}
          aria-pressed={library}
          sx={{ borderWidth: 2, minHeight: 52 }}
        >
          {t("builder.library")}
        </Button>
      </Box>
      {library && (
        <Card sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 1.25 }}>
          <TextField
            label={t("builder.librarySearch")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            autoFocus
            slotProps={{ htmlInput: { maxLength: 30 } }}
          />
          {pics.length ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))",
                gap: 0.75,
                maxHeight: 248,
                overflow: "auto",
              }}
            >
              {pics.map((p) => (
                <Box
                  key={p.emoji}
                  component="button"
                  type="button"
                  aria-label={p.name}
                  title={p.name}
                  onClick={() => {
                    setCard((c) => {
                      const { photo: _p, ...rest } = c;
                      return {
                        ...rest,
                        emoji: p.emoji,
                        label: c.label || p.name[0].toUpperCase() + p.name.slice(1),
                      };
                    });
                    setLibrary(false);
                  }}
                  sx={{
                    fontSize: 28,
                    height: 52,
                    borderRadius: 2.5,
                    border: `2px solid ${card.emoji === p.emoji ? colors.leaf.main : colors.line}`,
                    bgcolor: "background.paper",
                    cursor: "pointer",
                  }}
                >
                  {p.emoji}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: "text.secondary" }}>{t("builder.libraryEmpty")}</Typography>
          )}
        </Card>
      )}
      <Field label={t("builder.cardName")} id="card-name">
        <TextField
          id="card-name"
          placeholder={t("builder.cardNamePh")}
          value={card.label || ""}
          onChange={(e) => set({ label: e.target.value })}
          slotProps={{ htmlInput: { maxLength: LIMITS.label } }}
          sx={inputSx}
        />
      </Field>
      <Field label={t("builder.fact")} id="card-fact">
        <TextField
          id="card-fact"
          placeholder={t("builder.factPh")}
          value={card.fact || ""}
          onChange={(e) => set({ fact: e.target.value })}
          slotProps={{ htmlInput: { maxLength: LIMITS.fact } }}
          sx={inputSx}
        />
      </Field>
      <Field label={t("builder.group")} id="card-group">
        <Box
          role="group"
          aria-label={t("builder.groupChips")}
          sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
        >
          {chips.map((g) => {
            const on = group.toLowerCase() === g.toLowerCase();
            return (
              <ChoiceChip
                key={g}
                on={on}
                onClick={() => {
                  setTyped("");
                  set({ group: on ? "" : g });
                }}
              >
                {g}
              </ChoiceChip>
            );
          })}
        </Box>
        <TextField
          id="card-group"
          placeholder={t("builder.groupPh")}
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            set({ group: e.target.value });
          }}
          size="small"
          slotProps={{ htmlInput: { maxLength: LIMITS.group } }}
          sx={{ ...inputSx, "& .MuiOutlinedInput-root": { bgcolor: "background.paper" }, maxWidth: 320 }}
        />
      </Field>
      <Card sx={{ p: 1.75, display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton
          aria-label={card.voice ? t("builder.reRecord") : t("builder.record")}
          aria-pressed={busy === "rec"}
          onPointerDown={startRec}
          onPointerUp={stopRec}
          onPointerLeave={stopRec}
          onPointerCancel={stopRec}
          onContextMenu={(e) => e.preventDefault()}
          sx={{
            width: 56,
            height: 56,
            flex: "none",
            border: `3px solid ${busy === "rec" ? colors.coral.main : colors.leaf.deep}`,
            color: busy === "rec" ? colors.coral.main : colors.leaf.deep,
            bgcolor: busy === "rec" ? colors.coral.soft : "background.paper",
            touchAction: "none",
          }}
        >
          <Icon name="mic" size={26} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>
            {busy === "rec"
              ? t("builder.recording")
              : card.voice
                ? t("builder.recorded")
                : t("builder.record")}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{t("builder.recordSub")}</Typography>
        </Box>
        {(card.voice || card.label) && (
          <Button size="small" variant="outlined" onClick={playVoice} sx={{ borderWidth: 2, minHeight: 40 }}>
            {t("builder.play")}
          </Button>
        )}
        {card.voice && (
          <IconButton aria-label={t("builder.removeVoice")} onClick={() => set({ voice: undefined })}>
            <Icon name="x" size={20} />
          </IconButton>
        )}
      </Card>
      {problem && (
        <Alert severity={problem === "full" ? "error" : "warning"} sx={{ borderRadius: 4 }}>
          {problem === "full" ? (
            <>
              <b>{t("builder.full")}</b>
              <br />
              {t("builder.fullSub")}
            </>
          ) : problem === "photo" ? (
            t("builder.photoFail")
          ) : problem === "mic" ? (
            t("builder.noMic")
          ) : problem === "silent" ? (
            t("builder.silent")
          ) : (
            t("builder.cardNeedsName")
          )}
        </Alert>
      )}
      {children}
    </FamilyShell>
  );
}
