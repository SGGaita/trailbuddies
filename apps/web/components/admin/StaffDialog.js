"use client";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";

/**
 * One dialog for every staff screen (prototype dialog: 22px corners, 24px padding). A header
 * with the title, an optional line under it and a close button; content that scrolls on its
 * own; a footer with the actions, always in view. Full screen on a phone.
 *
 * @param {{
 *   title: string,
 *   sub?: string,
 *   onClose: () => void,
 *   actions?: import("react").ReactNode,
 *   onSubmit?: (e: import("react").FormEvent) => void,
 *   size?: "xs" | "sm" | "md",
 *   tone?: "danger",
 *   children: import("react").ReactNode,
 * }} props
 */
export default function StaffDialog({ title, sub, onClose, actions, onSubmit, size = "sm", tone, children }) {
  const phone = useMediaQuery("(max-width:599.95px)");
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth={size}
      fullScreen={phone}
      aria-labelledby="staff-dialog-title"
      slotProps={{
        paper: {
          component: onSubmit ? "form" : "div",
          onSubmit,
          sx: { borderRadius: phone ? 0 : 5.5, display: "flex", flexDirection: "column", maxHeight: phone ? "100%" : "min(88dvh, 820px)", overflow: "hidden" },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.75 },
          pb: 1.75,
          borderBottom: `1px solid ${colors.line}`,
          ...(tone === "danger" ? { borderTop: `6px solid ${colors.bad.main}` } : {}),
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id="staff-dialog-title" component="h2" sx={{ fontWeight: 800, fontSize: { xs: 20, sm: 22 }, lineHeight: 1.25 }}>
            {title}
          </Typography>
          {sub && <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 0.5 }}>{sub}</Typography>}
        </Box>
        <IconButton aria-label={t("cms.close")} onClick={onClose} sx={{ mt: -0.5, mr: -1, width: 44, height: 44, borderRadius: 4, fontSize: 20 }}>
          ✕
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, sm: 3 }, py: 2.25, display: "flex", flexDirection: "column", gap: 2 }}>{children}</Box>
      {actions && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignItems: "center",
            px: { xs: 2, sm: 3 },
            py: 1.75,
            borderTop: `1px solid ${colors.line}`,
            bgcolor: colors.cream,
            "& > .MuiButton-root": { minHeight: 46, px: 2.5 },
          }}
        >
          {actions}
        </Box>
      )}
    </Dialog>
  );
}

/** A labelled group inside a dialog (e.g. "Picture", "Earned when"). */
export function DialogSection({ title, hint, children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {title && (
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{title}</Typography>
          {hint && <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{hint}</Typography>}
        </Box>
      )}
      {children}
    </Box>
  );
}
