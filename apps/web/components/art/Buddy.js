"use client";

import { BUDDIES, OUTFITS, buddySrc } from "@/lib/art";
import { useFamily } from "@/lib/store";
import BuddyMotion from "./BuddyMotion";

// Hat, eyes and neck anchors on the illustrated portraits inside the shared viewBox.
const FIT = {
  zip: { hat: [110, 79, 0.82], eyes: [110, 108, 0.85], neck: [108, 156, 0.71] },
  tumi: { hat: [142, 76, 0.69], eyes: [145, 109, 0.74], neck: [137, 146, 0.67] },
  jumbo: { hat: [128, 76, 0.82], eyes: [136, 111, 0.82], neck: [117, 156, 0.83] },
  kiki: { hat: [151, 75, 0.71], eyes: [153, 100, 0.77], neck: [145, 148, 0.7] },
};
const OUTFIT_CANVAS = { hatY: 0, eyeY: 0, neckY: 0, headW: 100 };

/**
 * Shared illustrated buddy used by onboarding, lessons, maps and rewards.
 * @param {{ id?: string | null, fallback?: string, mood?: "happy" | "cheer" | "think" | "sleep" | "wave" | "point", size?: number, outfit?: Record<string, string>, still?: boolean }} props
 */
export default function Buddy({
  id,
  fallback = "zip",
  mood = "happy",
  size = 120,
  outfit = {},
  still = false,
}) {
  const selected = useFamily((s) => id === undefined && s.learners.find((l) => l.id === s.activeId)?.buddy);
  const candidate = id || selected || fallback;
  const key = Object.hasOwn(BUDDIES, candidate) ? candidate : "zip";
  const buddy = BUDDIES[key];
  const pointing = mood === "point";
  const src = buddySrc(key, size);
  return (
    <svg
      className={still || mood === "sleep" ? undefined : "buddy"}
      viewBox={pointing ? "0 0 250 260" : "0 0 220 260"}
      width={pointing ? Math.round((size * 250) / 220) : size}
      height={Math.round((size * 260) / 220)}
      role="img"
      aria-label={`${buddy.name} the ${buddy.kind}`}
      data-mood={mood}
      style={{ flex: "none", display: "block" }}
    >
      <image data-buddy-art="" href={src} x="4" y="36" width="212" height="218" />
      {!still && mood !== "sleep" && (
        <foreignObject x="4" y="36" width="212" height="218">
          <BuddyMotion id={key} src={src} gesture={mood === "wave" ? "wave" : undefined} />
        </foreignObject>
      )}
      {["neck", "eyes", "hat"].map((slot) => {
        const accessory = OUTFITS[outfit[slot]];
        if (!accessory || accessory.slot !== slot) return null;
        const [x, y, scale] = FIT[key][slot];
        const anchorY = outfit[slot] === "astronaut" ? FIT[key].eyes[1] : y;
        return (
          <g
            key={slot}
            transform={`translate(${x} ${anchorY}) scale(${scale}) translate(-100 0)`}
            dangerouslySetInnerHTML={{ __html: accessory.svg(OUTFIT_CANVAS) }}
          />
        );
      })}
      {pointing && (
        <text className="buddy-point" x="212" y="166" fontSize="49" textAnchor="middle">
          {"\u{1F449}"}
        </text>
      )}
    </svg>
  );
}
