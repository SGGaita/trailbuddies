import { notFound } from "next/navigation";
import { getSubjects, getSubject } from "@trailbuddies/content";
import LessonPlayer from "@/components/lesson/LessonPlayer";

export const dynamicParams = false;
export const generateStaticParams = () => getSubjects().map((s) => ({ subject: s.id }));
export const metadata = { title: "Practice · Trailbuddies" };

export default async function ReviewPage({ params }) {
  const { subject } = await params;
  if (!getSubject(subject)) notFound();
  return <LessonPlayer key={subject} where={{ kind: "review", subjectId: subject }} />;
}
