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
import Icon from "@/components/Icon";
import MediaImage from "@/components/MediaImage";

/**
 * P11 Add a card (BLD-01, BLD-02): a photo (camera or upload) or a library picture, the word,
 * an optional group for sorting, and the grown-up's own voice (hold to record).
 * @param {{ card: any, groups: string[], ensureConsent: (scope: "photos" | "voice") => Promise<boolean>, onSave: (card: any) => void, onCancel: () => void }} props
 */
export default function CardPanel({ card: start, groups, ensureConsent, onSave, onCancel }) {
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
    onSave({ ...card, label, group: String(card.group || "").trim() || undefined });
  };

  const pics = library ? searchLibrary(query).slice(0, 48) : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 560 }}>
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
          sx={{ borderWidth: 2 }}
        >
          {t("builder.photo")}
        </Button>
        <Button
          variant={library ? "contained" : "outlined"}
          onClick={() => setLibrary(!library)}
          startIcon={<Icon name="image" size={20} />}
          aria-pressed={library}
          sx={{ borderWidth: 2 }}
        >
          {t("builder.library")}
        </Button>
      </Box>
      {library && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
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
                    borderRadius: 3,
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
        </Box>
      )}
      <TextField
        label={t("builder.cardName")}
        placeholder={t("builder.cardNamePh")}
        value={card.label || ""}
        onChange={(e) => set({ label: e.target.value })}
        slotProps={{ htmlInput: { maxLength: LIMITS.label } }}
      />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField
          label={t("builder.group")}
          placeholder={t("builder.groupPh")}
          value={card.group || ""}
          onChange={(e) => set({ group: e.target.value })}
          size="small"
          slotProps={{ htmlInput: { maxLength: LIMITS.group } }}
        />
        {groups.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {groups.map((g) => (
              <Chip
                key={g}
                label={g}
                onClick={() => set({ group: card.group === g ? "" : g })}
                color={card.group === g ? "primary" : "default"}
                variant={card.group === g ? "filled" : "outlined"}
                aria-pressed={card.group === g}
              />
            ))}
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          border: `2px solid ${colors.line}`,
          borderRadius: 4.5,
          bgcolor: "background.paper",
        }}
      >
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
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>{t("builder.recordSub")}</Typography>
        </Box>
        {(card.voice || card.label) && (
          <Button size="small" variant="outlined" onClick={playVoice} sx={{ borderWidth: 2 }}>
            {t("builder.play")}
          </Button>
        )}
        {card.voice && (
          <IconButton aria-label={t("builder.removeVoice")} onClick={() => set({ voice: undefined })}>
            <Icon name="x" size={20} />
          </IconButton>
        )}
      </Box>
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
      <Box sx={{ display: "flex", gap: 1.25, justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={onCancel} sx={{ borderWidth: 2 }}>
          {t("builder.cancel")}
        </Button>
        <Button variant="contained" onClick={save} disabled={!!busy}>
          {t("builder.saveCard")}
        </Button>
      </Box>
    </Box>
  );
}
