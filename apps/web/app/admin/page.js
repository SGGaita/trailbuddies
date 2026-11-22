"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import { homeFor } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { useStaff } from "@/components/admin/StaffShell";

/** /admin opens the first screen the person's role allows. */
export default function Page() {
  const me = useStaff();
  const router = useRouter();
  const home = me ? homeFor(me.role) : null;
  useEffect(() => {
    if (home) router.replace(home);
  }, [home, router]);
  return <Typography>{t("staff.loading")}</Typography>;
}
