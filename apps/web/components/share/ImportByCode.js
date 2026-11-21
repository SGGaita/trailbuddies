"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatShareCode, normaliseShareCode, validShareCode } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import CustomBadgeArt from "@/components/rewards/CustomBadgeArt";
import { api } from "@/lib/account";

/** A shared card's picture in the preview: its photo through the share, or its emoji. */
function SharedPic({ code, card }) {
  return (
    <Box
      component="span"
      role="img"
      aria-label={card.label}
      sx={{
        width: 48,
        height: 48,
        borderRadius: 3,
        bgcolor: colors.sand,
        display: "grid",
        placeItems: "center",
        fontSize: 26,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundImage: card.photo ? `url("${api.shareMediaUrl(code, card.photo)}")` : "none",
      }}
    >
      {card.photo ? null : card.emoji || "⭐"}
    </Box>
  );
}

/**
 * P23 Import by code (SHR-02): type a code, see what it holds, add your own copy. The copy is
 * yours: the creator's later edits, or stopping the code, never change it.
 * @param {{ target: { familyId?: string, classId?: string }, initial?: string,
 *   onImported: (r: { lessons: any[], badges: any[] }) => void, disabled?: boolean }} props
 */
export default function ImportByCode({ target, initial = "", onImported, disabled = false }) {
  const [code, setCode] = useState(initial);
  const [found, setFound] = useState(/** @type {any} */ (null));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const find = async (e) => {
    e?.preventDefault();
    setFound(null);
    setError("");
    if (!validShareCode(code)) return setError(t("import.badCode"));
    setBusy(true);
    try {
      setFound(await api.sharePreview(normaliseShareCode(code)));
    } catch (err) {
      setError(err.code === "review" ? t("import.review") : err.status === 410 ? t("import.gone") : t("import.notFound"));
    } finally {
      setBusy(false);
    }
  };
  const add = async () => {
    setBusy(true);
    try {
      const r = await api.importShare(normaliseShareCode(found.code), target);
      setFound(null);
      setCode("");
      onImported(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const pkg = found?.package;
  const forClass = Boolean(target.classId);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box component="form" onSubmit={find} sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
        <TextField
          label={t("import.code")}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 7))}
          placeholder="ABC-DEF"
          autoComplete="off"
          slotProps={{ htmlInput: { style: { font: "800 22px ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: ".08em" } } }}
          sx={{ width: 220 }}
        />
        <Button type="submit" variant="contained" disabled={busy || !code} sx={{ mt: 1 }}>
          {t("import.find")}
        </Button>
      </Box>
      {error && (
        <Alert severity="warning" sx={{ borderRadius: 4 }}>
          {error}
        </Alert>
      )}
      {found && (
        <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25 }} data-testid="share-preview">
          <Typography sx={{ fontWeight: 800, fontSize: 19 }}>{found.title}</Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {t("import.by", { who: found.by, code: formatShareCode(found.code) })} ·{" "}
            {found.cards ? t("import.cards", { n: found.cards }) : t("import.badges", { n: found.badges })}
          </Typography>
          {pkg.lessons.map((l, i) => (
            <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {pkg.lessons.length > 1 && <Typography sx={{ fontWeight: 700 }}>{`${i + 1}. ${l.title}`}</Typography>}
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {l.cards.map((c) => (
                  <SharedPic key={c.id} code={found.code} card={c} />
                ))}
              </Box>
            </Box>
          ))}
          {pkg.badges.length > 0 && (
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {pkg.badges.map((b, i) => (
                <Box key={i} sx={{ textAlign: "center", width: 96 }}>
                  <CustomBadgeArt badge={{ ...b.design, photo: null, name: b.name }} size={72} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{b.name}</Typography>
                </Box>
              ))}
            </Box>
          )}
          {found.own && !forClass ? (
            <Alert severity="info">{t("import.own")}</Alert>
          ) : forClass && pkg.lessons.length ? (
            <Alert severity="info">{t("import.lessonsForFamilies")}</Alert>
          ) : (
            <Button variant="contained" color="secondary" onClick={add} disabled={busy || disabled} sx={{ alignSelf: "flex-start" }}>
              {t("import.add")}
            </Button>
          )}
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>{t("import.yourCopy")}</Typography>
        </Card>
      )}
    </Box>
  );
}
