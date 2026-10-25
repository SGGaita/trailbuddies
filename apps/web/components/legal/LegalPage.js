"use client";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { LEGAL } from "@trailbuddies/content";
import Buddy from "@/components/art/Buddy";

const Sections = ({ list, level = "h2" }) =>
  list.map((s) => (
    <Box component="section" key={s.h} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography component={level} variant="h6">
        {s.h}
      </Typography>
      {s.p.map((p) => (
        <Typography key={p} sx={{ lineHeight: 1.6 }}>
          {p}
        </Typography>
      ))}
    </Box>
  ));

/**
 * SAF-10: the privacy summary and full policy, or the terms. Public (no sign-in): the consent
 * step and the website link here. Shows the version and date, and a banner until a lawyer has
 * reviewed the drafts.
 * @param {{ kind: "privacy" | "terms" }} props
 */
export default function LegalPage({ kind }) {
  const privacy = kind === "privacy";
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", px: 2, py: { xs: 3, sm: 5 } }}>
      <Box
        component="main"
        sx={{ maxWidth: 760, mx: "auto", display: "flex", flexDirection: "column", gap: 2.5 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Buddy id="zip" size={44} still />
          <Typography component="h1" variant="h4">
            {privacy ? t("legal.privacyTitle") : t("legal.termsTitle")}
          </Typography>
        </Box>
        <Typography sx={{ color: "text.secondary", fontWeight: 700 }} data-testid="legal-version">
          {t("legal.version", { version: LEGAL.version, date: LEGAL.date })}
        </Typography>
        {!LEGAL.reviewed && (
          <Alert severity="warning" sx={{ borderRadius: 4 }}>
            {t("legal.draft")}
          </Alert>
        )}
        {privacy && (
          <Box
            component="section"
            aria-label={t("legal.summary")}
            sx={{
              bgcolor: colors.sand,
              borderRadius: 4.5,
              p: { xs: 2, sm: 3 },
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography component="h2" variant="h5">
              {t("legal.summary")}
            </Typography>
            <Sections list={LEGAL.summary} level="h3" />
          </Box>
        )}
        <Box
          component="article"
          aria-label={privacy ? t("legal.fullPolicy") : t("legal.termsTitle")}
          sx={{
            bgcolor: "background.paper",
            border: `2px solid ${colors.line}`,
            borderRadius: 4.5,
            p: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {privacy && (
            <Typography component="h2" variant="h5">
              {t("legal.fullPolicy")}
            </Typography>
          )}
          <Sections list={privacy ? LEGAL.privacy : LEGAL.terms} level={privacy ? "h3" : "h2"} />
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            component={Link}
            href={privacy ? "/terms" : "/privacy"}
            variant="outlined"
            sx={{ borderWidth: 2 }}
          >
            {privacy ? t("legal.termsTitle") : t("legal.privacyTitle")}
          </Button>
          <Button component={Link} href="/family/settings">
            {t("legal.back")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
