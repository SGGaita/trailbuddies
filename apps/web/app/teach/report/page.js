import { Suspense } from "react";
import ProgressReport from "@/components/teach/ProgressReport";

export const metadata = { title: "Class progress report · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <ProgressReport />
    </Suspense>
  );
}
