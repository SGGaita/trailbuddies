import { Suspense } from "react";
import ConfirmDelete from "@/components/screens/ConfirmDelete";

export const metadata = { title: "Delete your family · Trailbuddies" };

export default function Page() {
  return (
    <Suspense>
      <ConfirmDelete />
    </Suspense>
  );
}
