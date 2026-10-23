import { Suspense } from "react";
import CustomLesson from "@/components/screens/CustomLesson";
import Loading from "@/components/Loading";

export const metadata = { title: "Family lesson · Trailbuddies" };

export default function CustomLessonPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CustomLesson />
    </Suspense>
  );
}
