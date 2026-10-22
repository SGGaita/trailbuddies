import { Suspense } from "react";
import Interests from "@/components/onboarding/Interests";

export const metadata = { title: "Interests · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Interests />
    </Suspense>
  );
}
