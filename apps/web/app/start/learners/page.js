import { Suspense } from "react";
import Learners from "@/components/onboarding/Learners";

export const metadata = { title: "Who's learning? · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Learners />
    </Suspense>
  );
}
