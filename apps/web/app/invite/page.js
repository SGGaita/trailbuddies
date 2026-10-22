import { Suspense } from "react";
import AcceptInvite from "@/components/onboarding/AcceptInvite";

export const metadata = { title: "Join a family · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <AcceptInvite />
    </Suspense>
  );
}
