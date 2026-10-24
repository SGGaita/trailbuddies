"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Alert from "@mui/material/Alert";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { hashPin, pinProblem, needsPin, ageFrom, BREAK_CHOICES } from "@trailbuddies/domain";
import { economy } from "@trailbuddies/content";
import { useFamily } from "@/lib/store";

const LIMITS = [0, 10, 20, 30, 45, 60];
const RATES = [
  { v: 0.8, k: "settings.slow" },
  { v: 1, k: "settings.normal" },
  { v: 1.15, k: "settings.fast" },
];

const Row = ({ title, sub, children }) => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 1.5,
      py: 1.5,
      borderBottom: `1px solid ${colors.line}`,
      "&:last-of-type": { borderBottom: 0 },
    }}
  >
    <Box sx={{ flex: 1, minWidth: 180 }}>
      <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      {sub && <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{sub}</Typography>}
    </Box>
    {children}
  </Box>
);

/**
 * Daily goal, screen-time limit, bedtime lock, voice, voice speed, sound, break reminders
 * (PAR-04), captions (ACC-03), calm mode (ACC-02) and the treasure limit.
 */
export function FamilySettingsForm() {
  const settings = useFamily((s) => s.settings);
  const setSettings = useFamily((s) => s.setSettings);
  const bed = settings.bedtime;
  const group = (value, onChange, items, label) => (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, v) => v !== null && onChange(v)}
      aria-label={label}
    >
      {items.map(([v, text]) => (
        <ToggleButton
          key={String(v)}
          value={v}
          sx={{ minWidth: 48, minHeight: 44, fontWeight: 800, px: 1.5 }}
        >
          {text}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
  return (
    <Box>
      <Row title={t("settings.goal")} sub={t("settings.goalValue", { n: settings.goal })}>
        {group(
          settings.goal,
          (goal) => setSettings({ goal }),
          [1, 2, 3, 4, 5].map((n) => [n, String(n)]),
          t("settings.goal"),
        )}
      </Row>
      <Row title={t("settings.limit")}>
        {group(
          settings.limit,
          (limit) => setSettings({ limit }),
          LIMITS.map((n) => [n, n ? t("settings.minutes", { n }) : t("settings.noLimit")]),
          t("settings.limit"),
        )}
      </Row>
      <Row title={t("settings.bedtime")} sub={t("settings.bedtimeSub")}>
        <Switch
          checked={bed.on}
          onChange={(e) => setSettings({ bedtime: { ...bed, on: e.target.checked } })}
          slotProps={{ input: { "aria-label": t("settings.bedtime") } }}
        />
        {bed.on && (
          <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
            <TextField
              type="time"
              size="small"
              label={t("settings.from")}
              value={bed.start}
              onChange={(e) => e.target.value && setSettings({ bedtime: { ...bed, start: e.target.value } })}
            />
            <TextField
              type="time"
              size="small"
              label={t("settings.to")}
              value={bed.end}
              onChange={(e) => e.target.value && setSettings({ bedtime: { ...bed, end: e.target.value } })}
            />
          </Box>
        )}
      </Row>
      <Row title={t("settings.voice")}>
        <Switch
          checked={settings.voice}
          onChange={(e) => setSettings({ voice: e.target.checked })}
          slotProps={{ input: { "aria-label": t("settings.voice") } }}
        />
      </Row>
      <Row title={t("settings.voiceRate")}>
        {group(
          settings.voice_rate,
          (voice_rate) => setSettings({ voice_rate }),
          RATES.map((r) => [r.v, t(r.k)]),
          t("settings.voiceRate"),
        )}
      </Row>
      <Row title={t("settings.sound")}>
        <Switch
          checked={settings.sound}
          onChange={(e) => setSettings({ sound: e.target.checked })}
          slotProps={{ input: { "aria-label": t("settings.sound") } }}
        />
      </Row>
      <Row title={t("settings.breaks")} sub={t("settings.breaksSub")}>
        {group(
          settings.breaks || 0,
          (breaks) => setSettings({ breaks }),
          BREAK_CHOICES.map((n) => [n, n ? String(n) : t("settings.off")]),
          t("settings.breaks"),
        )}
      </Row>
      <Row title={t("settings.captions")} sub={t("settings.captionsSub")}>
        <Switch
          checked={settings.captions !== false}
          onChange={(e) => setSettings({ captions: e.target.checked })}
          slotProps={{ input: { "aria-label": t("settings.captions") } }}
        />
      </Row>
      <Row title={t("settings.calm")} sub={t("settings.calmSub")}>
        {group(
          settings.calm || "device",
          (calm) => setSettings({ calm }),
          [
            ["device", t("settings.calmDevice")],
            ["on", t("settings.on")],
            ["off", t("settings.off")],
          ],
          t("settings.calm"),
        )}
      </Row>
      <Row title={t("settings.cap")} sub={t("settings.capSub", { n: economy.dailyCap })}>
        <Switch
          checked={settings.treasure_cap !== false}
          onChange={(e) => setSettings({ treasure_cap: e.target.checked })}
          slotProps={{ input: { "aria-label": t("settings.cap") } }}
        />
      </Row>
    </Box>
  );
}

/** Set, change or remove the grown-up PIN. Hashed on this device; the PIN never leaves it. */
export function PinSetup() {
  const family = useFamily((s) => s.family);
  const learners = useFamily((s) => s.learners);
  const setPin = useFamily((s) => s.setPin);
  const [editing, setEditing] = useState(false);
  const [pin, setPinText] = useState("");
  const [error, setError] = useState("");
  const suggested = needsPin(learners.map((l) => ageFrom(l.birth)));
  const has = !!family?.pin;

  const save = async (e) => {
    e.preventDefault();
    const problem = pinProblem(pin);
    if (problem) return setError(t(problem === "easy" ? "settings.pinEasy" : "settings.pinLength"));
    setPin(await hashPin(pin));
    setPinText("");
    setEditing(false);
    setError("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box>
        <Typography sx={{ fontWeight: 800 }}>{t("settings.pin")}</Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
          {has ? t("settings.pinOn") : t("settings.pinSub")}
        </Typography>
      </Box>
      {suggested && !has && !editing && <Alert severity="info">{t("settings.pinSub")}</Alert>}
      {editing ? (
        <Box
          component="form"
          onSubmit={save}
          sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}
          noValidate
        >
          <TextField
            label={t("settings.newPin")}
            value={pin}
            onChange={(e) => setPinText(e.target.value.replace(/\D/g, "").slice(0, 4))}
            type="password"
            autoComplete="new-password"
            error={!!error}
            helperText={error || " "}
            autoFocus
            slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 4, pattern: "[0-9]*" } }}
          />
          <Button type="submit" variant="contained" sx={{ mt: 0.5 }}>
            {t("settings.savePin")}
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant={suggested && !has ? "contained" : "outlined"}
            sx={{ borderWidth: 2 }}
            onClick={() => setEditing(true)}
          >
            {has ? t("settings.changePin") : t("settings.setPin")}
          </Button>
          {has && <Button onClick={() => setPin(null)}>{t("settings.removePin")}</Button>}
        </Box>
      )}
    </Box>
  );
}
