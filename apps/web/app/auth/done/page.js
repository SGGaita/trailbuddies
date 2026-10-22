import { Suspense } from "react";
import SignedIn from "@/components/onboarding/SignedIn";

export const metadata = { title: "Signing in · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <SignedIn google />
    </Suspense>
  );
}
