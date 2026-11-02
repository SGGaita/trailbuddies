"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { helpFor } from "@trailbuddies/content";
import Icon from "@/components/Icon";

/** HLP-01: the "?" on a grown-up screen opens the article for that screen. */
export default function HelpLink() {
  const article = helpFor(usePathname());
  if (!article) return null;
  return (
    <IconButton
      component={Link}
      href={`/family/help/${article.id}`}
      aria-label={t("help.for", { title: article.title })}
      sx={{ border: `1.5px solid ${colors.line}`, color: "text.primary", width: 48, height: 48 }}
    >
      <Icon name="help" size={20} />
    </IconButton>
  );
}
