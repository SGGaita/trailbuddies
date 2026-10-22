import { ISL } from "@/lib/art";
import { subjectFills } from "@trailbuddies/tokens";

/**
 * Island picture for a subject place on the map.
 * @param {{ kind: string, width?: number | string, height?: number | string }} props
 */
export default function Island({ kind, width = 180, height = 120 }) {
  return (
    <span
      style={{
        width,
        height,
        borderRadius: "50% 50% 46% 54% / 60% 60% 40% 40%",
        background: subjectFills[kind] || "#f5ebd3",
        display: "grid",
        placeItems: "center",
        border: "4px solid rgba(0,0,0,.08)",
        boxShadow: "0 10px 0 -2px rgba(0,0,0,.08)",
        flex: "none",
      }}
    >
      <svg
        viewBox="0 0 112 80"
        width="62%"
        height="66%"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: ISL[kind] || "" }}
      />
    </span>
  );
}
