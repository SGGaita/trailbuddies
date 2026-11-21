"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { normaliseShareCode } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";

/** Where a QR code takes a grown-up: Import by code, with the code filled in. */
export const importLink = (code) =>
  `${globalThis.location?.origin || ""}/family/create/import?code=${normaliseShareCode(code)}`;

/**
 * SHR-01: the code in big letters, its QR (made on this device), and Copy.
 * @param {{ code: string }} props formatted, e.g. "ABC-DEF"
 */
export default function ShareCode({ code }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    import("qrcode").then(({ default: QR }) =>
      QR.toString(importLink(code), { type: "svg", margin: 1, color: { dark: "#263322", light: "#ffffff" } }).then(
        (svg) => live && setQr(svg),
      ),
    );
    return () => {
      live = false;
    };
  }, [code]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.25,
        p: 2,
        borderRadius: 4.5,
        bgcolor: colors.leaf.soft,
        border: `2px solid ${colors.leaf.main}`,
      }}
    >
      <Box component="span" sx={{ color: "text.secondary", fontWeight: 700 }}>
        {t("share.yourCode")}
      </Box>
      <Box
        component="b"
        data-testid="share-code"
        sx={{ font: "800 34px ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: ".08em" }}
      >
        {code}
      </Box>
      <Box
        role="img"
        aria-label={t("share.qr")}
        sx={{ width: 168, height: 168, bgcolor: "#fff", borderRadius: 3.5, overflow: "hidden", "& svg": { width: "100%", height: "100%" } }}
        dangerouslySetInnerHTML={{ __html: qr }}
      />
      <Button variant="outlined" onClick={copy}>
        {copied ? t("share.copied") : t("share.copy")}
      </Button>
    </Box>
  );
}
