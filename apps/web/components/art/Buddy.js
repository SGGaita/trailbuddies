import { BUDDIES, OUTFITS, buddyBody } from "@/lib/art";

/**
 * A buddy character. Markup comes from constants in lib/art.js only.
 * @param {{ id?: string | null, mood?: "happy" | "cheer" | "think" | "sleep", size?: number, outfit?: Record<string, string>, still?: boolean }} props
 */
export default function Buddy({ id, mood = "happy", size = 120, outfit = {}, still = false }) {
  const key = id && BUDDIES[id] ? id : "zip";
  const b = BUDDIES[key];
  const acc = ["neck", "eyes", "hat"]
    .map((slot) => (outfit[slot] && OUTFITS[outfit[slot]] ? OUTFITS[outfit[slot]].svg(b) : ""))
    .join("");
  return (
    <svg
      className={still ? undefined : "buddy"}
      viewBox="-10 -40 220 260"
      width={size}
      height={Math.round((size * 260) / 220)}
      role="img"
      aria-label={`${b.name} the ${b.kind}`}
      style={{ flex: "none", display: "block" }}
      dangerouslySetInnerHTML={{ __html: buddyBody(key, mood) + acc }}
    />
  );
}
