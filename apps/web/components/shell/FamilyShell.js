"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import Icon from "@/components/Icon";
import Buddy from "@/components/art/Buddy";

export const FAMILY_NAV = [
  { href: "/family", icon: "home", key: "nav.home" },
  { href: "/family/progress", icon: "chart", key: "nav.progress" },
  { href: "/family/create", icon: "plus", key: "nav.create" },
  { href: "/family/rewards", icon: "wish", key: "nav.rewards" },
  { href: "/family/settings", icon: "gear", key: "nav.settings" },
];

const navItem = (active, layout) => ({
  display: "flex",
  flexDirection: layout === "rail" ? "column" : "row",
  alignItems: "center",
  gap: layout === "rail" ? 0.4 : 1.25,
  px: layout === "rail" ? 0.5 : 1.5,
  py: 1.25,
  borderRadius: 3,
  fontWeight: 800,
  fontSize: layout === "rail" ? 11.5 : 15,
  textAlign: "center",
  textDecoration: "none",
  color: active ? "primary.main" : "text.primary",
  bgcolor: active ? colors.leaf.soft : "transparent",
});

/**
 * Grown-up zone frame. Phone: bottom tabs. Tablet: icon rail. Desktop: full sidebar.
 * @param {{ title: string, sub?: string, back?: string, right?: React.ReactNode, active?: string, family?: { parent: string, plan: string }, wide?: boolean, children: React.ReactNode }} props
 */
export default function FamilyShell({
  title,
  sub,
  back,
  right,
  active = "/family",
  family,
  wide = false,
  children,
}) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", bgcolor: "background.default" }}>
      <Box
        component="nav"
        aria-label="Grown-up zone"
        sx={{
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          gap: 0.5,
          flex: "none",
          width: { sm: 98, lg: 236 },
          px: { sm: 0.75, lg: 1.5 },
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
            justifyContent: { sm: "center", lg: "flex-start" },
            gap: 1,
            px: { lg: 1 },
            pb: 1.75,
          }}
        >
          <Buddy id="zip" size={30} still />
          <Typography
            sx={{
              display: { sm: "none", lg: "block" },
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 21,
              color: "primary.main",
            }}
          >
            Trailbuddies
          </Typography>
        </Box>
        {FAMILY_NAV.map((n) => (
          <Box
            key={n.href}
            component={Link}
            href={n.href}
            aria-current={active === n.href ? "page" : undefined}
            sx={{
              ...navItem(active === n.href, "rail"),
              flexDirection: { sm: "column", lg: "row" },
              fontSize: { sm: 11.5, lg: 15 },
              px: { sm: 0.5, lg: 1.5 },
            }}
          >
            <Icon name={n.icon} />
            {t(n.key)}
          </Box>
        ))}
        <Box sx={{ flex: 1 }} />
        {family && (
          <Box
            sx={{
              display: { sm: "none", lg: "block" },
              border: `1px solid ${colors.line}`,
              borderRadius: 3,
              p: 1.25,
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{family.parent}</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{family.plan} plan</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Box
          component="header"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: { xs: 2.25, sm: 4.25 },
            pt: "calc(env(safe-area-inset-top, 0px) + 16px)",
            pb: 1.75,
            bgcolor: "background.paper",
            borderBottom: `1px solid ${colors.line}`,
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          {back && (
            <IconButton
              component={Link}
              href={back}
              aria-label="Back"
              sx={{ border: `1.5px solid ${colors.line}`, color: "text.primary" }}
            >
              <Icon name="back" size={18} />
            </IconButton>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="h1"
              sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: { xs: 22, sm: 26 } }}
            >
              {title}
            </Typography>
            {sub && <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{sub}</Typography>}
          </Box>
          {right}
        </Box>
        <Box component="main" sx={{ flex: 1, px: { xs: 2.25, sm: 4.25 }, py: 3 }}>
          <Box
            sx={{
              // Wide pages (home, progress) fill the main area like the prototype;
              // form pages stay a readable centred column.
              maxWidth: wide ? "none" : 720,
              mx: wide ? 0 : "auto",
              display: "flex",
              flexDirection: "column",
              gap: 1.75,
            }}
          >
            {children}
          </Box>
        </Box>
        <Box
          component="nav"
          aria-label="Grown-up zone"
          sx={{
            display: { xs: "flex", sm: "none" },
            position: "sticky",
            bottom: 0,
            bgcolor: "background.paper",
            borderTop: `1px solid ${colors.line}`,
            pt: 0.75,
            pb: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          {FAMILY_NAV.map((n) => (
            <Box
              key={n.href}
              component={Link}
              href={n.href}
              aria-current={active === n.href ? "page" : undefined}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.4,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
                color: active === n.href ? "primary.main" : "text.secondary",
                minHeight: 48,
                justifyContent: "center",
              }}
            >
              <Icon name={n.icon} size={24} />
              {t(n.key)}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
