"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { builtInBadges } from "@trailbuddies/content";
import {
  WALL_PAGE_MS,
  WALL_REFRESH_MS,
  WALL_TILE,
  badgeWall,
  newOnWall,
  pageOf,
  wallLayout,
  wallPages,
  wallScale,
  wallWeek,
} from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { avatarColors, colors } from "@trailbuddies/tokens";
import BadgeArt from "@/components/rewards/BadgeArt";
import Loading from "@/components/Loading";
import TeachShell from "@/components/shell/TeachShell";
import { api } from "@/lib/account";

const night = colors.night;
/** Badges shown on a tile before "+n more". */
const SHOWN = 4;
/** How long a newly arrived badge glows, and keeps its page on screen. */
const FRESH_MS = 8_000;

/**
 * T06 Badge wall (ASN-05): the class's badges this week, made to be projected. Every child is
 * on it, sorted by name; the rules are in packages/domain (badgeWall.js).
 */
export default function BadgeWall() {
  const id = useSearchParams().get("id");
  return <ClassBadgeWall key={id} id={id} />;
}

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

/** "16–22 Nov" from local calendar dates. */
function weekLabel(week) {
  const f = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
  const a = new Date(`${week.monday}T00:00:00Z`);
  const b = new Date(`${week.sunday}T00:00:00Z`);
  return f.formatRange ? f.formatRange(a, b) : `${f.format(a)} – ${f.format(b)}`;
}

function ClassBadgeWall({ id }) {
  const board = useRef(/** @type {HTMLDivElement | null} */ (null));
  const grid = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [back, setBack] = useState(0);
  const [state, setState] = useState(
    /** @type {{ back: number, week: any, raw: any, wall: any } | null} */ (null),
  );
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [fresh, setFresh] = useState(/** @type {Set<string>} */ (new Set()));
  const [said, setSaid] = useState("");
  const [page, setPage] = useState(0);
  /** A child whose new badge should be on screen; cleared when someone turns the page. */
  const [focus, setFocus] = useState(/** @type {string | null} */ (null));
  const [paused, setPaused] = useState(false);
  const [full, setFull] = useState(false);
  const [canFull, setCanFull] = useState(false);
  const [area, setArea] = useState({ width: 1100, height: 600, phone: false });
  const ready = state !== null;

  // Load the week, then (for this week) refresh every 30 s while the page is visible.
  useEffect(() => {
    if (!id) return;
    let live = true;
    let timer = null;
    let before = null;
    // T05: the class's own badges are on the wall too, drawn from their design.
    let catalogue = null;
    const classBadges = () =>
      catalogue
        ? Promise.resolve(catalogue)
        : api.classBadges(id).then(
            (r) => (catalogue = [...builtInBadges, ...r.badges.map((b) => ({ id: b.id, name: b.name, custom: b }))]),
            () => builtInBadges,
          );
    const load = () => {
      const week = wallWeek(new Date(), timeZone(), back);
      Promise.all([api.classBadgeWall(id, week), classBadges()]).then(
        ([raw, known]) => {
          if (!live) return;
          const wall = badgeWall(raw.students || [], known);
          const arrived = newOnWall(before, wall);
          before = wall;
          setError(false);
          setState({ back, week, raw, wall });
          if (arrived.size) {
            const keys = [...arrived];
            const first = wall.tiles.find((tile) => tile.badges.some((b) => b.key === keys[0]));
            const badge = first?.badges.find((b) => b.key === keys[0]);
            setFresh(arrived);
            setSaid(first && badge ? t("teach.badgeWallArrived", { name: first.name, badge: badge.name }) : "");
            setFocus(first?.id || null);
            setTimeout(() => live && setFresh(new Set()), FRESH_MS);
          }
        },
        () => live && setError(true),
      );
    };
    load();
    if (back === 0)
      timer = setInterval(() => {
        if (document.visibilityState === "visible") load();
      }, WALL_REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id, back, attempt]);

  // Full screen: what the browser can do, and whether the wall is showing.
  useEffect(() => {
    const update = () => {
      setCanFull(Boolean(document.fullscreenEnabled));
      setFull(Boolean(board.current) && document.fullscreenElement === board.current);
    };
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  // Keep the projector awake while the wall is full screen.
  useEffect(() => {
    if (!full || !navigator.wakeLock) return;
    let lock = null;
    let live = true;
    const ask = () =>
      navigator.wakeLock.request("screen").then(
        (l) => (live ? (lock = l) : l.release()),
        () => {},
      );
    const again = () => document.visibilityState === "visible" && ask();
    ask();
    document.addEventListener("visibilitychange", again);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", again);
      lock?.release().catch(() => {});
    };
  }, [full]);

  // How many tiles fit: measured, so a projector, a laptop and a tablet each get full pages.
  useEffect(() => {
    const el = grid.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setArea({ width, height, phone: window.innerWidth < 600 && !document.fullscreenElement });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  const wall = state?.wall;
  const scale = wallScale(area, full);
  const perPage = area.phone ? Infinity : wallLayout(area, scale).perPage;
  const pages = wall ? wallPages(wall.tiles, perPage) : [[]];
  const focusPage = focus ? pageOf(pages, focus) : -1;
  const current = focusPage >= 0 ? focusPage : Math.min(page, pages.length - 1);
  const many = pages.length > 1;

  // Turn the page every 12 s. A page with a new badge on it stays a little longer.
  useEffect(() => {
    if (!many || paused) return;
    const wait = fresh.size ? FRESH_MS + WALL_PAGE_MS / 2 : WALL_PAGE_MS;
    const timer = setTimeout(() => {
      setFocus(null);
      setPage((current + 1) % pages.length);
    }, wait);
    return () => clearTimeout(timer);
  }, [many, paused, current, pages.length, fresh]);

  function go(n) {
    setFocus(null);
    setPage(((n % pages.length) + pages.length) % pages.length);
  }

  async function toggleFull() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await board.current?.requestFullscreen();
    } catch {
      setCanFull(false);
    }
  }

  // Keys for a teacher with a clicker or a keyboard: F, ← →, Space.
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = /** @type {HTMLElement} */ (e.target).tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(tag) && e.key !== "f" && e.key !== "F") return;
      if (e.key === "f" || e.key === "F") {
        if (!["INPUT", "TEXTAREA"].includes(tag)) toggleFull();
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        go(current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        go(current - 1);
      } else if (e.key === " ") {
        e.preventDefault();
        setPaused((v) => !v);
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shown = state && state.back === back;
  const name = state?.raw.class_name || "";

  return (
    <TeachShell title={t("teach.badgeWall")} active="/teach/badges">
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
        <Button component={Link} href={id ? `/teach/class?id=${encodeURIComponent(id)}` : "/teach/badges"}>
          {t("teach.badgeWallBack")}
        </Button>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={back}
          aria-label={t("teach.badgeWallWeekLabel")}
          onChange={(_, v) => v !== null && (setBack(v), setPage(0), setFocus(null))}
          sx={{ ml: { sm: "auto" }, "& .MuiToggleButton-root": { minHeight: 44, px: 2, fontWeight: 800 } }}
        >
          <ToggleButton value={0}>{t("teach.badgeWallThisWeek")}</ToggleButton>
          <ToggleButton value={1}>{t("teach.badgeWallLastWeek")}</ToggleButton>
        </ToggleButtonGroup>
        {canFull && state && (
          <Button variant="contained" onClick={toggleFull}>
            {t("teach.badgeWallFullscreen")}
          </Button>
        )}
      </Box>

      {/* The board: this is what goes full screen and onto the projector. */}
      <Box
        ref={board}
        data-wall
        sx={{
          bgcolor: night.bg,
          color: night.fg,
          borderRadius: 5.5,
          p: { xs: 2, sm: 3 },
          display: "flex",
          flexDirection: "column",
          gap: 2,
          // A fixed height on tablet and desktop: the pages are worked out from it, so it must not
          // grow with the tiles. On a phone the wall is a list that scrolls with the page.
          minHeight: { xs: 420, sm: 0 },
          height: { sm: "max(480px, calc(100dvh - 190px))" },
          "&:fullscreen": { borderRadius: 0, p: { xs: 3, lg: 5 }, height: "100dvh", minHeight: 0 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="h2"
              sx={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                lineHeight: 1.1,
                fontSize: { xs: 28, sm: 36, lg: 44 },
                "[data-wall]:fullscreen &": { fontSize: { xs: 36, lg: 56 } },
              }}
            >
              {shown ? t("teach.badgeWallTitle", { name }) : t("teach.badgeWall")}
            </Typography>
            {shown && (
              <Typography sx={{ color: night.muted, fontSize: { xs: 18, sm: 22 }, fontWeight: 700, mt: 0.5 }}>
                {t(back ? "teach.badgeWallLastWeek" : "teach.badgeWallThisWeek")} · {weekLabel(state.week)}
              </Typography>
            )}
          </Box>
          {full && (
            <Button
              onClick={toggleFull}
              variant="outlined"
              sx={{ color: night.fg, borderColor: night.muted, borderWidth: 2, "&:hover": { borderWidth: 2 } }}
            >
              {t("teach.badgeWallExit")}
            </Button>
          )}
        </Box>

        {shown && <Total wall={state.wall} name={name} back={back} />}

        {error && !state && (
          <Box role="alert" sx={{ display: "grid", justifyItems: "start", gap: 1.5, py: 4 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 700 }}>{t("teach.badgeWallError")}</Typography>
            <Button variant="contained" onClick={() => (setError(false), setAttempt((n) => n + 1))}>
              {t("teach.badgeWallRetry")}
            </Button>
          </Box>
        )}
        {!id && (
          <Typography role="alert" sx={{ fontSize: 22 }}>
            {t("teach.badgeWallError")}
          </Typography>
        )}
        {id && !shown && !error && <Loading />}

        <Box
          ref={grid}
          sx={{ flex: 1, minHeight: 0, overflow: area.phone ? "visible" : "hidden", display: shown ? "block" : "none" }}
        >
          {shown && wall.tiles.length === 0 && (
            <Typography sx={{ fontSize: 22, color: night.muted }}>{t("teach.badgeWallNoStudents")}</Typography>
          )}
          {shown && (
            <Box
              component="ul"
              aria-label={many ? t("teach.badgeWallPage", { n: current + 1, total: pages.length }) : undefined}
              sx={{
                listStyle: "none",
                m: 0,
                p: 0,
                display: "grid",
                gap: `${WALL_TILE.gap}px`,
                gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${WALL_TILE.minWidth * scale}px), 1fr))`,
                gridAutoRows: `${WALL_TILE.height * scale}px`,
                animation: "wallIn .5s ease both",
                "@keyframes wallIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1 } },
                "html[data-calm='1'] &": { animation: "none" },
                "@media (prefers-reduced-motion: reduce)": { animation: "none" },
              }}
              key={`${back}-${current}`}
            >
              {pages[current].map((tile) => (
                <Tile key={tile.id} tile={tile} fresh={fresh} s={scale} />
              ))}
            </Box>
          )}
        </Box>

        {shown && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", color: night.muted }}>
            <Typography sx={{ flex: 1, minWidth: 220, fontWeight: 700 }}>
              {t("teach.badgeWallNote")}
              {back === 0 && (
                <Box component="span" sx={{ display: { xs: "none", lg: "inline" } }}>
                  {" "}
                  · {t("teach.badgeWallLive")}
                </Box>
              )}
            </Typography>
            {many && (
              <Box
                component="nav"
                aria-label={t("teach.badgeWallPage", { n: current + 1, total: pages.length })}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <IconButton
                  aria-label={t("teach.badgeWallPrev")}
                  onClick={() => go(current - 1)}
                  sx={pager}
                >
                  ‹
                </IconButton>
                <Box aria-hidden="true" sx={{ display: "flex", gap: 0.75 }}>
                  {pages.map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: i === current ? 28 : 10,
                        height: 10,
                        borderRadius: 999,
                        bgcolor: i === current ? colors.sun.main : night.raised,
                        transition: "width .3s",
                        "html[data-calm='1'] &": { transition: "none" },
                      }}
                    />
                  ))}
                </Box>
                <Typography sx={{ fontWeight: 800, color: night.fg, minWidth: 92, textAlign: "center" }}>
                  {t("teach.badgeWallPage", { n: current + 1, total: pages.length })}
                </Typography>
                <IconButton aria-label={t("teach.badgeWallNext")} onClick={() => go(current + 1)} sx={pager}>
                  ›
                </IconButton>
                <Button
                  onClick={() => setPaused((v) => !v)}
                  aria-pressed={paused}
                  sx={{ color: night.fg, minHeight: 48, fontWeight: 800 }}
                >
                  {paused ? `▶ ${t("teach.badgeWallResume")}` : `❚❚ ${t("teach.badgeWallPause")}`}
                </Button>
              </Box>
            )}
          </Box>
        )}
        <Box aria-live="polite" sx={visuallyHidden}>
          {said}
        </Box>
      </Box>
      <Typography sx={{ color: "text.secondary", mt: 1.5, display: { xs: "none", lg: "block" } }}>
        {t("teach.badgeWallKeys")}
      </Typography>
    </TeachShell>
  );
}

const pager = {
  width: 48,
  height: 48,
  borderRadius: 4,
  color: night.fg,
  bgcolor: night.raised,
  fontSize: 28,
  lineHeight: 1,
  "&:hover": { bgcolor: "#333845" },
};

const visuallyHidden = {
  position: "absolute",
  width: "1px", // a bare 1 would be 100% in sx
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

/** The class total: together, not a ranking. */
function Total({ wall, name, back }) {
  const when = t(back ? "teach.badgeWallWhenLast" : "teach.badgeWallWhenThis");
  const text =
    wall.total === 0
      ? t(back ? "teach.badgeWallTotalNoneLast" : "teach.badgeWallTotalNone")
      : wall.total === 1
        ? t("teach.badgeWallTotalOne", { name, when })
        : t("teach.badgeWallTotal", { name, n: wall.total, when });
  return (
    <Box
      sx={{
        alignSelf: "flex-start",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 2.25,
        py: 1,
        borderRadius: 999,
        bgcolor: wall.total ? colors.sun.main : night.raised,
        color: wall.total ? colors.ink : night.fg,
        fontWeight: 800,
        fontSize: { xs: 18, sm: 22 },
      }}
    >
      <span aria-hidden="true">{wall.total ? "🏅" : "🌱"}</span>
      <span data-total={wall.total}>{text}</span>
    </Box>
  );
}

/** One child: avatar, first name, and this week's badges (or "Keep going!"). */
function Tile({ tile, fresh, s }) {
  const px = (n) => `${Math.round(n * s)}px`;
  const shown = tile.badges.slice(0, SHOWN);
  const more = tile.badges.length - shown.length;
  const glowing = tile.badges.some((b) => fresh.has(b.key));
  const count = tile.badges.length;
  return (
    <Box
      component="li"
      data-student={tile.name}
      data-count={count}
      sx={{
        bgcolor: night.raised,
        borderRadius: 4.5,
        p: px(16),
        display: "flex",
        flexDirection: "column",
        gap: px(10),
        minWidth: 0,
        outline: glowing ? `3px solid ${colors.sun.main}` : "3px solid transparent",
        boxShadow: glowing ? `0 0 0 6px ${colors.sun.main}33` : "none",
        transition: "outline-color .4s, box-shadow .4s",
        "html[data-calm='1'] &": { transition: "none" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Box
          aria-hidden="true"
          sx={{
            width: px(52),
            height: px(52),
            flex: "none",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: avatarColors[tile.colour] || avatarColors.leaf,
            border: `3px solid ${night.fg}`,
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: px(26),
          }}
        >
          {tile.letter}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h3"
            sx={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: px(26),
              lineHeight: 1.1,
              color: night.fg,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tile.name}
          </Typography>
          <Typography sx={{ color: count ? colors.sun.main : night.muted, fontWeight: 800, fontSize: px(17) }}>
            {count === 0
              ? t("teach.badgeWallKeepGoing")
              : count === 1
                ? t("teach.badgeWallNewOne")
                : t("teach.badgeWallNew", { n: count })}
          </Typography>
        </Box>
      </Box>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", alignItems: "center", gap: 1 }}>
        {count === 0 ? (
          <Box component="li" aria-hidden="true" sx={{ display: "flex", gap: 1, opacity: 0.35 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ width: px(52), height: px(52), borderRadius: "50%", border: `3px dashed ${night.muted}` }} />
            ))}
          </Box>
        ) : (
          shown.map((b) => (
            <Box
              component="li"
              key={b.id}
              title={b.name}
              aria-label={b.name}
              data-badge={b.id}
              data-fresh={fresh.has(b.key) ? "yes" : undefined}
              sx={{
                display: "grid",
                "&[data-fresh]": { animation: "badgePop .9s ease both" },
                "@keyframes badgePop": {
                  "0%": { transform: "scale(.4)", opacity: 0 },
                  "60%": { transform: "scale(1.15)", opacity: 1 },
                  "100%": { transform: "scale(1)" },
                },
                "html[data-calm='1'] &[data-fresh]": { animation: "none" },
                "@media (prefers-reduced-motion: reduce)": { "&[data-fresh]": { animation: "none" } },
              }}
            >
              <BadgeArt badge={b} size={Math.round(52 * s)} />
            </Box>
          ))
        )}
        {more > 0 && (
          <Box
            component="li"
            aria-label={t("teach.badgeWallMoreLabel", { n: more })}
            sx={{
              px: 1.25,
              height: px(36),
              fontSize: px(16),
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              bgcolor: night.bg,
              color: night.fg,
              fontWeight: 800,
            }}
          >
            {t("teach.badgeWallMore", { n: more })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
