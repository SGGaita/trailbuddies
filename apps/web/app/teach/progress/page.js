import { Suspense } from "react";
import ClassProgress from "@/components/teach/ClassProgress";

export const metadata = { title: "Class progress · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <ClassProgress />
    </Suspense>
  );
}
