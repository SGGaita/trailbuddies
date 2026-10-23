"use client";
import { useSearchParams } from "next/navigation";
import LessonPlayer from "@/components/lesson/LessonPlayer";

/** BLD-07: play a custom lesson exactly as a child would; nothing is recorded. */
export default function PreviewLesson() {
  const params = useSearchParams();
  const id = params.get("id");
  const learnerId = params.get("learner");
  return <LessonPlayer key={`${id}/${learnerId}`} where={{ kind: "custom", id, preview: true, learnerId }} />;
}
