import { notFound } from "next/navigation";
import { getSubjects, getReadyUnits, getUnit } from "@trailbuddies/content";
import LessonPlayer from "@/components/lesson/LessonPlayer";

export const dynamicParams = false;
/** Every lesson and trophy of every unit with content. */
export const generateStaticParams = () =>
  getSubjects().flatMap((s) =>
    getReadyUnits(s.id).flatMap((u) => [
      ...u.lessons.map((_, i) => ({ unit: u.id, step: String(i + 1) })),
      { unit: u.id, step: "trophy" },
    ]),
  );

export async function generateMetadata({ params }) {
  const { unit, step } = await params;
  const u = getUnit(unit);
  const title = step === "trophy" ? `${u?.title} trophy` : u?.lessons[Number(step) - 1]?.title;
  return { title: `${title || "Lesson"} · Trailbuddies` };
}

export default async function LessonPage({ params }) {
  const { unit, step } = await params;
  if (!getUnit(unit)) notFound();
  // Keyed so moving to the next lesson starts a fresh player.
  return (
    <LessonPlayer
      key={`${unit}/${step}`}
      where={{ kind: step === "trophy" ? "trophy" : "lesson", unitId: unit, step }}
    />
  );
}
