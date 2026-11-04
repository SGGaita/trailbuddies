"use client";
import { usePathname } from "next/navigation";
import GrownUpGate from "@/components/GrownUpGate";

/** Teachers' screens are behind the grown-up gate too: children use the same device in class. */
export default function TeachLayout({ children }) {
  return usePathname() === "/teach/start" ? children : <GrownUpGate setup={false}>{children}</GrownUpGate>;
}
