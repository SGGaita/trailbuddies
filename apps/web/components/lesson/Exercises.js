"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Icon from "@/components/Icon";
import { colors } from "@trailbuddies/tokens";
import { speak } from "@/lib/speech";

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
    face: isNumber(it) ? it.label : it.emoji || it.label,
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
      <Icon name="speak" size={22} />
    </IconButton>
  );
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5 }}>
      <Box aria-hidden="true" sx={{ fontSize: { xs: 84, sm: 120 }, lineHeight: 1 }}>
        {step.target.emoji}
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

/** "Which group is different?" */
export function OddOneOut(props) {
  const { step } = props;
  const options = step.extra.groups.map((g) => ({
    id: g.id,
    label: `${g.count} ${g.emoji}`,
    face: <Group count={g.count} emoji={g.emoji} size={{ xs: 20, sm: 28 }} />,
  }));
  return <SingleChoice {...props} options={options} answerId={step.extra.answer} />;
}

/**
 * "Match each group to its number." Drag a tile onto its partner, or tap one then the
 * other (touch, mouse or keyboard). A right pair locks; a wrong one springs back.
 */
export function Match({ step, hint, done, onTry, e2e }) {
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
  const left = (it) =>
    numbers ? <Group count={it.number} emoji={it.emoji} size={{ xs: 18, sm: 24 }} /> : it.emoji;
  const right = (it) => it.label;
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

/** "Put the numbers in order." Tap them smallest first; they fill the slots. */
export function Sequence({ step, hint, done, onTry, e2e }) {
  const [placed, setPlaced] = useState(/** @type {string[]} */ ([]));
  const [shakeId, shake] = useShake();
  const nextId = step.items[placed.length]?.id;
  const tap = (it) => {
    if (done || placed.includes(it.id)) return;
    if (it.id === nextId) {
      const now = [...placed, it.id];
      setPlaced(now);
      onTry({ correct: true, finished: now.length === step.items.length, chosenId: it.id });
    } else {
      shake(it.id);
      onTry({ correct: false, finished: false, chosenId: it.id, wrongIds: [] });
    }
  };
  const remaining = step.options.filter((o) => !placed.includes(o.id));
  useDigits((n) => remaining[n] && tap(remaining[n]), !done);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: { xs: 2.5, sm: 4 } }}>
      <Row sx={{ gap: { xs: 1, sm: 1.5 } }}>
        {step.items.map((it, i) => (
          <Box
            key={it.id}
            aria-label={placed[i] ? `Place ${i + 1}: ${words(it)}` : `Place ${i + 1}: empty`}
            role="img"
            sx={{
              width: { xs: 60, sm: 84 },
              height: { xs: 60, sm: 84 },
              borderRadius: 4,
              border: `3px dashed ${placed[i] ? colors.leaf.main : colors.line}`,
              bgcolor: placed[i] ? colors.leaf.soft : "transparent",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: { xs: 30, sm: 42 },
            }}
          >
            {placed[i] ? it.label : ""}
          </Box>
        ))}
      </Row>
      <Row>
        {step.options.map((it) => (
          <Tile
            key={it.id}
            label={words(it)}
            state={
              placed.includes(it.id)
                ? "gone"
                : glowing(hint) && it.id === nextId
                  ? "glow"
                  : hint.revealed
                    ? "dim"
                    : "idle"
            }
            shake={shakeId === it.id}
            onClick={() => tap(it)}
            data={e2e ? { "data-order": String(step.items.findIndex((x) => x.id === it.id)) } : {}}
          >
            {it.label}
          </Tile>
        ))}
      </Row>
    </Box>
  );
}

/** Lesson intro: meet each new item. Tap to hear it and its fact; the player shows "Let's play" below. */
export function Intro({ step, band, voice, heard, onHeard }) {
  const hear = (it) => {
    speak(it.fact ? `${words(it)}. ${it.fact}` : words(it), { band, enabled: voice });
    onHeard(it.id);
  };
  return (
    <Row>
      {step.items.map((it) => (
        <Tile
          key={it.id}
          label={`Hear ${words(it)}`}
          state={heard.includes(it.id) ? "right" : "idle"}
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
                {it.emoji}
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
};
