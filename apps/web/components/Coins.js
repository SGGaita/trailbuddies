import { colors } from "@trailbuddies/tokens";

export function Star({ on = true, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
      <path
        d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.5l1.3-6.6L2.5 9.3l6.6-.8z"
        fill={on ? colors.sun.main : "#eadfc4"}
        stroke={on ? "#c98c06" : "#d8cba8"}
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function Gem({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M6 3h12l4 6-10 12L2 9z" fill={colors.sky.main} stroke={colors.sky.deep} strokeWidth="1.2" />
      <path d="M2 9h20M9 3l3 6 3-6M12 9v12" stroke={colors.sky.deep} strokeWidth="1" fill="none" />
    </svg>
  );
}

/** Pill showing stars or treasures. */
export function Coin({ kind, value, compact = false }) {
  return (
    <span
      aria-label={typeof value === "object" ? undefined : `${value} ${kind === "star" ? "stars" : "treasures"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `2px solid ${colors.line}`,
        borderRadius: 999,
        padding: compact ? "2px 10px 2px 6px" : "4px 14px 4px 8px",
        fontFamily: "var(--font-display), sans-serif",
        fontWeight: 800,
        fontSize: compact ? 16 : 20,
        background: "#fff",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {kind === "star" ? <Star size={compact ? 18 : 22} /> : <Gem size={compact ? 18 : 22} />}
      {value}
    </span>
  );
}
