import { Suspense } from "react";
import Consent from "@/components/onboarding/Consent";

export const metadata = { title: "Privacy · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Consent />
    </Suspense>
  );
}
