import { Suspense } from "react";
import ClassPage from "@/components/teach/ClassPage";

export const metadata = { title: "Class · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <ClassPage />
    </Suspense>
  );
}
