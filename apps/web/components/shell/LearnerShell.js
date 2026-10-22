"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { totalStars } from "@trailbuddies/domain";
import Icon from "@/components/Icon";
import LearnerAvatar from "@/components/LearnerAvatar";
import { Coin } from "@/components/Coins";

export const LEARNER_NAV = [
  { href: "/play/map", icon: "map", key: "nav.map", phoneOnly: true },
  { href: "/play/more/games", icon: "game", key: "nav.games" },
  { href: "/play/more/shop", icon: "shop", key: "nav.shop" },
  { href: "/play/more/room", icon: "room", key: "nav.room" },
  { href: "/play/more/badges", icon: "badge", key: "nav.badges" },
  { href: "/play/more/wishes", icon: "wish", key: "nav.wishes" },
];

/**
 * Learner app frame. Tablet and web: top bar + side bar. Phone: compact top bar + bottom tabs.
 * @param {{ learner: any, title?: string, back?: string, active?: string, nav?: boolean, goal?: number, children: React.ReactNode }} props
 */
export default function LearnerShell({ learner, title, back, active, nav = true, goal = 2, children }) {
  const stars = totalStars(learner.progress);
  return (
    <Box
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}
    >
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, sm: 1.75 },
          px: { xs: 1.5, sm: 2.75 },
          pt: "calc(env(safe-area-inset-top, 0px) + 10px)",
          pb: 1.25,
          bgcolor: "background.paper",
          borderBottom: `2px solid ${colors.line}`,
        }}
      >
        {back ? (
          <IconButton
            component={Link}
            href={back}
            aria-label="Back"
            sx={{
              border: `2px solid ${colors.line}`,
              borderRadius: 4,
              width: { xs: 44, sm: 52 },
              height: { xs: 44, sm: 52 },
              color: "text.primary",
            }}
          >
            <Icon name="back" size={24} />
          </IconButton>
        ) : (
          <Box
            component={Link}
            href="/play"
            aria-label="Switch learner"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              color: "text.primary",
              textDecoration: "none",
            }}
          >
            <LearnerAvatar learner={learner} size={44} />
            <Typography
              sx={{
                display: { xs: "none", sm: "block" },
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              {learner.name}
            </Typography>
          </Box>
        )}
        {title ? (
          <Typography
            component="h1"
            sx={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: { xs: 20, sm: 28 },
              flex: { xs: 1, sm: "none" },
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </Typography>
        ) : (
          <Box
            sx={{ display: { xs: "none", md: "flex" }, gap: 0.6, alignItems: "center", ml: 1 }}
            aria-label="This week"
          >
            {learner.week.map((m, i) => (
              <Box
                key={i}
                component="span"
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 1.5,
                  bgcolor:
                    i === 6
                      ? learner.today >= goal
                        ? "success.main"
                        : colors.sun.soft
                      : m >= 15
                        ? "success.main"
                        : colors.sand,
                  border: i === 6 ? `2px dashed ${colors.sun.deep}` : 0,
                }}
              />
            ))}
            <Typography sx={{ ml: 1, fontWeight: 700, color: "text.secondary", fontSize: 15 }}>
              {t("learner.today", { done: Math.min(learner.today, goal), goal })}
            </Typography>
          </Box>
        )}
        <Box sx={{ flex: 1, display: { xs: title ? "none" : "block", sm: "block" } }} />
        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1 }}>
          <Coin kind="star" value={stars} />
          <Coin kind="gem" value={learner.treasures} />
        </Box>
        <Box sx={{ display: { xs: "flex", sm: "none" }, gap: 0.75 }}>
          <Coin kind="star" value={stars} compact />
          <Coin kind="gem" value={learner.treasures} compact />
        </Box>
        <Button
          component={Link}
          href="/family"
          variant="outlined"
          sx={{ display: { xs: "none", sm: "inline-flex" }, borderWidth: 2 }}
        >
          {t("learner.grownUps")}
        </Button>
        <IconButton
          component={Link}
          href="/family"
          aria-label={t("learner.grownUps")}
          sx={{
            display: { xs: "inline-flex", sm: "none" },
            border: `2px solid ${colors.line}`,
            borderRadius: 3,
            color: "text.primary",
          }}
        >
          <Icon name="lock" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Box component="main" sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {children}
        </Box>
        {nav && (
          <Box
            component="nav"
            aria-label="More"
            sx={{
              display: { xs: "none", sm: "flex" },
              flexDirection: "column",
              gap: 1.25,
              width: 128,
              flex: "none",
              p: 1.5,
              bgcolor: "background.paper",
              borderLeft: `2px solid ${colors.line}`,
            }}
          >
            {LEARNER_NAV.filter((n) => !n.phoneOnly).map((n) => (
              <Box
                key={n.href}
                component={Link}
                href={n.href}
                aria-current={active === n.href ? "page" : undefined}
                sx={{
                  border: `2px solid ${active === n.href ? colors.leaf.main : colors.line}`,
                  borderRadius: 4.5,
                  py: 1.25,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.5,
                  fontWeight: 800,
                  fontSize: 14,
                  color: "text.primary",
                  textDecoration: "none",
                  bgcolor: active === n.href ? colors.leaf.soft : "background.paper",
                }}
              >
                <Icon name={n.icon} size={30} />
                {t(n.key)}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {nav && (
        <Box
          component="nav"
          aria-label="Main"
          sx={{
            display: { xs: "flex", sm: "none" },
            position: "sticky",
            bottom: 0,
            bgcolor: "background.paper",
            borderTop: `2px solid ${colors.line}`,
            px: 0.5,
            pt: 0.75,
            pb: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
          }}
        >
          {LEARNER_NAV.map((n) => (
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
                gap: 0.25,
                fontWeight: 800,
                fontSize: 11,
                color: active === n.href ? "primary.main" : "text.secondary",
                textDecoration: "none",
                minHeight: 48,
                justifyContent: "center",
              }}
            >
              <Icon name={n.icon} size={26} />
              {n.key === "nav.room" ? "Room" : t(n.key)}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
