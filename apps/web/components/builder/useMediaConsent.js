"use client";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { useFamily } from "@/lib/store";
import { api, refreshAccount } from "@/lib/account";

/**
 * SAF-02: photos and voice clips need the family's consent for that kind of media. Ask for it
 * the first time a grown-up adds one (Lesson Builder cards, Badge Studio).
 * @param {(message: string) => void} onError
 * @returns {{ ensureConsent: (scope: "photos" | "voice") => Promise<boolean>, dialog: React.ReactNode }}
 */
export function useMediaConsent(onError) {
  const [ask, setAsk] = useState(
    /** @type {null | { scope: "photos" | "voice", resolve: (ok: boolean) => void }} */ (null),
  );
  const ensureConsent = (scope) => {
    const s = useFamily.getState();
    if (s.mode !== "account" || s.family?.consent?.scopes?.[scope]) return Promise.resolve(true);
    return new Promise((resolve) => setAsk({ scope, resolve }));
  };
  const answer = async (ok) => {
    const a = ask;
    setAsk(null);
    if (!ok) return a.resolve(false);
    try {
      const s = useFamily.getState();
      const c = s.family.consent;
      await api.giveConsent(s.family.id, { policy_version: c.policy_version, scopes: { ...c.scopes, [a.scope]: true } });
      await refreshAccount();
      a.resolve(true);
    } catch {
      onError(t("builder.photoFail"));
      a.resolve(false);
    }
  };
  const dialog = (
    <Dialog
      open={!!ask}
      onClose={() => answer(false)}
      slotProps={{ paper: { sx: { borderRadius: 5.5, p: 3, maxWidth: 460, gap: 1.5 } } }}
    >
      <Typography variant="h6" component="h2">
        {ask?.scope === "voice" ? t("builder.allowVoice") : t("builder.allowPhotos")}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>{t("builder.allowSub")}</Typography>
      <Box sx={{ display: "flex", gap: 1.25, justifyContent: "flex-end" }}>
        <Button onClick={() => answer(false)}>{t("builder.notNow")}</Button>
        <Button variant="contained" onClick={() => answer(true)} autoFocus>
          {t("builder.allow")}
        </Button>
      </Box>
    </Dialog>
  );
  return { ensureConsent, dialog };
}
