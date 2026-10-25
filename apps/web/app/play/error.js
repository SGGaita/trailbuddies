"use client";
import CalmError from "@/components/CalmError";

/** OFF-07: anything that breaks in the children's app lands here, calmly. */
export default function PlayError({ error, reset }) {
  return <CalmError error={error} reset={reset} />;
}
