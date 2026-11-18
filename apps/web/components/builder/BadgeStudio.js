"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";
import { canEdit } from "@/lib/account";
import { familyDb } from "@/lib/db";
import { dbName, useFamily, useHydrated } from "@/lib/store";

const DRAFT_KEY = "badge-design-draft";
const EMPTY_DRAFT = { name: "", shape: "circle", colour: "blue", icon: "star" };
const SHAPES = {
  circle: "circle(50%)",
  square: "inset(4% round 18%)",
  diamond: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
  arch: "inset(4% round 50% 50% 16% 16%)",
};
const COLOURS = {
  blue: [colors.sky.deep, colors.sky.soft],
  green: [colors.leaf.deep, colors.leaf.soft],
  pink: [colors.berry.deep, colors.berry.soft],
  yellow: [colors.sun.deep, colors.sun.soft],
};
const ICONS = { star: "⭐", plant: "🌱", heart: "💛", trophy: "🏆" };

export default function BadgeStudio() {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const name = useFamily(dbName);
  const editable = useFamily((s) => (s.mode === "account" || s.mode === "demo") && canEdit(s));
  if (!ready) return <Loading />;
  return (
    <FamilyShell
      title={t("builder.tile.badge")}
      back="/family/create"
      active="/family/create"
      family={family}
    >
      {name && editable ? (
        <BadgeDesign key={name} databaseName={name} />
      ) : (
        <Alert severity="info">{t("builder.viewOnly")}</Alert>
      )}
    </FamilyShell>
  );
}

function DesignChoice({ field, choices, value, onChange, disabled }) {
  return (
    <Box component="fieldset" disabled={disabled} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Typography component="legend" sx={{ fontWeight: 800, mb: 0.75 }}>
        {t(`badgeStudio.${field}`)}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {Object.keys(choices).map((choice) => (
          <Button
            key={choice}
            type="button"
            aria-pressed={value === choice}
            variant={value === choice ? "contained" : "outlined"}
            onClick={() => onChange(choice)}
          >
            {field === "icon" && <span aria-hidden="true">{ICONS[choice]}&nbsp;</span>}
            {t(`badgeStudio.${choice}`)}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

function BadgeDesign({ databaseName }) {
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    familyDb(databaseName)
      .meta.get(DRAFT_KEY)
      .then(
        (entry) => active && setDraft({ ...EMPTY_DRAFT, ...entry?.value }),
        () => active && setStatus("loadError"),
      );
    return () => {
      active = false;
    };
  }, [databaseName]);

  if (!draft) {
    return status === "loadError" ? (
      <Alert severity="warning">{t("badgeStudio.loadError")}</Alert>
    ) : (
      <Loading />
    );
  }

  const update = (field, value) => {
    setStatus("");
    setDraft((current) => ({ ...current, [field]: value }));
  };
  async function save(event) {
    event.preventDefault();
    if (saving || !draft.name.trim()) return;
    setSaving(true);
    setStatus("");
    try {
      await familyDb(databaseName).meta.put({ key: DRAFT_KEY, value: { ...draft, name: draft.name.trim() } });
      setStatus("saved");
    } catch {
      setStatus("saveError");
    } finally {
      setSaving(false);
    }
  }

  const [rim, fill] = COLOURS[draft.colour];
  return (
    <Card sx={{ p: { xs: 2, sm: 3 }, width: "100%", maxWidth: 640, mx: "auto" }}>
      <Box component="form" onSubmit={save} sx={{ display: "grid", gap: 2 }}>
        <Box component="figure" aria-label={t("badgeStudio.preview")} sx={{ m: 0, textAlign: "center" }}>
          <Box
            aria-hidden="true"
            sx={{
              width: 144,
              height: 144,
              mx: "auto",
              display: "grid",
              placeItems: "center",
              bgcolor: rim,
              clipPath: SHAPES[draft.shape],
            }}
          >
            <Box
              sx={{
                width: 124,
                height: 124,
                display: "grid",
                placeItems: "center",
                clipPath: SHAPES[draft.shape],
                bgcolor: fill,
                fontSize: 50,
              }}
            >
              {ICONS[draft.icon]}
            </Box>
          </Box>
          <Typography component="figcaption" variant="h6" sx={{ mt: 1, overflowWrap: "anywhere" }}>
            {draft.name.trim() || t("badgeStudio.untitled")}
          </Typography>
        </Box>
        <TextField
          required
          disabled={saving}
          label={t("badgeStudio.name")}
          value={draft.name}
          onChange={(event) => update("name", event.target.value)}
          slotProps={{ htmlInput: { maxLength: 60 } }}
        />
        <DesignChoice
          field="shape"
          choices={SHAPES}
          value={draft.shape}
          onChange={(v) => update("shape", v)}
          disabled={saving}
        />
        <DesignChoice
          field="colour"
          choices={COLOURS}
          value={draft.colour}
          onChange={(v) => update("colour", v)}
          disabled={saving}
        />
        <DesignChoice
          field="icon"
          choices={ICONS}
          value={draft.icon}
          onChange={(v) => update("icon", v)}
          disabled={saving}
        />
        <Button type="submit" variant="contained" disabled={saving || !draft.name.trim()}>
          {t("badgeStudio.save")}
        </Button>
        {status && (
          <Alert severity={status === "saved" ? "success" : "warning"}>{t(`badgeStudio.${status}`)}</Alert>
        )}
      </Box>
    </Card>
  );
}
