import { Suspense } from "react";
import ChildLessons from "@/components/screens/ChildLessons";
import Loading from "@/components/Loading";

export const metadata = { title: "Lessons for a child · Trailbuddies" };

/** P31 (PAR-09/10): /family/progress/lessons?learner=<id>. */
export default function ChildLessonsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ChildLessons />
    </Suspense>
  );
}
