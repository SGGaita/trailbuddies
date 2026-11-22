"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import UnitEditor from "@/components/admin/UnitEditor";

function Edit() {
  const id = useSearchParams().get("id") || "";
  return <UnitEditor key={id} id={id} />;
}

/** E03: /admin/content/unit?id=<unit> (one page for every unit, including ones from packs). */
export default function Page() {
  return (
    <Suspense>
      <Edit />
    </Suspense>
  );
}
