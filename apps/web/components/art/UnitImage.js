"use client";
import { useState } from "react";

/**
 * A unit item's illustration (sized like an emoji, 1em), falling back to the emoji while the
 * file isn't there yet (CNT-03: pictures arrive one by one as they're approved).
 * @param {{ it: { imageSrc: string, emoji?: string, label: string } }} props
 */
export default function UnitImage({ it }) {
  const [failed, setFailed] = useState(false);
  if (failed) return it.emoji || it.label;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny, already-sized WebP; works offline
    <img
      src={it.imageSrc}
      alt=""
      width={512}
      height={512}
      onError={() => setFailed(true)}
      style={{ width: "1.15em", height: "1.15em", objectFit: "contain", verticalAlign: "middle" }}
    />
  );
}
