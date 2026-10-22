import { Suspense } from "react";
import Account from "@/components/onboarding/Account";

export const metadata = { title: "Sign in · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <Account />
    </Suspense>
  );
}
