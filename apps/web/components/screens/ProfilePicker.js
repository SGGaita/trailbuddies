"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { ageFrom, bandForAge, isAdult } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";
import SpeakButton from "@/components/SpeakButton";
import LearnerAvatar from "@/components/LearnerAvatar";
import Loading from "@/components/Loading";

const BAND_NAMES = {
  seedling: "Seedling",
  sprout: "Sprout",
  explorer: "Explorer",
  voyager: "Voyager",
  trailblazer: "Trailblazer",
};

/** C01 Who's playing? Each learner taps their own picture. */
export default function ProfilePicker() {
  const ready = useHydrated();
  const learners = useFamily((s) => s.learners);
  const setActive = useFamily((s) => s.setActive);
  const router = useRouter();
  if (!ready) return <Loading />;

  const pick = (l) => {
    setActive(l.id);
    router.push("/play/map");
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 2.75 },
        px: { xs: 2, sm: 5 },
        pt: "calc(env(safe-area-inset-top, 0px) + 20px)",
        pb: 3,
        maxWidth: 1400,
        mx: "auto",
        width: "100%",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography
          sx={{ fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "primary.main" }}
        >
          {t("app.name")}
        </Typography>
        <Button component={Link} href="/family" variant="outlined" sx={{ borderWidth: 2 }}>
          {t("learner.grownUps")}
        </Button>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
        <Box sx={{ display: { xs: "block", sm: "none" } }}>
          <Buddy id="zip" size={70} />
        </Box>
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Buddy id="zip" size={110} />
        </Box>
        <Bubble>{t("learner.whoIsPlaying")}</Bubble>
        <SpeakButton text={t("learner.whoIsPlaying")} size={52} />
      </Box>
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gap: { xs: 1.25, sm: 3 },
          gridTemplateColumns: { xs: "1fr", sm: `repeat(${Math.min(learners.length, 3)}, minmax(0, 1fr))` },
          alignContent: { xs: "start", sm: "stretch" },
        }}
      >
        {learners.map((l) => {
          const age = ageFrom(l.birth);
          const sub = isAdult(age)
            ? t("learner.adult")
            : !l.buddy
              ? t("learner.newProfile")
              : BAND_NAMES[bandForAge(age)];
          return (
            <Box
              key={l.id}
              component="button"
              type="button"
              onClick={() => pick(l)}
              sx={{
                border: `3px solid ${colors.line}`,
                bgcolor: "background.paper",
                borderRadius: { xs: 5.5, sm: 7.5 },
                display: "flex",
                flexDirection: { xs: "row", sm: "column" },
                alignItems: "center",
                justifyContent: { xs: "flex-start", sm: "center" },
                gap: { xs: 1.75, sm: 1.5 },
                p: { xs: 1.5, sm: 3 },
                minHeight: { xs: 88, sm: 260 },
                color: "text.primary",
                cursor: "pointer",
                textAlign: { xs: "left", sm: "center" },
                "&:hover, &:focus-visible": { borderColor: colors.leaf.main },
              }}
            >
              <Box sx={{ display: { xs: "block", sm: "none" } }}>
                <LearnerAvatar learner={l} size={60} />
              </Box>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <LearnerAvatar learner={l} size={140} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: { xs: 26, sm: 34 },
                    lineHeight: 1.1,
                  }}
                >
                  {l.name}
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 15 }}>{sub}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
      <Typography sx={{ color: "text.secondary", fontSize: 14, textAlign: "center" }}>
        Picture passwords, teen sign-in and class sign-in arrive in Sprint 2.
      </Typography>
    </Box>
  );
}
