import { Suspense } from "react";
import About from "@/components/onboarding/About";

export const metadata = { title: "About you · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <About />
    </Suspense>
  );
}
