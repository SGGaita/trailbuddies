"use client";
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
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

/** Prototype `.field`: a small label above the input (not a floating label). */
export function Field({ label, id, children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography
        component="label"
        htmlFor={id}
        sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary" }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

/** Prototype `.inp`: white, 48px tall, 2px sand border, 14px corners. Spread into a TextField's sx. */
export const inputSx = {
  "& .MuiOutlinedInput-root": { bgcolor: "background.paper", minHeight: 48, fontSize: 16 },
  "& .MuiOutlinedInput-notchedOutline": { borderWidth: 2, borderColor: colors.line },
};

/** Prototype `.chip`: a toggle pill; dark green when pressed. */
export function ChoiceChip({ on, onClick, children, ...rest }) {
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={on}
      onClick={onClick}
      sx={{
        border: `2px solid ${on ? colors.leaf.deep : colors.line}`,
        bgcolor: on ? colors.leaf.deep : "background.paper",
        color: on ? "#fff" : "text.primary",
        borderRadius: 999,
        px: "13px",
        py: "7px",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "inherit",
        lineHeight: 1.4,
        cursor: "pointer",
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

/** Prototype `.pill`: small capitals in a soft tag (Chosen, Soon). */
export function Pill({ children, tone = "ok" }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        borderRadius: 999,
        px: "9px",
        py: "3px",
        whiteSpace: "nowrap",
        bgcolor: tone === "ok" ? colors.leaf.soft : colors.sand,
        color: tone === "ok" ? colors.leaf.deep : "text.secondary",
      }}
    >
      {children}
    </Box>
  );
}
