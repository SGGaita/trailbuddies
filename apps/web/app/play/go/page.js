"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import LessonPlayer from "@/components/lesson/LessonPlayer";
import Loading from "@/components/Loading";
import { restorePreview } from "@/lib/cmsPreview";

/**
 * Lessons of units that arrived in a content pack after this build (CNT-02): they have no
 * page of their own, so they play here, e.g. /play/go?unit=numbers-11-20&step=2.
 */
function Go() {
  const q = useSearchParams();
  const unit = q.get("unit") || "";
  const step = q.get("step") || "1";
  // ?preview=1&learner=<id>: a grown-up reviewing a unit (records nothing; see /review).
  const preview = q.get("preview") === "1";
  const admin = preview && q.get("admin") === "1";
  // CMS-04: a reload of a staff preview puts the draft back before the player reads it.
  useState(() => admin && typeof window !== "undefined" && restorePreview(unit));
  return (
    <LessonPlayer
      key={`${unit}/${step}/${preview}/${q.get("admin")}`}
      where={{
        kind: step === "trophy" ? "trophy" : "lesson",
        unitId: unit,
        step,
        ...(preview ? { preview: true, learnerId: q.get("learner") || undefined } : {}),
        // CMS-04: staff previewing a draft from the content admin (a stand-in child).
        ...(admin ? { admin: true, band: q.get("band") || undefined } : {}),
      }}
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
