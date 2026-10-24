"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LessonPlayer from "@/components/lesson/LessonPlayer";
import Loading from "@/components/Loading";

/**
 * Lessons of units that arrived in a content pack after this build (CNT-02): they have no
 * page of their own, so they play here, e.g. /play/go?unit=numbers-11-20&step=2.
 */
function Go() {
  const q = useSearchParams();
  const unit = q.get("unit") || "";
  const step = q.get("step") || "1";
  return (
    <LessonPlayer
      key={`${unit}/${step}`}
      where={{ kind: step === "trophy" ? "trophy" : "lesson", unitId: unit, step }}
    />
  );
}

export default function GoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Go />
    </Suspense>
  );
}
