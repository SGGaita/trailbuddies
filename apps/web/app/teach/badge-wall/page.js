import { Suspense } from "react";
import BadgeWall from "@/components/teach/BadgeWall";

export const metadata = { title: "Badge wall · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <BadgeWall />
    </Suspense>
  );
}
