import { ISL } from "@/lib/art";
import { subjectFills } from "@trailbuddies/tokens";
import { uploadSrc } from "@trailbuddies/content";

/**
 * Island picture for a subject place on the map.
 * A trail added in the content admin shows its uploaded, approved illustration (CMS-05).
 * @param {{ kind: string, art?: string | null, width?: number | string, height?: number | string }} props
 */
export default function Island({ kind, art = null, width = 180, height = 120 }) {
  const src = uploadSrc(art);
  return (
    <span
      style={{
        width,
        height,
        borderRadius: "50% 50% 46% 54% / 60% 60% 40% 40%",
        background: src ? `#f5ebd3 url("${src}") center / cover` : subjectFills[kind] || "#f5ebd3",
        display: "grid",
        placeItems: "center",
        border: "4px solid rgba(0,0,0,.08)",
        boxShadow: "0 10px 0 -2px rgba(0,0,0,.08)",
        flex: "none",
      }}
    >
      {!src && (
        <svg
          viewBox="0 0 112 80"
          width="62%"
          height="66%"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: ISL[kind] || "" }}
        />
      )}
    </span>
  );
}
