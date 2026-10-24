import { Suspense } from "react";
import Check from "@/components/onboarding/Check";
import Loading from "@/components/Loading";

export const metadata = { title: "Show what you know · Trailbuddies" };

/** ADP-05: a child's "Show what you know" quiz on a new subject; back to its trail after. */
export default function PlacementPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Check back="/play/trail/{subject}" />
    </Suspense>
  );
}
