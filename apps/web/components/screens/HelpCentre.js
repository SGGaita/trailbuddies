"use client";
import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { HELP_TOPICS, HELP_ARTICLES, searchHelp } from "@trailbuddies/content";
import { useFamily, useFlag, useHydrated } from "@/lib/store";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";

const card = {
  bgcolor: "background.paper",
  border: `2px solid ${colors.line}`,
  borderRadius: 4.5,
  p: { xs: 2, sm: 2.5 },
};

const ArticleLink = ({ a }) => (
  <Box component="li">
    <Box
      component={Link}
      href={`/family/help/${a.id}`}
      sx={{ display: "flex", alignItems: "center", minHeight: 48, fontWeight: 700, color: "primary.main" }}
    >
      {a.title}
    </Box>
  </Box>
);

/**
 * HLP-01 (P30): short help articles that work offline (they're part of the app), a search,
 * the beta questions when the family is in the beta, and a way to contact support.
 */
export default function HelpCentre() {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const faq = useFlag("beta-faq");
  const [q, setQ] = useState("");
  if (!ready) return <Loading />;
  const found = q.trim() ? searchHelp(q) : null;
  return (
    <FamilyShell
      title={t("help.title")}
      sub={t("help.sub")}
      family={family}
      active="/family/settings"
      back="/family"
    >
      <TextField
        type="search"
        label={t("help.search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ bgcolor: "background.paper" }}
      />
      {found ? (
        <Box component="section" aria-label={t("help.results")} sx={card}>
          <Typography component="h2" variant="h6">
            {t("help.results")}
          </Typography>
          {found.length ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {found.map((a) => (
                <ArticleLink key={a.id} a={a} />
              ))}
            </Box>
          ) : (
            <Typography sx={{ mt: 1 }}>{t("help.nothing")}</Typography>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          }}
        >
          {HELP_TOPICS.map((topic) => (
            <Box component="section" key={topic.id} aria-label={topic.title} sx={card}>
              <Typography component="h2" variant="h6">
                {topic.title}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {HELP_ARTICLES.filter((a) => a.topic === topic.id).map((a) => (
                  <ArticleLink key={a.id} a={a} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ ...card, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
        <Typography sx={{ flex: 1, minWidth: 200, fontWeight: 700 }}>{t("help.stillStuck")}</Typography>
        {faq && (
          <Button component={Link} href="/family/help/beta" variant="outlined" sx={{ borderWidth: 2 }}>
            {t("beta.faqLink")}
          </Button>
        )}
        <Button component={Link} href="/family/help/contact" variant="contained">
          {t("help.contact")}
        </Button>
      </Box>
    </FamilyShell>
  );
}

/** One article. @param {{ id: string }} props */
export function HelpArticle({ id }) {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const a = HELP_ARTICLES.find((x) => x.id === id);
  if (!ready || !a) return <Loading />;
  const topic = HELP_TOPICS.find((x) => x.id === a.topic);
  const more = HELP_ARTICLES.filter((x) => x.topic === a.topic && x.id !== a.id);
  return (
    <FamilyShell
      title={a.title}
      sub={topic?.title}
      family={family}
      active="/family/settings"
      back="/family/help"
    >
      <Box component="article" sx={{ ...card, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {a.body.map((p) => (
          <Typography key={p} sx={{ lineHeight: 1.6 }}>
            {p}
          </Typography>
        ))}
      </Box>
      {more.length > 0 && (
        <Box component="section" aria-label={t("help.more")} sx={card}>
          <Typography component="h2" variant="h6">
            {t("help.more")}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {more.map((x) => (
              <ArticleLink key={x.id} a={x} />
            ))}
          </Box>
        </Box>
      )}
      <Button
        component={Link}
        href="/family/help/contact"
        variant="outlined"
        sx={{ borderWidth: 2, alignSelf: "flex-start" }}
      >
        {t("help.contact")}
      </Button>
    </FamilyShell>
  );
}
