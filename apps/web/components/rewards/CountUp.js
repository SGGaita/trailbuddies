"use client";
import { useEffect, useEffectEvent, useState } from "react";

/** Counts up to `value` (RWD-03's count-up). Shows the final number with reduced motion. */
export default function CountUp({ value, ms = 900, prefix = "" }) {
  const [shown, setShown] = useState(0);
  const run = useEffectEvent(() => {
    if (document.documentElement.dataset.calm === "1") {
      requestAnimationFrame(() => setShown(value));
      return () => {};
    }
    const t0 = performance.now();
    let id = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  });
  useEffect(() => run(), [value]);
  return (
    <span aria-label={`${prefix}${value}`}>
      {prefix}
      {shown}
    </span>
  );
}
