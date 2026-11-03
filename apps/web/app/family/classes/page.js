import { Suspense } from "react";
import JoinClass from "@/components/screens/JoinClass";

export const metadata = { title: "Classes · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <JoinClass />
    </Suspense>
  );
}
