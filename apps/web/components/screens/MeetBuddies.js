"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { buddyLine } from "@trailbuddies/content";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { speak } from "@/lib/speech";
import { BUDDIES } from "@/lib/art";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";
import Loading from "@/components/Loading";

/** Buddies children can pick now; others show as "coming soon" (BUD-01). All four are live. */
export const LIVE_BUDDIES = ["zip", "tumi", "juma", "kiki"];

/**
 * C02 Meet the buddies (BUD-01): tap a buddy and it waves and says hello in its own
 * voice; "Pick me!" and a confirm make it the learner's buddy.
 */
export default function MeetBuddies() {
  const ready = useHydrated();
  const learner = useLearner();
  const voice = useFamily((s) => s.settings.voice);
  const updateLearner = useFamily((s) => s.updateLearner);
  const router = useRouter();
  const [waving, setWaving] = useState(/** @type {string | null} */ (null));
  const [confirm, setConfirm] = useState(/** @type {string | null} */ (null));
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  if (!ready || !learner) return <Loading />;

  const hello = (id) => {
    setWaving(id);
    speak(buddyLine("buddy.intro", {}, 0, id), { band: learner.band, buddy: id, enabled: voice });
  };
  const choose = (id) => {
    updateLearner(learner.id, { buddy: id });
    setConfirm(null);
    speak(buddyLine("buddies.chosen", { name: learner.name }, 0, id), {
      band: learner.band,
      buddy: id,
      enabled: voice,
    });
    router.push("/play/map");
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 2, sm: 3 },
        px: { xs: 2, sm: 4 },
        py: { xs: 2.5, sm: 4 },
        bgcolor: "background.default",
      }}
    >
      <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 28, sm: 36 } }}>
        {t("buddies.title")}
      </Typography>
      <Bubble>{buddyLine("buddies.pick")}</Bubble>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, minmax(0, 220px))" },
          gap: { xs: 1.5, sm: 2.5 },
          width: "100%",
          justifyContent: "center",
        }}
      >
        {Object.entries(BUDDIES).map(([id, b]) => {
          const live = LIVE_BUDDIES.includes(id);
          return (
            <Box
              key={id}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                p: { xs: 1.5, sm: 2 },
                bgcolor: waving === id ? colors.leaf.soft : "background.paper",
                border: `3px solid ${waving === id ? colors.leaf.main : colors.line}`,
                borderRadius: 7,
                opacity: live ? 1 : 0.5,
              }}
            >
              <Box
                component="button"
                type="button"
                onClick={() => live && hello(id)}
                disabled={!live}
                aria-label={`Say hello to ${b.name} the ${b.kind}`}
                sx={{ border: 0, bgcolor: "transparent", p: 0, cursor: live ? "pointer" : "default" }}
              >
                <Buddy
                  key={waving === id ? `${id}-w` : id}
                  id={id}
                  size={110}
                  mood={waving === id ? "wave" : "happy"}
                />
              </Box>
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>
                {b.name}
              </Typography>
              {live ? (
                <Button variant="contained" onClick={() => setConfirm(id)} aria-label={`Pick ${b.name}`}>
                  {t("buddies.pickMe")}
                </Button>
              ) : (
                <Typography sx={{ fontWeight: 800, color: "text.secondary" }}>
                  {t("map.comingSoon")}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        slotProps={{
          paper: { sx: { borderRadius: 5.5, p: 3, textAlign: "center", alignItems: "center", gap: 1.5 } },
        }}
      >
        {confirm && (
          <>
            <Buddy id={confirm} size={110} mood="cheer" />
            <Typography variant="h5" component="h2">
              {buddyLine("buddies.confirm", { buddy: BUDDIES[confirm].name })}
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={() => setConfirm(null)}>
                {t("buddies.notYet")}
              </Button>
              <Button variant="contained" onClick={() => choose(confirm)} autoFocus>
                {t("buddies.confirm", { buddy: BUDDIES[confirm].name })}
              </Button>
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  );
}
