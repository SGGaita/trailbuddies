import { BUDDIES, OUTFITS, buddyBody } from "@/lib/art";

const BODY = { wave: "cheer", point: "happy" };

/**
 * A buddy character, drawn and animated in SVG (a Lottie file can replace a state later).
 * Moods: happy, cheer, think, sleep, wave (arms up, rocking hello), point (points at the
 * next thing to do).
 * @param {{ id?: string | null, mood?: "happy" | "cheer" | "think" | "sleep" | "wave" | "point", size?: number, outfit?: Record<string, string>, still?: boolean }} props
 */
export default function Buddy({ id, mood = "happy", size = 120, outfit = {}, still = false }) {
  const key = id && BUDDIES[id] ? id : "zip";
  const b = BUDDIES[key];
  const acc = ["neck", "eyes", "hat"]
    .map((slot) => (outfit[slot] && OUTFITS[outfit[slot]] ? OUTFITS[outfit[slot]].svg(b) : ""))
    .join("");
  const point =
    mood === "point"
      ? `<g class="buddy-point"><text x="168" y="150" font-size="56" text-anchor="middle">👉</text></g>`
      : "";
  return (
    <svg
      className={still ? undefined : `buddy${mood === "wave" ? " buddy-wave" : ""}`}
      viewBox={mood === "point" ? "-10 -40 250 260" : "-10 -40 220 260"}
      width={mood === "point" ? Math.round((size * 250) / 220) : size}
      height={Math.round((size * 260) / 220)}
      role="img"
      aria-label={`${b.name} the ${b.kind}`}
      data-mood={mood}
      style={{ flex: "none", display: "block" }}
      dangerouslySetInnerHTML={{ __html: buddyBody(key, BODY[mood] || mood) + acc + point }}
    />
  );
}
