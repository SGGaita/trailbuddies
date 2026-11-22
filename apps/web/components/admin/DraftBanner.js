"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { Pill } from "@/components/builder/parts";

export const STATUS_TONE = { draft: "sun", submitted: "sky", approved: "ok" };

/**
 * The live version, or the draft and where it is in the review (CMS-06), on every content
 * screen. Submitting, reviewing and publishing happen on Review & publish.
 * @param {{ data: any, compact?: boolean }} props content summary from GET /admin/content
 */
export default function DraftBanner({ data, compact = false }) {
  const draft = data?.draft;
  if (!data?.live) return null;
  if (!draft)
    return (
      <Card sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }} data-testid="version-banner">
        <Pill tone="ok">{t("cms.live")}</Pill>
        <Typography sx={{ flex: "1 1 260px" }}>{t("cms.liveLine", { v: data.live.version })}</Typography>
      </Card>
    );
  const sentBack = draft.status === "draft" && draft.review_note;
  return (
    <Card
      sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1, bgcolor: colors.sun.soft, borderColor: colors.sun.deep }}
      data-testid="version-banner"
    >
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
        <Pill tone={sentBack ? "bad" : STATUS_TONE[draft.status]}>{t(sentBack ? "cms.state.returned" : `cms.state.${draft.status}`)}</Pill>
        <Typography sx={{ flex: "1 1 260px" }}>
          <b>{t("cms.versionN", { v: draft.version })}</b> · {t("cms.draftLine", { n: draft.changes.length, v: data.live.version })}
        </Typography>
        <Button component={Link} href="/admin/content/review" size="small" variant="contained">
          {t("cms.reviewLink")}
        </Button>
      </Box>
      {sentBack && <Typography sx={{ fontSize: 14 }}>{t("cms.reviewerSaid", { comment: draft.review_note })}</Typography>}
      {!compact && (
        <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 14 }}>
          {draft.changes.map((c) => (
            <li key={`${c.kind || "unit"}:${c.unit}`}>
              <b>{c.title}</b>: {c.changes.join("; ")} <Box component="span" sx={{ color: "text.secondary" }}>· {c.by}</Box>
            </li>
          ))}
        </Box>
      )}
    </Card>
  );
}
