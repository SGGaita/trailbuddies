import { Suspense } from "react";
import Classroom from "@/components/teach/Classroom";

export const metadata = { title: "Classroom mode · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Classroom />
    </Suspense>
  );
}
