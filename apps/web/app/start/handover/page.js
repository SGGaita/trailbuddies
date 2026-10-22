import { Suspense } from "react";
import Handover from "@/components/onboarding/Handover";

export const metadata = { title: "Hand over · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Handover />
    </Suspense>
  );
}
