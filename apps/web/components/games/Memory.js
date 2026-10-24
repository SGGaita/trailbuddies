"use client";
import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import { ItemFace } from "@/components/MediaImage";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { memoryDeck, rng } from "@trailbuddies/domain";

const words = (it) => it.say || it.label;

/**
 * Memory flip (GAM-03): 6 / 8 / 12 cards by band. A match stays face up and the word is
 * said; two that don't match flip back after a second.
 */
export default function Memory({ unit, learner, seed, say, onDone }) {
  const [deck] = useState(() => memoryDeck(unit.items, learner.band, rng(seed)));
  const [up, setUp] = useState(/** @type {string[]} */ ([]));
  const [found, setFound] = useState(/** @type {string[]} */ ([]));
  const busy = useRef(false);
  const e2e = (() => {
    try {
      return localStorage.getItem("tb_e2e") === "1";
    } catch {
      return false;
    }
  })();
  const pairs = deck.length / 2;

  const flip = (card) => {
    if (busy.current || up.includes(card.key) || found.includes(card.pairId)) return;
    const now = [...up, card.key];
    setUp(now);
    if (now.length < 2) return;
    const [a, b] = now.map((k) => deck.find((c) => c.key === k));
    if (a.pairId === b.pairId) {
      const f = [...found, a.pairId];
      setFound(f);
      setUp([]);
      say(words(a.item));
      if (f.length === pairs) setTimeout(() => onDone(), 700);
    } else {
      busy.current = true;
      setTimeout(() => {
        setUp([]);
        busy.current = false;
      }, 1000);
    }
  };
  const cols = deck.length <= 6 ? 3 : 4;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, width: "100%" }}>
      <Typography role="status" sx={{ fontWeight: 800, color: "text.secondary" }}>
        {t("games.flipped", { n: found.length, total: pairs })}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: { xs: 1, sm: 1.5 },
          width: "100%",
          maxWidth: cols * 150,
        }}
      >
        {deck.map((card) => {
          const open = up.includes(card.key) || found.includes(card.pairId);
          return (
            <Box
              key={card.key}
              component="button"
              type="button"
              onClick={() => flip(card)}
              aria-label={open ? words(card.item) : "Hidden card"}
              aria-pressed={open}
              {...(e2e ? { "data-pair-id": card.pairId } : {})}
              sx={{
                aspectRatio: "1",
                borderRadius: 5,
                border: `3px solid ${found.includes(card.pairId) ? colors.leaf.main : colors.line}`,
                bgcolor: open ? (found.includes(card.pairId) ? colors.leaf.soft : "background.paper") : colors.sky.main,
                backgroundImage: open
                  ? "none"
                  : "repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 10px, transparent 10px 20px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "text.primary",
                transition: "background-color .2s",
                p: 0.5,
              }}
            >
              {open && (
                <>
                  <Box component="span" sx={{ fontSize: { xs: 38, sm: 52 }, lineHeight: 1 }}>
                    <ItemFace it={card.item} fallback />
                  </Box>
                  <Box component="span" sx={{ fontWeight: 800, fontSize: { xs: 13, sm: 16 } }}>
                    {card.item.label}
                  </Box>
                </>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
