import { Suspense } from "react";
import AssignWork from "@/components/teach/AssignWork";

export const metadata = { title: "Assign work · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <AssignWork />
    </Suspense>
  );
}
