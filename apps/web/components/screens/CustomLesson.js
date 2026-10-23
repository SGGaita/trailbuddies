"use client";
import { useSearchParams } from "next/navigation";
import LessonPlayer from "@/components/lesson/LessonPlayer";

/** A lesson a grown-up made, from Family Island (MAP-06, BLD-08). */
export default function CustomLesson() {
  const id = useSearchParams().get("id");
  return <LessonPlayer key={id} where={{ kind: "custom", id }} />;
}
