import { Suspense } from "react";
import BadgeStudio from "@/components/builder/BadgeStudio";
import Loading from "@/components/Loading";

export const metadata = { title: "Badge Studio · Trailbuddies" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <BadgeStudio />
    </Suspense>
  );
}
