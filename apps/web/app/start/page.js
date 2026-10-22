import { Suspense } from "react";
import Welcome from "@/components/onboarding/Welcome";

export const metadata = { title: "Welcome · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}
