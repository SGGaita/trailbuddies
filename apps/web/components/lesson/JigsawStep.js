"use client";
import Box from "@mui/material/Box";
import Jigsaw from "@/components/games/Jigsaw";
import { useMediaUrl } from "@/lib/media";

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** SVG markup for a card's picture, cut into jigsaw pieces (600 × 600 view box). */
function cardArt(item, url) {
  if (url)
    return `<image href="${esc(url)}" x="0" y="0" width="600" height="600" preserveAspectRatio="xMidYMid slice"/>`;
  return `<rect width="600" height="600" fill="#fdf3d3"/><text x="300" y="400" font-size="320" text-anchor="middle">${esc(item.emoji || "⭐")}</text>`;
}

/**
 * GAM-02: a lesson step that turns a grown-up's photo into a jigsaw. When the last piece
 * goes in, the step counts as answered and the lesson moves on to the grown-up's question.
 */
export default function JigsawStep({ step, onTry, band }) {
  const url = useMediaUrl(step.target.photo);
  if (step.target.photo && !url) return <Box sx={{ minHeight: 320 }} aria-busy="true" />;
  return (
    <Jigsaw
      unit={{ title: step.target.label }}
      learner={{ band }}
      seed={7}
      side={step.extra?.side}
      art={cardArt(step.target, url)}
      onDone={() => onTry({ correct: true, finished: true })}
    />
  );
}
