"use client";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import QRCode from "qrcode";

/**
 * A QR code drawn as SVG on the device (no server, works offline, prints sharply).
 * @param {{ value: string, size?: number, label: string }} props
 */
export default function QrCode({ value, size = 140, label }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((s) => live && setSvg(s))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [value]);
  return (
    <Box
      role="img"
      aria-label={label}
      data-qr={value}
      sx={{
        width: size,
        height: size,
        flex: "none",
        bgcolor: "#fff",
        "& svg": { width: "100%", height: "100%", display: "block" },
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Where a parent's phone goes when it scans the code. @param {string} code */
export const joinUrl = (code) =>
  `${typeof window === "undefined" ? "" : window.location.origin}/family/join?code=${encodeURIComponent(code)}`;
