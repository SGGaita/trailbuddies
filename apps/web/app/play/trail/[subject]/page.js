import { notFound } from "next/navigation";
import { getSubjects, getSubject } from "@trailbuddies/content";
import Trail from "@/components/screens/Trail";

export const dynamicParams = false;
export const generateStaticParams = () => getSubjects().map((s) => ({ subject: s.id }));

export async function generateMetadata({ params }) {
  const { subject } = await params;
  return { title: `${getSubject(subject)?.place || "Trail"} · Trailbuddies` };
}

export default async function TrailPage({ params }) {
  const { subject } = await params;
  if (!getSubject(subject)) notFound();
  return <Trail subjectId={subject} />;
}
