import { Suspense } from "react";
import ClassBadges from "@/components/teach/ClassBadges";
import Loading from "@/components/Loading";

export const metadata = { title: "Class badges · Trailbuddies" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ClassBadges />
    </Suspense>
  );
}
