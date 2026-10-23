"use client";
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { useFamily } from "@/lib/store";
import { refreshUploadStatus } from "@/lib/media";
import { retryUploads } from "@/lib/account";
import MediaImage from "@/components/MediaImage";

/** A card's picture in a square tile: the photo, the library picture, or a star. */
export function CardPic({ card, size = 56, radius = 3.5 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: radius,
        bgcolor: colors.sand,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        fontSize: size * 0.6,
        lineHeight: 1,
      }}
    >
      {card?.photo ? (
        <MediaImage id={card.photo} sx={{ width: "100%", height: "100%", borderRadius: 0 }} />
      ) : (
        card?.emoji || "⭐"
      )}
    </Box>
  );
}

/**
 * BLD-16: photos and recordings that haven't uploaded yet. The cards already work on this
 * device; Retry tries again now (after 3 failed tries uploads wait for this button).
 */
export function UploadBanner() {
  const uploads = useFamily((s) => s.uploads);
  const mode = useFamily((s) => s.mode);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    refreshUploadStatus();
  }, []);
  if (mode !== "account" || !uploads?.waiting) return null;
  return (
    <Alert
      severity={uploads.failed ? "warning" : "info"}
      action={
        <Button
          color="inherit"
          size="small"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await retryUploads();
            setBusy(false);
          }}
        >
          {t("builder.retry")}
        </Button>
      }
      sx={{ borderRadius: 4 }}
    >
      <b>{uploads.waiting === 1 ? t("builder.waitingOne") : t("builder.waiting", { n: uploads.waiting })}</b>
      <br />
      {t("builder.waitingSub")}
    </Alert>
  );
}
