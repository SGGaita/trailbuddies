"use client";
import GrownUpGate from "@/components/GrownUpGate";

/** Everything under /family is behind the parent gate. */
export default function FamilyLayout({ children }) {
  return <GrownUpGate>{children}</GrownUpGate>;
}
