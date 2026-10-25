"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Icon from "@/components/Icon";
import { SoundIcon } from "@/components/art/UiIcon";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { speak } from "@/lib/speech";
import { ItemFace } from "@/components/MediaImage";
import JigsawStep from "./JigsawStep";

/**
 * Lesson exercises. Each one is told the hint-ladder state (`hint`) and reports every tap
 * with `onTry({ correct, finished, chosenId, wrongIds })`; the player owns the ladder,
 * the buddy and scoring. Exercises only decide what is right and how it looks.
 *
 * Hint visuals: after the 2nd miss the right answer glows and a removed choice disappears;
 * after the 3rd ("revealed") every other choice is dimmed so only the answer can be tapped.
 */

const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const isNumber = (it) => typeof it?.number === "number";
const words = (it) => it.say || it.label;
const glowing = (hint) => hint.misses >= 2 || hint.revealed;
/** Bands that can't read yet: every word on screen can be heard. */
const NON_READERS = new Set(["seedling", "sprout"]);

/** Number keys 1–9 pick the nth choice; used by the single-choice exercises. */
function useDigits(onDigit, enabled) {
  const pick = useEffectEvent((n) => onDigit(n));
  useEffect(() => {
    if (!enabled) return undefined;
    const h = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        e.preventDefault();
        pick(n - 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [enabled]);
}

/** A short wobble on the tile that was tapped wrongly. */
function useShake() {
  const [id, setId] = useState(null);
  const shake = (x) => {
    setId(x);
    setTimeout(() => setId(null), 380);
  };
  return [id, shake];
}

/**
 * One big tappable answer.
 * @param {{ state?: "idle" | "selected" | "right" | "glow" | "dim" | "gone", shake?: boolean, label: string, onClick: () => void, children: React.ReactNode, sx?: any, data?: Record<string, string> }} props
 */
export function Tile({ state = "idle", shake = false, label, onClick, children, sx, data = {} }) {
  const look = {
    idle: {},
    selected: { borderColor: colors.sky.main, bgcolor: colors.sky.soft },
    right: { borderColor: colors.leaf.main, bgcolor: colors.leaf.soft },
    glow: { borderColor: colors.sun.main, bgcolor: colors.sun.soft },
    dim: { opacity: 0.3 },
    gone: { visibility: "hidden" },
  }[state];
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={state === "selected" || undefined}
      disabled={state === "gone" || state === "dim"}
      className={[
        shake ? "shake" : "",
        state === "glow" ? "glow" : "",
        state === "right" ? "popin" : "",
      ].join(" ")}
      {...data}
      sx={{
        minWidth: { xs: 92, sm: 124, lg: 140 },
        minHeight: { xs: 92, sm: 124, lg: 140 },
        p: 1,
        borderRadius: 5,
        border: `4px solid ${colors.line}`,
        bgcolor: "background.paper",
        boxShadow: `0 6px 0 ${colors.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: { xs: 44, sm: 60 },
        lineHeight: 1,
        color: "text.primary",
        cursor: "pointer",
        transition: "transform .1s, opacity .3s",
        "&:active": { transform: "translateY(3px)" },
        "&:focus-visible": { outline: `4px solid ${colors.sky.main}`, outlineOffset: 3 },
        ...look,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** A group of the same picture, e.g. 3 mangoes. Rows of up to 5. */
export function Group({ count, emoji, size = { xs: 26, sm: 34 } }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(count, 5)}, auto)`,
        gap: 0.25,
        fontSize: size,
        lineHeight: 1.1,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i}>{emoji}</span>
      ))}
    </Box>
  );
}

const Row = ({ children, sx }) => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "stretch",
      gap: { xs: 1.5, sm: 2.5 },
      ...sx,
    }}
  >
    {children}
  </Box>
);

/**
 * Shared single-answer logic: listen-tap, name-it, count options, compare and odd-one-out.
 * @param {{ step: any, hint: any, done: boolean, onTry: Function, e2e: boolean, options: Array<{ id: string, label: string, face: React.ReactNode }>, answerId: string, tileSx?: any }} p
 */
function SingleChoice({ hint, done, onTry, e2e, options, answerId, tileSx, below }) {
  const [shakeId, shake] = useShake();
  const [picked, setPicked] = useState(null);
  const visible = options.filter((o) => !hint.removed.includes(o.id));
  const choose = (o) => {
    if (done) return;
    const correct = o.id === answerId;
    if (correct) setPicked(o.id);
    else shake(o.id);
    onTry({
      correct,
      finished: correct,
      chosenId: o.id,
      wrongIds: options.filter((x) => x.id !== answerId).map((x) => x.id),
    });
  };
  useDigits((n) => visible[n] && choose(visible[n]), !done);
  const stateOf = (o) => {
    if (hint.removed.includes(o.id)) return "gone";
    if (done && o.id === picked) return "right";
    if (o.id === answerId && glowing(hint)) return "glow";
    if (hint.revealed && o.id !== answerId) return "dim";
    return "idle";
  };
  return (
    <Row>
      {options.map((o) => {
        const tile = (
          <Tile
            key={o.id}
            label={o.label}
            state={stateOf(o)}
            shake={shakeId === o.id}
            onClick={() => choose(o)}
            sx={tileSx}
            data={e2e ? { "data-answer": o.id === answerId ? "yes" : "no" } : {}}
          >
            {o.face}
          </Tile>
        );
        if (!below || stateOf(o) === "gone") return tile;
        return (
          <Box key={o.id} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            {tile}
            {below(o)}
          </Box>
        );
      })}
    </Row>
  );
}

/** "Tap 3!" — hear a word or number, tap it. Numbers show numerals; other items show pictures. */
export function ListenTap(props) {
  const { step } = props;
  const options = step.options.map((it) => ({
    id: it.id,
    label: words(it),
    face: isNumber(it) ? it.label : <ItemFace it={it} fallback />,
  }));
  return <SingleChoice {...props} options={options} answerId={step.target.id} />;
}

/** "Which group has three?" (numbers) or "What is this?" with word choices (other items). */
export function NameIt(props) {
  const { step } = props;
  if (isNumber(step.target)) {
    const options = step.options.map((it) => ({
      id: it.id,
      label: `${it.number} ${it.emoji}`,
      face: <Group count={it.number} emoji={it.emoji} size={{ xs: 20, sm: 26 }} />,
    }));
    return <SingleChoice {...props} options={options} answerId={step.target.id} />;
  }
  const options = step.options.map((it) => ({ id: it.id, label: words(it), face: it.label }));
  // Non-readers hear each word on its own speaker button; readers just read (LES-05).
  const readers = !NON_READERS.has(props.band);
  const hear = (o) => (
    <IconButton
      onClick={() => speak(o.label, { band: props.band, enabled: props.voice })}
      aria-label={`Hear ${o.label}`}
      sx={{ width: 48, height: 48, border: `3px solid ${colors.leaf.deep}`, color: colors.leaf.deep }}
    >
      <SoundIcon size={30} />
    </IconButton>
  );
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5 }}>
      <Box aria-hidden="true" sx={{ fontSize: { xs: 84, sm: 120 }, lineHeight: 1 }}>
        <ItemFace it={step.target} />
      </Box>
      <SingleChoice
        {...props}
        options={options}
        answerId={step.target.id}
        tileSx={{ fontSize: { xs: 26, sm: 34 } }}
        below={readers ? undefined : hear}
      />
    </Box>
  );
}

/** "How many?" — tap each picture to count it aloud, then pick the number. */
export function Count(props) {
  const { step, band, voice } = props;
  const n = step.target.number;
  const [counted, setCounted] = useState(0);
  const tapThing = (i) => {
    if (i !== counted || counted >= n) return;
    setCounted(counted + 1);
    speak(NUMBER_WORDS[counted] || String(counted + 1), { band, enabled: voice });
  };
  const options = step.options.map((it) => ({ id: it.id, label: words(it), face: it.label }));
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(n, 5)}, auto)`,
          gap: { xs: 0.75, sm: 1.25 },
          p: { xs: 1.5, sm: 2 },
          bgcolor: colors.sand,
          borderRadius: 5,
        }}
      >
        {Array.from({ length: n }, (_, i) => (
          <Box
            key={i}
            component="button"
            type="button"
            onClick={() => tapThing(i)}
            aria-label={i < counted ? `Counted ${i + 1}` : "Count me"}
            sx={{
              position: "relative",
              border: 0,
              bgcolor: "transparent",
              p: 0.25,
              cursor: "pointer",
              fontSize: { xs: 40, sm: 54 },
              lineHeight: 1,
              opacity: i < counted ? 0.55 : 1,
            }}
          >
            {step.extra.emoji}
            {i < counted && (
              <Box
                component="span"
                className="popin"
                sx={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  bgcolor: colors.leaf.deep,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {i + 1}
              </Box>
            )}
          </Box>
        ))}
      </Box>
      <SingleChoice {...props} options={options} answerId={step.target.id} />
    </Box>
  );
}

/** "Which has more?" — two groups side by side. */
export function Compare(props) {
  const { step } = props;
  const options = step.options.map((it) => ({
    id: it.id,
    label: `${it.number} ${step.extra.emoji}`,
    face: <Group count={it.number} emoji={step.extra.emoji} />,
  }));
  return (
    <SingleChoice
      {...props}
      options={options}
      answerId={step.target.id}
      tileSx={{ minWidth: { xs: 140, sm: 220 }, minHeight: { xs: 140, sm: 200 } }}
    />
  );
}

/** "Which one is different?" Groups of numbers, or animals and things by category (LES-09). */
export function OddOneOut(props) {
  const { step } = props;
  if (step.extra.mode === "category") {
    const options = step.options.map((it) => ({
      id: it.id,
      label: words(it),
      face: (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
          <Box component="span" sx={{ fontSize: { xs: 46, sm: 60 }, lineHeight: 1 }}>
            <ItemFace it={it} />
          </Box>
          <Box component="span" sx={{ fontSize: { xs: 18, sm: 22 } }}>
            {it.label}
          </Box>
        </Box>
      ),
    }));
    return <SingleChoice {...props} options={options} answerId={step.extra.answer} />;
  }
  const options = step.extra.groups.map((g) => ({
    id: g.id,
    label: `${g.count} ${g.emoji}`,
    face: <Group count={g.count} emoji={g.emoji} size={{ xs: 20, sm: 28 }} />,
  }));
  return <SingleChoice {...props} options={options} answerId={step.extra.answer} />;
}

/** "Match big and small letters" (LES-10): the pair locks and the letter is said. */
export function CaseMatch(props) {
  const { step, band, voice, buddy } = props;
  const byId = Object.fromEntries(step.items.map((i) => [i.id, i]));
  return (
    <Match
      {...props}
      faces={{ l: (it) => it.label, r: (it) => it.letter }}
      onPair={(id) => speak(words(byId[id]), { band, buddy, enabled: voice })}
    />
  );
}

/**
 * "Match each group to its number." Drag a tile onto its partner, or tap one then the
 * other (touch, mouse or keyboard). A right pair locks; a wrong one springs back.
 */
export function Match({ step, hint, done, onTry, e2e, faces, onPair }) {
  const [matched, setMatched] = useState(/** @type {string[]} */ ([]));
  const [sel, setSel] = useState(/** @type {{ side: "l" | "r", id: string } | null} */ (null));
  const [drag, setDrag] = useState(
    /** @type {null | { side: string, id: string, dx: number, dy: number }} */ (null),
  );
  const dragRef = useRef(/** @type {any} */ (null));
  const suppressClick = useRef(false);
  const [shakeId, shake] = useShake();
  const numbers = step.items.every(isNumber);
  const nextLeft = step.items.find((i) => !matched.includes(i.id));
  // The pair that glows: the partner of what's selected, else the next unmatched pair.
  const glowId = sel ? sel.id : nextLeft?.id;

  /** Try pairing `id` on `side` with `otherId` from the other column. */
  const attempt = (side, id, otherId) => {
    setSel(null);
    if (otherId === id) {
      const now = [...matched, id];
      setMatched(now);
      onPair?.(id);
      onTry({ correct: true, finished: now.length === step.items.length, chosenId: id });
    } else {
      shake(`${side}-${id}`);
      onTry({ correct: false, finished: false, chosenId: id, wrongIds: [] });
    }
  };
  const tap = (side, id) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (done || matched.includes(id)) return;
    if (!sel || sel.side === side) return setSel({ side, id });
    attempt(side, id, sel.id);
  };

  const onPointerDown = (side, id) => (e) => {
    if (done || matched.includes(id) || e.button > 0) return;
    dragRef.current = { side, id, x0: e.clientX, y0: e.clientY, moved: false };
    const move = (ev) => {
      const d = dragRef.current;
      const dx = ev.clientX - d.x0;
      const dy = ev.clientY - d.y0;
      if (!d.moved && Math.hypot(dx, dy) < 8) return;
      d.moved = true;
      setDrag({ side: d.side, id: d.id, dx, dy });
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d?.moved) return; // a plain tap: the click handler deals with it
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-mside]");
      if (target && target.getAttribute("data-mside") !== d.side) {
        const tid = target.getAttribute("data-mid");
        if (!matched.includes(tid)) attempt(target.getAttribute("data-mside"), tid, d.id);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const stateOf = (side, id) => {
    if (matched.includes(id)) return "right";
    if ((sel && sel.side === side && sel.id === id) || (drag && drag.side === side && drag.id === id))
      return "selected";
    if (glowing(hint) && id === glowId) return "glow";
    if (hint.revealed && id !== glowId) return "dim";
    return "idle";
  };
  const left =
    faces?.l ||
    ((it) =>
      numbers ? (
        <Group count={it.number} emoji={it.emoji} size={{ xs: 18, sm: 24 }} />
      ) : (
        <ItemFace it={it} />
      ));
  const right = faces?.r || ((it) => it.label);
  const col = (side, list, face) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1, sm: 1.5 } }}>
      {list.map((it) => {
        const dragging = drag && drag.side === side && drag.id === it.id;
        return (
          <Tile
            key={it.id}
            label={side === "l" ? (numbers ? `${it.number} ${it.emoji}` : words(it)) : words(it)}
            state={stateOf(side, it.id)}
            shake={shakeId === `${side}-${it.id}`}
            onClick={() => tap(side, it.id)}
            data={{
              "data-mside": side,
              "data-mid": it.id,
              onPointerDown: onPointerDown(side, it.id),
              ...(e2e ? { "data-pair": it.id, "data-side": side } : {}),
            }}
            sx={{
              minWidth: { xs: 112, sm: 170 },
              minHeight: { xs: 56, sm: 72, lg: 80 },
              fontSize: numbers || side === "l" ? { xs: 30, sm: 40 } : { xs: 22, sm: 28 },
              touchAction: "none",
              userSelect: "none",
              ...(matched.includes(it.id) ? { pointerEvents: "none" } : {}),
              ...(dragging
                ? {
                    transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.05)`,
                    transition: "none",
                    pointerEvents: "none",
                    zIndex: 5,
                    position: "relative",
                    boxShadow: "0 12px 24px rgba(38,51,34,.25)",
                  }
                : {}),
            }}
          >
            {face(it)}
          </Tile>
        );
      })}
    </Box>
  );
  return (
    <Box sx={{ display: "flex", justifyContent: "center", gap: { xs: 3, sm: 8 } }}>
      {col("l", step.items, left)}
      {col("r", step.options, right)}
    </Box>
  );
}

/**
 * Drag helper shared by sequence, sort and build-a-word: press a tile, move it over a
 * `[data-drop]` element and let go. A plain tap stays a tap.
 * @param {(id: string, target: string | null) => void} onDrop
 */
function useDrag(onDrop) {
  const [drag, setDrag] = useState(/** @type {null | { id: string, dx: number, dy: number }} */ (null));
  const ref = useRef(/** @type {any} */ (null));
  const suppress = useRef(false);
  const start = (id) => (e) => {
    if (e.button > 0) return;
    ref.current = { id, x0: e.clientX, y0: e.clientY, moved: false };
    const move = (ev) => {
      const d = ref.current;
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
      const d = ref.current;
      ref.current = null;
      setDrag(null);
      if (!d?.moved) return;
      suppress.current = true;
      setTimeout(() => (suppress.current = false), 0);
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-drop]");
      onDrop(d.id, target ? target.getAttribute("data-drop") : null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  /** False right after a drag, so the click that follows it is ignored. */
  const clicked = () => {
    if (!suppress.current) return true;
    suppress.current = false;
    return false;
  };
  const style = (id) =>
    drag?.id === id
      ? {
          transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.05)`,
          transition: "none",
          pointerEvents: "none",
          zIndex: 5,
          position: "relative",
          boxShadow: "0 12px 24px rgba(38,51,34,.25)",
        }
      : {};
  return { start, clicked, style, dragging: drag?.id || null };
}

const Slot = ({ filled, ok, label, children, drop, onClick, sx }) => (
  <Box
    component="button"
    type="button"
    data-drop={drop}
    aria-label={label}
    onClick={onClick}
    sx={{
      width: { xs: 60, sm: 84 },
      height: { xs: 60, sm: 84 },
      borderRadius: 4,
      border: `3px ${filled ? "solid" : "dashed"} ${ok ? colors.leaf.main : filled ? colors.sky.main : colors.line}`,
      bgcolor: ok ? colors.leaf.soft : filled ? colors.sky.soft : "transparent",
      display: "grid",
      placeItems: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: { xs: 30, sm: 42 },
      color: "text.primary",
      cursor: filled && !ok ? "pointer" : "default",
      p: 0,
      ...sx,
    }}
  >
    {children}
  </Box>
);

/**
 * "Put them in order" (LES-07): drag cards into the slots, or tap a card to fill the
 * next slot. When the last slot is filled the order is checked; wrong cards wiggle and
 * go back. Tap a filled slot to take a card out.
 */
export function Sequence({ step, hint, done, onTry, e2e }) {
  const n = step.items.length;
  const [slots, setSlots] = useState(() => Array(n).fill(null));
  const [locked, setLocked] = useState(/** @type {number[]} */ ([]));
  const [shakeId, shake] = useShake();
  const byId = Object.fromEntries(step.options.map((o) => [o.id, o]));
  const placed = slots.filter(Boolean);
  const firstEmpty = slots.findIndex((x) => !x);
  const wanted = step.items[firstEmpty]?.id;

  const check = (next) => {
    if (next.some((x) => !x)) return;
    const wrong = next.map((id, i) => (id !== step.items[i].id ? i : -1)).filter((i) => i >= 0);
    if (!wrong.length) {
      setLocked(next.map((_, i) => i));
      return onTry({ correct: true, finished: true });
    }
    setLocked(next.map((_, i) => i).filter((i) => !wrong.includes(i)));
    wrong.forEach((i) => shake(next[i]));
    onTry({ correct: false, finished: false, wrongIds: [] });
    setTimeout(() => setSlots((cur) => cur.map((id, i) => (wrong.includes(i) ? null : id))), 380);
  };
  const put = (id, at) => {
    if (done || locked.includes(at) || placed.includes(id)) return;
    const next = slots.map((x, i) => (i === at ? id : x));
    setSlots(next);
    check(next);
  };
  const drag = useDrag((id, target) => target?.startsWith("slot-") && put(id, Number(target.slice(5))));
  const tap = (it) => drag.clicked() && firstEmpty >= 0 && put(it.id, firstEmpty);
  const takeOut = (i) => !done && !locked.includes(i) && setSlots(slots.map((x, k) => (k === i ? null : x)));
  const tray = step.options.filter((o) => !placed.includes(o.id));
  useDigits((k) => tray[k] && tap(tray[k]), !done);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: { xs: 2.5, sm: 4 } }}>
      <Row sx={{ gap: { xs: 1, sm: 1.5 } }}>
        {slots.map((id, i) => (
          <Slot
            key={i}
            drop={`slot-${i}`}
            filled={!!id}
            ok={locked.includes(i)}
            label={id ? `Place ${i + 1}: ${words(byId[id])}` : `Place ${i + 1}: empty`}
            onClick={() => takeOut(i)}
          >
            {id ? byId[id].label : ""}
          </Slot>
        ))}
      </Row>
      <Row>
        {tray.map((it) => (
          <Tile
            key={it.id}
            label={words(it)}
            state={glowing(hint) && it.id === wanted ? "glow" : hint.revealed ? "dim" : "idle"}
            shake={shakeId === it.id}
            onClick={() => tap(it)}
            data={{
              onPointerDown: drag.start(it.id),
              ...(e2e ? { "data-order": String(step.items.findIndex((x) => x.id === it.id)) } : {}),
            }}
            sx={{ touchAction: "none", userSelect: "none", ...drag.style(it.id) }}
          >
            {it.label}
          </Tile>
        ))}
      </Row>
    </Box>
  );
}

/**
 * "Sort into baskets" (LES-08): drag each item into a basket, or tap it then a basket.
 * A right drop stays; a wrong one bounces back and the buddy says what that basket is.
 */
export function Sort({ step, hint, done, onTry, e2e, band, voice, buddy, say }) {
  const [sorted, setSorted] = useState(/** @type {Record<string, string>} */ ({}));
  const [sel, setSel] = useState(/** @type {string | null} */ (null));
  const [shakeId, shake] = useShake();
  const left = step.items.filter((i) => !sorted[i.id]);
  const focus = sel || left[0]?.id;
  const focusBin = step.items.find((i) => i.id === focus)?.bin;

  const drop = (id, binId) => {
    if (done || !binId || sorted[id]) return;
    const it = step.items.find((x) => x.id === id);
    setSel(null);
    if (it.bin === binId) {
      const next = { ...sorted, [id]: binId };
      setSorted(next);
      speak(words(it), { band, buddy, enabled: voice });
      onTry({ correct: true, finished: Object.keys(next).length === step.items.length });
    } else {
      shake(id);
      const bin = step.bins.find((b) => b.id === binId);
      const text = say ? say("lesson.sort-wrong", { bin: bin.say || bin.label }) : bin.label;
      speak(text, { band, buddy, enabled: voice });
      onTry({ correct: false, finished: false, wrongIds: [] });
    }
  };
  const drag = useDrag((id, target) => target?.startsWith("bin-") && drop(id, target.slice(4)));
  const pickItem = (id) => drag.clicked() && !done && setSel(sel === id ? null : id);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 2, sm: 3 },
        width: "100%",
      }}
    >
      <Row sx={{ minHeight: { xs: 96, sm: 132 } }}>
        {left.map((it) => (
          <Tile
            key={it.id}
            label={words(it)}
            state={sel === it.id ? "selected" : glowing(hint) && it.id === focus ? "glow" : "idle"}
            shake={shakeId === it.id}
            onClick={() => pickItem(it.id)}
            data={{
              onPointerDown: drag.start(it.id),
              ...(e2e ? { "data-item": it.id, "data-bin": it.bin } : {}),
            }}
            sx={{
              flexDirection: "column",
              minWidth: { xs: 84, sm: 112 },
              minHeight: { xs: 84, sm: 112 },
              fontSize: { xs: 40, sm: 54 },
              touchAction: "none",
              userSelect: "none",
              ...drag.style(it.id),
            }}
          >
            <ItemFace it={it} />
            <Box component="span" sx={{ fontSize: { xs: 14, sm: 16 } }}>
              {it.label}
            </Box>
          </Tile>
        ))}
      </Row>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${step.bins.length}, minmax(0, 1fr))`,
          gap: { xs: 1, sm: 2 },
          width: "100%",
          maxWidth: 900,
        }}
      >
        {step.bins.map((b) => {
          const glow = glowing(hint) && b.id === focusBin;
          return (
            <Box
              key={b.id}
              component="button"
              type="button"
              data-drop={`bin-${b.id}`}
              aria-label={t("lesson.basket", { label: b.label })}
              onClick={() => sel && drop(sel, b.id)}
              className={glow ? "glow" : undefined}
              {...(e2e ? { "data-binid": b.id } : {})}
              sx={{
                minHeight: { xs: 130, sm: 180 },
                borderRadius: 5.5,
                border: `3px dashed ${glow ? colors.sun.main : colors.line}`,
                bgcolor: glow ? colors.sun.soft : colors.sand,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                p: 1,
                cursor: sel ? "pointer" : "default",
                color: "text.primary",
              }}
            >
              <Box sx={{ fontSize: { xs: 30, sm: 40 } }}>{b.emoji}</Box>
              <Box sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: { xs: 16, sm: 20 } }}>
                {b.label}
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 0.25,
                  fontSize: { xs: 24, sm: 30 },
                }}
              >
                {step.items
                  .filter((i) => sorted[i.id] === b.id)
                  .map((i) => (
                    <span key={i.id} className="popin" aria-label={words(i)} role="img">
                      <ItemFace it={i} />
                    </span>
                  ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/**
 * "Build a word" (LES-11): drag letters into the slots, or tap them in order. Each letter
 * is said as it goes in; a wrong letter wiggles back; the word is read when complete.
 */
export function BuildWord({ step, hint, done, onTry, e2e, band, voice, buddy }) {
  const n = step.items.length;
  const [slots, setSlots] = useState(() => Array(n).fill(null));
  const [shakeId, shake] = useShake();
  const byId = Object.fromEntries(step.options.map((o) => [o.id, o]));
  const used = slots.filter(Boolean);
  const firstEmpty = slots.findIndex((x) => !x);

  const put = (id, at) => {
    if (done || at < 0 || slots[at] || used.includes(id)) return;
    const tile = byId[id];
    if (tile.letter !== step.items[at].letter) {
      shake(id);
      return onTry({ correct: false, finished: false, wrongIds: [] });
    }
    const next = slots.map((x, i) => (i === at ? id : x));
    setSlots(next);
    speak(tile.say || tile.letter, { band, buddy, enabled: voice });
    if (next.every(Boolean)) onTry({ correct: true, finished: true });
  };
  const drag = useDrag((id, target) => target?.startsWith("slot-") && put(id, Number(target.slice(5))));
  const tap = (tile) => drag.clicked() && put(tile.id, firstEmpty);
  const tray = step.options.filter((o) => !used.includes(o.id));
  const wantLetter = step.items[firstEmpty]?.letter;
  const glowId = glowing(hint) ? tray.find((o) => o.letter === wantLetter)?.id : null;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: { xs: 2, sm: 3 } }}
      {...(e2e ? { "data-word": step.target.label } : {})}
    >
      <Box aria-hidden="true" sx={{ fontSize: { xs: 84, sm: 112 }, lineHeight: 1 }}>
        <ItemFace it={step.target} />
      </Box>
      <Row sx={{ gap: { xs: 1, sm: 1.5 } }}>
        {slots.map((id, i) => (
          <Slot
            key={i}
            drop={`slot-${i}`}
            filled={!!id}
            ok={!!id}
            label={id ? `Letter ${i + 1}: ${byId[id].letter}` : `Letter ${i + 1}: empty`}
            sx={{ textTransform: "lowercase" }}
          >
            {id ? byId[id].label : ""}
          </Slot>
        ))}
      </Row>
      <Row>
        {tray.map((tile) => (
          <Tile
            key={tile.id}
            label={tile.letter}
            state={tile.id === glowId ? "glow" : hint.revealed ? "dim" : "idle"}
            shake={shakeId === tile.id}
            onClick={() => tap(tile)}
            data={{ onPointerDown: drag.start(tile.id), ...(e2e ? { "data-letter": tile.letter } : {}) }}
            sx={{
              minWidth: { xs: 72, sm: 96 },
              minHeight: { xs: 72, sm: 96 },
              textTransform: "lowercase",
              touchAction: "none",
              userSelect: "none",
              ...drag.style(tile.id),
            }}
          >
            {tile.label}
          </Tile>
        ))}
      </Row>
    </Box>
  );
}

/**
 * Lesson intro (BUD-04): the buddy shows each new item and says it with a fun fact, one
 * after another, before any question. Tap any item to hear it again.
 */
export function Intro({ step, band, voice, buddy, heard, onHeard }) {
  const [current, setCurrent] = useState(/** @type {string | null} */ (null));
  // The word first (a grown-up's recording when there is one), then its fun fact.
  const say = (it, done) => {
    const opts = { band, buddy, enabled: voice };
    speak(words(it), {
      ...opts,
      done: it.fact ? () => speak(it.fact, { ...opts, done }) : done,
    });
  };
  const hear = (it) => {
    setCurrent(it.id);
    say(it, () => setCurrent(null));
    onHeard(it.id);
  };
  const playAll = useEffectEvent(() => {
    const items = step.items;
    const go = (i) => {
      if (i >= items.length) return setCurrent(null);
      setCurrent(items[i].id);
      onHeard(items[i].id);
      say(items[i], () => setTimeout(() => go(i + 1), 250));
    };
    speak(step.say, { band, buddy, enabled: voice, done: () => go(0) });
  });
  useEffect(() => {
    const id = setTimeout(playAll, 300);
    return () => clearTimeout(id);
  }, [step.id]);
  return (
    <Row>
      {step.items.map((it) => (
        <Tile
          key={it.id}
          label={`Hear ${words(it)}`}
          state={current === it.id ? "glow" : heard.includes(it.id) ? "right" : "idle"}
          onClick={() => hear(it)}
          sx={{
            flexDirection: "column",
            gap: 1,
            minWidth: { xs: 120, sm: 170 },
            minHeight: { xs: 150, sm: 210 },
          }}
        >
          {isNumber(it) ? (
            <>
              <span>{it.label}</span>
              <Group count={it.number} emoji={it.emoji} size={{ xs: 18, sm: 24 }} />
            </>
          ) : (
            <>
              <Box component="span" sx={{ fontSize: { xs: 56, sm: 72 } }}>
                <ItemFace it={it} />
              </Box>
              <Box component="span" sx={{ fontSize: { xs: 22, sm: 28 } }}>
                {it.label}
              </Box>
            </>
          )}
        </Tile>
      ))}
    </Row>
  );
}

export const EXERCISES = {
  intro: Intro,
  "listen-tap": ListenTap,
  "name-it": NameIt,
  count: Count,
  compare: Compare,
  match: Match,
  sequence: Sequence,
  "odd-one-out": OddOneOut,
  "case-match": CaseMatch,
  sort: Sort,
  "build-word": BuildWord,
  jigsaw: JigsawStep,
};
