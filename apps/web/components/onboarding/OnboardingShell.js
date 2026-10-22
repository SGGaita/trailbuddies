"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import Icon from "@/components/Icon";
import Buddy from "@/components/art/Buddy";

export const STEPS = 7;

/**
 * Onboarding frame (concept report §4.3). Phone: full screen. Tablet and desktop: a
 * centred card (22px corners) on the cream background, as in the prototype.
 * @param {{ step?: number, title: string, sub?: string, back?: string, buddy?: string, mood?: string, wide?: boolean, children: React.ReactNode }} props
 */
export default function OnboardingShell({
  step,
  title,
  sub,
  back,
  buddy = "zip",
  mood = "happy",
  wide = false,
  children,
}) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "center",
        px: { xs: 0, sm: 3 },
        py: { xs: 0, sm: 4 },
        background: {
          xs: colors.cream,
          sm: `radial-gradient(circle at 15% 20%, ${colors.sun.soft} 0 18%, transparent 19%), radial-gradient(circle at 85% 80%, ${colors.leaf.soft} 0 16%, transparent 17%), ${colors.cream}`,
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: "none", sm: wide ? 820 : 600 },
          bgcolor: { xs: "transparent", sm: "background.paper" },
          border: { xs: 0, sm: `2px solid ${colors.line}` },
          borderRadius: { xs: 0, sm: 5.5 },
          boxShadow: { xs: "none", sm: "0 12px 40px rgba(38,51,34,.08)" },
          px: { xs: 2, sm: 4.5 },
          pt: { xs: "calc(env(safe-area-inset-top, 0px) + 12px)", sm: 3.5 },
          pb: { xs: "calc(env(safe-area-inset-bottom, 0px) + 20px)", sm: 4 },
          display: "flex",
          flexDirection: "column",
          gap: 2.25,
        }}
      >
        {(back || step) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {back ? (
              <IconButton
                component={Link}
                href={back}
                aria-label="Back"
                sx={{
                  border: `2px solid ${colors.line}`,
                  borderRadius: 4,
                  width: 48,
                  height: 48,
                  color: "text.primary",
                }}
              >
                <Icon name="back" size={22} />
              </IconButton>
            ) : null}
            {step ? (
              <>
                <Box
                  role="progressbar"
                  aria-label={t("start.step", { n: step, total: STEPS })}
                  aria-valuemin={1}
                  aria-valuemax={STEPS}
                  aria-valuenow={step}
                  sx={{ flex: 1, display: "flex", gap: 0.75 }}
                >
                  {Array.from({ length: STEPS }, (_, i) => (
                    <Box
                      key={i}
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 1,
                        bgcolor:
                          i + 1 < step ? colors.leaf.main : i + 1 === step ? colors.sun.main : colors.sand,
                      }}
                    />
                  ))}
                </Box>
                <Typography sx={{ fontWeight: 800, color: "text.secondary", fontSize: 14, flex: "none" }}>
                  {t("start.step", { n: step, total: STEPS })}
                </Typography>
              </>
            ) : null}
          </Box>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Buddy id={buddy} mood={mood} size={72} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 26, sm: 32 }, lineHeight: 1.1 }}>
              {title}
            </Typography>
            {sub && <Typography sx={{ color: "text.secondary", mt: 0.5 }}>{sub}</Typography>}
          </Box>
        </Box>
        {children}
      </Box>
    </Box>
  );
}
