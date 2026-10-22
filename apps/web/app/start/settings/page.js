import { Suspense } from "react";
import Settings from "@/components/onboarding/Settings";

export const metadata = { title: "Family settings · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}
