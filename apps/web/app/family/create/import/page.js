import { Suspense } from "react";
import ImportLesson from "@/components/share/ImportLesson";
import Loading from "@/components/Loading";

export const metadata = { title: "Import by code · Trailbuddies" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ImportLesson />
    </Suspense>
  );
}
