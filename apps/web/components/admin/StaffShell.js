"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { can } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { api } from "@/lib/account";

/** @type {import("react").Context<{ email: string, role: string, can: string[] } | null>} */
const StaffContext = createContext(null);
/** The signed-in staff member (inside /admin). */
export const useStaff = () => useContext(StaffContext);

const NAV = [
  { href: "/admin/content", key: "content", show: (r) => can(r, "edit") || can(r, "approve-asset") },
  { href: "/admin/staff", key: "staff", show: (r) => can(r, "roles") },
  { href: "/admin/moderation", key: "moderation", show: (r) => can(r, "moderate") },
];

/**
 * The staff area (CMS-01): one shell for every /admin screen. Each role sees only the screens
 * it may use; the API checks the role again on every call. Staff screens never show children's
 * names or families' data.
 */
export default function StaffShell({ children }) {
  const path = usePathname();
  const [me, setMe] = useState(/** @type {any} */ (null));
  const [denied, setDenied] = useState(/** @type {"" | "signin" | "forbidden" | "error"} */ (""));

  useEffect(() => {
    let live = true;
    api.staffMe().then(
      (m) => live && setMe(m),
      (e) => live && setDenied(e.status === 401 ? "signin" : e.status === 403 ? "forbidden" : "error"),
    );
    return () => {
      live = false;
    };
  }, []);

  const nav = me ? NAV.filter((n) => n.show(me.role)) : [];
  const allowed = !me || path === "/admin" || nav.some((n) => path.startsWith(n.href));

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: colors.cream,
        color: colors.ink,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
      }}
    >
      <Box
        component="nav"
        aria-label={t("staff.nav")}
        sx={{
          flex: "none",
          width: { md: 240 },
          bgcolor: "background.paper",
          borderRight: { md: `2px solid ${colors.line}` },
          borderBottom: { xs: `2px solid ${colors.line}`, md: 0 },
          px: 2,
          py: { xs: 1.5, md: 3 },
          display: "flex",
          flexDirection: { xs: "row", md: "column" },
          flexWrap: "wrap",
          alignItems: { xs: "center", md: "stretch" },
          gap: 0.75,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: ".08em", mr: { xs: 1, md: 0 }, mb: { md: 1.5 } }}>
          {t("staff.brand")}
        </Typography>
        {nav.map((n) => {
          const on = path.startsWith(n.href);
          return (
            <Box
              key={n.href}
              component={Link}
              href={n.href}
              aria-current={on ? "page" : undefined}
              sx={{
                textDecoration: "none",
                color: on ? colors.leaf.deep : "text.primary",
                bgcolor: on ? colors.leaf.soft : "transparent",
                fontWeight: on ? 800 : 600,
                borderRadius: 4.5,
                px: 1.5,
                py: 1.25,
              }}
            >
              {t(`staff.navItem.${n.key}`)}
            </Box>
          );
        })}
        {me && (
          <Box sx={{ mt: { md: "auto" }, ml: { xs: "auto", md: 0 }, border: { md: `2px solid ${colors.line}` }, borderRadius: 3, p: { md: 1.25 }, fontSize: 13 }}>
            <Box component="b" sx={{ display: { xs: "none", md: "block" }, overflowWrap: "anywhere" }}>
              {me.email}
            </Box>
            <Box component="span" sx={{ color: "text.secondary" }} data-role={me.role}>
              {t(`staff.role.${me.role}`)}
            </Box>
          </Box>
        )}
      </Box>
      <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 1400, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {denied ? (
            <Alert severity={denied === "error" ? "warning" : "info"} sx={{ borderRadius: 4 }}>
              {t(`staff.denied.${denied}`)} {denied === "signin" && <Link href="/start/account">{t("staff.signIn")}</Link>}
            </Alert>
          ) : !me ? (
            <Typography>{t("staff.loading")}</Typography>
          ) : !allowed ? (
            <Alert severity="info" sx={{ borderRadius: 4 }}>
              {t("staff.notYourRole")}
            </Alert>
          ) : (
            <StaffContext.Provider value={me}>{children}</StaffContext.Provider>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/** A screen heading with an optional line under it and actions on the right (prototype `head()`). */
export function StaffHead({ title, sub, children }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
      <Box sx={{ flex: "1 1 280px", minWidth: 0 }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: 24, md: 28 }, lineHeight: 1.2 }}>
          {title}
        </Typography>
        {sub && <Typography sx={{ color: "text.secondary" }}>{sub}</Typography>}
      </Box>
      {children && <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>{children}</Box>}
    </Box>
  );
}
