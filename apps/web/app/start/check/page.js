import { Suspense } from "react";
import Check from "@/components/onboarding/Check";

export const metadata = { title: "Quick check · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Check />
    </Suspense>
  );
}
