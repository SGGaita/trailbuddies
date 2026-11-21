"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { avatarColors, colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { ageFrom, bandForAge, isAdult } from "@trailbuddies/domain";
import { useFamily } from "@/lib/store";
import { useSetupGuard } from "@/lib/guard";
import Buddy from "@/components/art/Buddy";
import Icon from "@/components/Icon";
import SpeakButton from "@/components/SpeakButton";
import LearnerAvatar from "@/components/LearnerAvatar";
import Loading from "@/components/Loading";
import { PictureLockDialog } from "@/components/PictureLock";
import { api } from "@/lib/account";
import { registerClip, speak, stop } from "@/lib/speech";

// C01: "Who's playing today?" in a real voice (Steve's recording), with the device voice as the fallback.
const WHO_CLIP = "voice.who-is-playing";
registerClip(WHO_CLIP, "/voice/who-is-playing.mp3");

const BAND_NAMES = {
  seedling: "Seedling",
  sprout: "Sprout",
  explorer: "Explorer",
  voyager: "Voyager",
  trailblazer: "Trailblazer",
};

/** C01 Who's playing? Each learner taps their own picture. */
export default function ProfilePicker() {
  const ready = useSetupGuard();
  const learners = useFamily((s) => s.learners);
  const lockGate = useFamily((s) => s.lockGate);
  // Back with the children: the grown-up zone needs the gate again.
  useEffect(() => lockGate(), [lockGate]);
  const setActive = useFamily((s) => s.setActive);
  const voice = useFamily((s) => s.settings.voice);
  // Class play (S9): the grown-ups' button goes back to the class.
  const classId = useFamily((s) => (s.mode === "class" ? s.family?.classId : null));
  // Classroom mode (S10, CRM-01/02): the class list, compact, with 'Ask my teacher'.
  const classroom = useFamily((s) => (s.mode === "class" && s.family?.classroom ? s.family : null));
  const router = useRouter();
  // The question is asked out loud when the screen opens (if Voice is on). A browser that
  // blocks sound before the first tap just stays quiet; the speak button plays it again.
  const askAloud = !classroom && ready && learners.length > 0 && voice;
  useEffect(() => {
    if (!askAloud) return undefined;
    speak(t("learner.whoIsPlaying"), { clip: WHO_CLIP });
    return () => stop();
  }, [askAloud]);
  // FAM-02: a learner with a picture password taps their pictures first.
  const [locked, setLocked] = useState(/** @type {any} */ (null));
  if (!ready) return <Loading />;

  const open = (l) => {
    setActive(l.id);
    router.push("/play/map");
  };
  const pick = (l) => (l.picture_lock ? setLocked(l) : open(l));

  const title = classroom ? t("classroom.whoAreYou", { name: classroom.name }) : t("learner.whoIsPlaying");
  const hint = t("learner.tapPicture");
  const columns = Math.max(1, Math.min(learners.length, classroom ? 4 : 3));
  const grownUps = classId ? `/teach/class?id=${encodeURIComponent(classId)}` : "/family";

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: colors.cream, color: colors.ink }}>
      <Box component="header" sx={{ bgcolor: "#fffaf0", borderBottom: `1px solid ${colors.line}` }}>
        <Box
          sx={{
            maxWidth: 1240,
            mx: "auto",
            px: { xs: 2, sm: 4 },
            py: 1.5,
            pt: "calc(env(safe-area-inset-top, 0px) + 12px)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Typography
            sx={{
              color: colors.leaf.deep,
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: { xs: 23, sm: 28 },
              lineHeight: 1,
            }}
          >
            {t("app.name")}
          </Typography>
          <Button
            component={Link}
            href={grownUps}
            variant="outlined"
            startIcon={<Icon name="lock" size={17} />}
            sx={{ borderWidth: 2, bgcolor: "#fffaf0", borderRadius: 99, flexShrink: 0 }}
          >
            {t("learner.grownUps")}
          </Button>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          minHeight: "calc(100dvh - 70px)",
          px: { xs: 2, sm: 4 },
          pt: { xs: 3, sm: classroom ? 3 : 6, lg: classroom ? 4 : 8 },
          pb: { xs: 4, sm: 8 },
          background:
            "linear-gradient(180deg, #fff8e8f7 0%, #fff8e8c9 37%, #fff8e829 100%), url('/buddy-picker/trail.webp') center bottom / cover no-repeat",
        }}
      >
        <Box
          sx={{
            mx: "auto",
            mb: { xs: 2.5, sm: classroom ? 3 : 4 },
            maxWidth: 850,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: { xs: 0.75, sm: 2 },
            textAlign: "center",
            "& > svg": { width: { xs: 66, sm: 104 }, height: { xs: 72, sm: 112 } },
          }}
        >
          <Buddy size={104} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h1"
              sx={{
                color: colors.leaf.deep,
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: {
                  xs: "clamp(1.875rem, 7vw, 2.5rem)",
                  sm: classroom ? "2.5rem" : "3.5rem",
                  lg: classroom ? "3rem" : "4.25rem",
                },
                lineHeight: 1,
                letterSpacing: "-.025em",
                overflowWrap: "anywhere",
              }}
            >
              {title}
            </Typography>
            <Box sx={{ mt: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 1.25 }}>
              <Typography sx={{ color: colors.ink, fontSize: { xs: 16, sm: 19 }, fontWeight: 700 }}>
                {hint}
              </Typography>
              {classroom ? (
                <SpeakButton text={`${title} ${hint}`} size={48} />
              ) : (
                <SpeakButton text={title} clip={WHO_CLIP} size={48} />
              )}
            </Box>
          </Box>
        </Box>

        <Box
          component="ul"
          sx={{
            m: 0,
            mx: "auto",
            p: 0,
            listStyle: "none",
            display: "grid",
            gap: { xs: 1.5, sm: 2.25 },
            width: "100%",
            maxWidth: classroom ? 1160 : Math.min(columns * 364, 1092),
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: `repeat(${Math.min(columns, 2)}, minmax(0, 1fr))`,
              md: `repeat(${Math.min(columns, 3)}, minmax(0, 1fr))`,
              lg: `repeat(${columns}, minmax(0, 1fr))`,
            },
          }}
        >
          {learners.map((learner) => {
            const age = ageFrom(learner.birth);
            const sub = isAdult(age)
              ? t("learner.adult")
              : !learner.buddy
                ? t("learner.newProfile")
                : BAND_NAMES[bandForAge(age)];
            return (
              <Box component="li" key={learner.id} sx={{ minWidth: 0 }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => pick(learner)}
                  data-locked={learner.picture_lock ? "yes" : undefined}
                  sx={{
                    "--profile-color": avatarColors[learner.color] || avatarColors.leaf,
                    width: "100%",
                    height: "100%",
                    p: { xs: 1, sm: 1.25 },
                    display: "flex",
                    flexDirection: { xs: "row", sm: classroom ? "row" : "column" },
                    alignItems: { xs: "center", sm: classroom ? "center" : "stretch" },
                    color: colors.ink,
                    bgcolor: "#fffdf6",
                    textAlign: "left",
                    cursor: "pointer",
                    border: "2px solid color-mix(in srgb, var(--profile-color) 30%, #eadfc4)",
                    borderRadius: 5.5,
                    boxShadow: "0 5px 0 #71613a26, 0 10px 24px #5e58221a",
                    transition: "transform 160ms ease, border-color 160ms ease",
                    "&:hover": { borderColor: "var(--profile-color)", transform: "translateY(-2px)" },
                    "&:focus-visible": { outline: `3px solid ${colors.leaf.deep}`, outlineOffset: 3 },
                    "@media (prefers-reduced-motion: reduce)": {
                      transition: "none",
                      "&:hover": { transform: "none" },
                    },
                  }}
                >
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                      isolation: "isolate",
                      flexShrink: 0,
                      overflow: "hidden",
                      borderRadius: 4,
                      width: { xs: 66, sm: classroom ? 70 : "100%" },
                      minHeight: { xs: 66, sm: classroom ? 70 : 152 },
                      background:
                        "radial-gradient(ellipse at 50% 65%, #ffffffa8, transparent 70%), color-mix(in srgb, var(--profile-color) 23%, #fff4d9)",
                      "& .profile-avatar": { display: { xs: "grid", sm: classroom ? "grid" : "none" } },
                      "& .profile-scene": { display: { xs: "none", sm: classroom ? "none" : "flex" } },
                    }}
                  >
                    <Box component="span" className="profile-avatar">
                      <LearnerAvatar learner={learner} size={48} />
                    </Box>
                    <Box
                      component="span"
                      className="profile-scene"
                      sx={{ alignItems: "center", justifyContent: "center", gap: learner.buddy ? 1 : 0 }}
                    >
                      <LearnerAvatar learner={learner} size={76} />
                      {learner.buddy && <Buddy id={learner.buddy} outfit={learner.outfit} size={111} still />}
                    </Box>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      flex: 1,
                      minWidth: 0,
                      px: { xs: 1.25, sm: 1.5 },
                      py: { xs: 0.75, sm: 1.5 },
                    }}
                  >
                    <Box component="span" sx={{ minWidth: 0 }}>
                      <Typography
                        component="span"
                        sx={{
                          display: "block",
                          fontFamily: "var(--font-display)",
                          fontSize: { xs: 23, sm: classroom ? 22 : 28 },
                          fontWeight: 900,
                          lineHeight: 1.06,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {learner.name}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{ display: "block", color: colors.muted, fontSize: 14, mt: 0.5 }}
                      >
                        {sub}
                      </Typography>
                    </Box>
                    <Box
                      component="span"
                      aria-hidden="true"
                      sx={{
                        display: "grid",
                        placeItems: "center",
                        width: { xs: 33, sm: 38 },
                        height: { xs: 33, sm: 38 },
                        borderRadius: "50%",
                        bgcolor: colors.leaf.soft,
                        color: colors.leaf.deep,
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        name={learner.picture_lock ? "lock" : "back"}
                        size={19}
                        style={learner.picture_lock ? undefined : { transform: "scaleX(-1)" }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
        {classroom && (
          <Typography sx={{ color: colors.ink, fontWeight: 700, textAlign: "center", mt: 2.25 }}>
            {t("classroom.foot")}
          </Typography>
        )}
      </Box>
      {locked && (
        <PictureLockDialog
          learner={locked}
          voice={voice}
          onOpen={() => open(locked)}
          onClose={() => setLocked(null)}
          onAskTeacher={classroom ? () => api.askTeacher(classroom.classId, locked.id) : null}
        />
      )}
    </Box>
  );
}
