"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { BUDDY_ART } from "@/lib/art";
import { buddyGait } from "@/lib/buddyGait";

/** The preview canvas replaces the still portrait once its first walk frame is ready. */
export default function BuddyWalk({ id }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const calm = () => reduced.matches || document.documentElement.dataset.calm === "1";
    if (!context || calm()) return;
    let active = true;
    let frame;
    const image = new Image();
    image.src = `${BUDDY_ART}/${id}.webp`;
    image
      .decode()
      .then(() => {
        if (!active || calm()) return;
        const paint = buddyGait(image, id);
        const start = performance.now();
        const tick = (time) => {
          if (calm()) {
            delete canvas.dataset.walkReady;
            return;
          }
          const progress = Math.min(1, (time - start) / 2000);
          paint(context, progress);
          canvas.dataset.walkReady = "true";
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {});
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [id]);

  return (
    <Box
      component="canvas"
      ref={ref}
      width={480}
      height={320}
      aria-hidden="true"
      data-action="walk"
      sx={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        visibility: "hidden",
        "&[data-walk-ready]": { visibility: "visible" },
      }}
    />
  );
}
