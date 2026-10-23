import { Suspense } from "react";
import LessonEditor from "@/components/builder/LessonEditor";
import Loading from "@/components/Loading";

export const metadata = { title: "Make a lesson · Trailbuddies" };

export default function LessonEditorPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LessonEditor />
    </Suspense>
  );
}
