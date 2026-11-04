import { Suspense } from "react";
import Letters from "@/components/teach/Letters";

export const metadata = { title: "Class · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Letters />
    </Suspense>
  );
}
