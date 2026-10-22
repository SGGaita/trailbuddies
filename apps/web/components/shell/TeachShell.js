"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import Icon from "@/components/Icon";
import Buddy from "@/components/art/Buddy";

export const TEACH_NAV = [
  { href: "/teach", icon: "home", key: "teach.home" },
  { href: "/teach/class", icon: "users", key: "teach.class" },
  { href: "/teach/assign", icon: "assign", key: "teach.assign" },
  { href: "/teach/progress", icon: "chart", key: "teach.progress" },
  { href: "/teach/badges", icon: "badge", key: "teach.badges" },
  { href: "/teach/classroom", icon: "tablet", key: "teach.classroom" },
];

/**
 * Teacher frame. Desktop: sidebar. Tablet (and narrower): icon rail with larger touch targets.
 * @param {{ title: string, sub?: string, active?: string, children: React.ReactNode }} props
 */
export default function TeachShell({ title, sub, active = "/teach", children }) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
      <Box
        component="nav"
        aria-label="Teacher"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          flex: "none",
          width: { xs: 84, lg: 236 },
          px: { xs: 0.5, lg: 1.5 },
          pt: "calc(env(safe-area-inset-top, 0px) + 20px)",
          pb: 2,
          bgcolor: "background.paper",
          borderRight: `1px solid ${colors.line}`,
          position: "sticky",
          top: 0,
          height: "100dvh",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", lg: "flex-start" },
            gap: 1,
            px: { lg: 1 },
            pb: 1.75,
          }}
        >
          <Buddy id="juma" size={34} still />
          <Typography
            sx={{
              display: { xs: "none", lg: "block" },
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 21,
              color: "primary.main",
            }}
          >
            Trailbuddies
          </Typography>
        </Box>
        {TEACH_NAV.map((n) => (
          <Box
            key={n.href}
            component={Link}
            href={n.href}
            aria-current={active === n.href ? "page" : undefined}
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              alignItems: "center",
              gap: { xs: 0.4, lg: 1.25 },
              px: { xs: 0.5, lg: 1.5 },
              py: 1.25,
              borderRadius: 3,
              fontWeight: 800,
              fontSize: { xs: 11, lg: 15 },
              textAlign: "center",
              textDecoration: "none",
              color: active === n.href ? "primary.main" : "text.primary",
              bgcolor: active === n.href ? colors.leaf.soft : "transparent",
              minHeight: 48,
            }}
          >
            <Icon name={n.icon} size={24} />
            {t(n.key)}
          </Box>
        ))}
      </Box>
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          px: { xs: 2.5, sm: 3.75 },
          py: 3.25,
          display: "flex",
          flexDirection: "column",
          gap: 2.25,
        }}
      >
        <Box>
          <Typography component="h1" variant="h4" sx={{ fontSize: { xs: 26, sm: 32 } }}>
            {title}
          </Typography>
          {sub && <Typography sx={{ color: "text.secondary", mt: 0.5 }}>{sub}</Typography>}
        </Box>
        {children}
      </Box>
    </Box>
  );
}
