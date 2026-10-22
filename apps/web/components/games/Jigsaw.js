"use client";
import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { buddyLine } from "@trailbuddies/content";
import { jigsawPieces, jigsawSide, rng } from "@trailbuddies/domain";
import { sceneSvg } from "@/lib/scenes";

/**
 * Jigsaw (GAM-01): 4 / 9 / 16 pieces by band; Seedlings see a faint picture to guide them.
 * Drag a piece onto its place or tap a piece then a place. The last piece shows the whole
 * picture and the buddy names it.
 */
export default function Jigsaw({ unit, learner, seed, say, onDone }) {
  const side = jigsawSide(learner.band);
  const [pieces] = useState(() => jigsawPieces(side, rng(seed)));
  const [placed, setPlaced] = useState(/** @type {string[]} */ ([]));
  const [sel, setSel] = useState(/** @type {string | null} */ (null));
  const [shake, setShake] = useState(/** @type {string | null} */ (null));
  const [drag, setDrag] = useState(/** @type {null | { id: string, dx: number, dy: number }} */ (null));
  const dragRef = useRef(/** @type {any} */ (null));
  const suppress = useRef(false);
  const [svg] = useState(() => sceneSvg(unit));
  const step = 600 / side;
  const guide = learner.band === "seedling";
  const e2e = (() => {
    try {
      return localStorage.getItem("tb_e2e") === "1";
    } catch {
      return false;
    }
  })();

  const place = (id, cell) => {
    const p = pieces.find((x) => x.id === id);
    setSel(null);
    if (!p || placed.includes(id)) return;
    if (`${p.row}-${p.col}` === cell) {
      const now = [...placed, id];
      setPlaced(now);
      if (now.length === pieces.length) onDone(buddyLine("game.picture", { topic: unit.title }, 0, learner.buddy));
    } else {
      setShake(id);
      setTimeout(() => setShake(null), 380);
    }
  };
  const down = (id) => (e) => {
    if (e.button > 0) return;
    dragRef.current = { id, x0: e.clientX, y0: e.clientY, moved: false };
    const move = (ev) => {
      const d = dragRef.current;
      const dx = ev.clientX - d.x0;
      const dy = ev.clientY - d.y0;
      if (!d.moved && Math.hypot(dx, dy) < 8) return;
      d.moved = true;
      setDrag({ id: d.id, dx, dy });
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d?.moved) return;
      suppress.current = true;
      setTimeout(() => (suppress.current = false), 0);
      const cell = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-cell]");
      if (cell) place(d.id, cell.getAttribute("data-cell"));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const tapPiece = (id) => {
    if (suppress.current) {
      suppress.current = false;
      return;
    }
    setSel(sel === id ? null : id);
  };
  const tile = (p, size) => (
    <svg
      viewBox={`${p.col * step} ${p.row * step} ${step} ${step}`}
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: "block" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
  const tray = pieces.filter((p) => !placed.includes(p.id));

  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: "center", gap: { xs: 2, sm: 3 }, width: "100%", justifyContent: "center" }}>
      <Box
        role="grid"
        aria-label={unit.title}
        sx={{
          position: "relative",
          width: { xs: "min(92vw, 360px)", sm: 440 },
          aspectRatio: "1",
          display: "grid",
          gridTemplateColumns: `repeat(${side}, 1fr)`,
          border: `3px solid ${colors.line}`,
          borderRadius: 4,
          overflow: "hidden",
          bgcolor: colors.sand,
        }}
      >
        {guide && (
          <svg
            viewBox="0 0 600 600"
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.2 }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
        {Array.from({ length: side * side }, (_, i) => {
          const row = Math.floor(i / side);
          const col = i % side;
          const p = pieces.find((x) => x.row === row && x.col === col && placed.includes(x.id));
          return (
            <Box
              key={i}
              component="button"
              type="button"
              data-cell={`${row}-${col}`}
              aria-label={t("games.place", { n: i + 1 })}
              onClick={() => sel && place(sel, `${row}-${col}`)}
              sx={{
                position: "relative",
                p: 0,
                border: `1px dashed ${p ? "transparent" : "rgba(38,51,34,.25)"}`,
                bgcolor: "transparent",
                cursor: sel ? "pointer" : "default",
                "& svg": { width: "100%", height: "100%" },
              }}
            >
              {p && <Box className="popin" sx={{ width: "100%", height: "100%" }}>{tile(p, "100%")}</Box>}
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", maxWidth: 440 }}>
        {tray.map((p) => (
          <Box
            key={p.id}
            component="button"
            type="button"
            onClick={() => tapPiece(p.id)}
            onPointerDown={down(p.id)}
            aria-label={t("games.piece")}
            aria-pressed={sel === p.id}
            className={shake === p.id ? "shake" : undefined}
            {...(e2e ? { "data-home": `${p.row}-${p.col}` } : {})}
            sx={{
              width: { xs: 72, sm: 88 },
              height: { xs: 72, sm: 88 },
              p: 0,
              border: `3px solid ${sel === p.id ? colors.sky.main : colors.line}`,
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: "background.paper",
              cursor: "pointer",
              touchAction: "none",
              userSelect: "none",
              "& svg": { width: "100%", height: "100%" },
              ...(drag?.id === p.id
                ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)`, pointerEvents: "none", position: "relative", zIndex: 5, boxShadow: "0 12px 24px rgba(38,51,34,.25)" }
                : {}),
            }}
          >
            {tile(p, "100%")}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
