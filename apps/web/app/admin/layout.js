import StaffShell from "@/components/admin/StaffShell";

export const metadata = { title: "Staff · Trailbuddies", robots: { index: false } };

/** The staff area (CMS-01): content admin, staff and roles, and the moderation queue. */
export default function Layout({ children }) {
  return <StaffShell>{children}</StaffShell>;
}
