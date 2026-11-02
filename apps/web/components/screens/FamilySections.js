"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { SOUNDS, recordedCount } from "@trailbuddies/domain";
import { useFamily, DEFAULT_SETTINGS } from "@/lib/store";
import { Frame } from "./SettingsSections";

/** PAR-07, BDG-06: which emails parents get. Wish emails start with the wishes feature. */
export function EmailsSection({ disabled }) {
  const saved = useFamily((s) => s.settings.emails);
  const emails = { ...DEFAULT_SETTINGS.emails, ...(saved || {}) };
  const setSettings = useFamily((s) => s.setSettings);
  const set = (k, v) => setSettings({ emails: { ...emails, [k]: v } });
  const row = (k, sub) => (
    <FormControlLabel
      key={k}
      sx={{ display: "flex", alignItems: "flex-start", m: 0, py: 0.5, gap: 1 }}
      control={
        <Switch
          checked={!!emails[k]}
          disabled={disabled || k === "wishes"}
          onChange={(e) => set(k, e.target.checked)}
        />
      }
      label={
        <Box sx={{ pt: 1 }}>
          <Typography sx={{ fontWeight: 800 }}>{t(`emails.${k}`)}</Typography>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{sub}</Typography>
        </Box>
      }
    />
  );
  return (
    <Frame title={t("emails.title")} sub={t("emails.sub")}>
      {row("digest", t("emails.digestSub"))}
      {row("badges", t("emails.badgesSub"))}
      {row("wishes", t("emails.wishesSub"))}
    </Frame>
  );
}

/** LES-19: how many letter sounds are recorded, and the way in. */
export function SoundsSection() {
  const sounds = useFamily((s) => s.sounds);
  return (
    <Frame
      title={t("sounds.title")}
      sub={t("sounds.count", { n: recordedCount(sounds), total: SOUNDS.length })}
    >
      <Typography sx={{ mb: 1.5 }}>{t("sounds.sectionSub")}</Typography>
      <Button component={Link} href="/family/sounds" variant="outlined" sx={{ borderWidth: 2 }}>
        {t("sounds.open")}
      </Button>
    </Frame>
  );
}
