import { Suspense } from "react";
import Rewards from "@/components/screens/Rewards";
import Loading from "@/components/Loading";

export const metadata = { title: "Wishes & awards · Trailbuddies" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Rewards />
    </Suspense>
  );
}
