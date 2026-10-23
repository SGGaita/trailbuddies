import { Suspense } from "react";
import PreviewLesson from "@/components/builder/PreviewLesson";
import Loading from "@/components/Loading";

export const metadata = { title: "Preview · Trailbuddies" };

export default function PreviewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PreviewLesson />
    </Suspense>
  );
}
