import { Suspense } from "react";
import ChildProgress from "@/components/screens/ChildProgress";
import Loading from "@/components/Loading";

export const metadata = { title: "Progress · Trailbuddies" };

export default function ProgressPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ChildProgress />
    </Suspense>
  );
}
