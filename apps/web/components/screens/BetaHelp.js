"use client";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { useFamily, useHydrated, useFlag } from "@/lib/store";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";
import Placeholder from "./Placeholder";

/** How many questions the beta FAQ has (beta.faq<n>q / beta.faq<n>a in i18n). */
export const FAQ_COUNT = 9;

/** Beta questions and answers for grown-ups (flag beta-faq). */
export default function BetaHelp() {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const on = useFlag("beta-faq");
  if (!ready) return <Loading />;
  if (!on)
    return (
      <Placeholder area="family" href="/family/help" title={t("beta.faqTitle")} sprint="—" story="OPS-06" />
    );
  return (
    <FamilyShell
      title={t("beta.faqTitle")}
      sub={t("beta.faqSub")}
      family={family}
      active="/family/settings"
      back="/family/settings"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((n) => (
          <Accordion
            key={n}
            disableGutters
            elevation={0}
            sx={{
              border: `2px solid ${colors.line}`,
              borderRadius: "18px !important",
              "&::before": { display: "none" },
            }}
          >
            <AccordionSummary sx={{ minHeight: 56, fontWeight: 800 }}>
              <Typography component="h2" sx={{ fontWeight: 800 }}>
                {t(`beta.faq${n}q`)}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ lineHeight: 1.6 }}>{t(`beta.faq${n}a`)}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </FamilyShell>
  );
}
