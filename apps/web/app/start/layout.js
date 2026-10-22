"use client";
import { usePathname } from "next/navigation";
import { useFamily, useHydrated } from "@/lib/store";
import { setupStep } from "@/lib/account";
import GrownUpGate from "@/components/GrownUpGate";

// Pages a child may see: the welcome, sign-in, the placement check and the hand-over.
const OPEN = ["/start", "/start/account", "/start/check", "/start/handover"];

/** Once a family is set up, the grown-up onboarding pages need the parent gate too. */
export default function StartLayout({ children }) {
  const ready = useHydrated();
  const path = usePathname();
  const setUp = useFamily((s) => s.mode === "account" && setupStep(s) === null);
  if (!ready || !setUp || OPEN.includes(path)) return children;
  return <GrownUpGate setup={false}>{children}</GrownUpGate>;
}
