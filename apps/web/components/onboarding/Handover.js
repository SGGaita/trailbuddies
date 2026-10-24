"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { lessonHref } from "@/lib/trail";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getReadyUnits, buddyLine } from "@trailbuddies/content";
import { ageFrom, isAdult } from "@trailbuddies/domain";
import { useFamily } from "@/lib/store";
import { useSetupGuard } from "@/lib/guard";
import { speak } from "@/lib/speech";
import { BUDDIES } from "@/lib/art";
import Loading from "@/components/Loading";
import Buddy from "@/components/art/Buddy";
import LearnerAvatar from "@/components/LearnerAvatar";
import OnboardingShell from "./OnboardingShell";

/** Step 7: hand the device to a child, who picks a buddy and goes straight into a lesson. */
export default function Handover() {
  const ok = useSetupGuard({ allow: "/start/handover" });
  const router = useRouter();
  const learners = useFamily((s) => s.learners);
  const voice = useFamily((s) => s.settings.voice);
  const updateLearner = useFamily((s) => s.updateLearner);
  const setActive = useFamily((s) => s.setActive);
  const children = learners.filter((l) => !isAdult(ageFrom(l.birth)));
  const [who, setWho] = useState(null);
  if (!ok) return <Loading />;
  const learner = learners.find((l) => l.id === who) || children[0] || learners[0];

  const pick = (b) => {
    updateLearner(learner.id, { buddy: b });
    speak(buddyLine("buddy.intro", {}, 0, b), { band: learner.band, buddy: b, enabled: voice });
  };
  const start = () => {
    setActive(learner.id);
    const subject = "numbers";
    const unit = learner.placement?.[subject] || getReadyUnits(subject)[0].id;
    router.push(lessonHref(unit, 1));
  };

  return (
    <OnboardingShell
      step={7}
      title={t("start.handoverTitle", { name: learner.name })}
      sub={t("start.handoverSub", { name: learner.name })}
      buddy={learner.buddy || "zip"}
      mood="cheer"
      wide
    >
      {learners.length > 1 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {learners.map((l) => (
            <Button
              key={l.id}
              variant={l.id === learner.id ? "contained" : "outlined"}
              onClick={() => setWho(l.id)}
              startIcon={<LearnerAvatar learner={l} size={28} />}
              sx={{ borderWidth: 2 }}
            >
              {l.name}
            </Button>
          ))}
        </Box>
      )}
      <Typography variant="h5" component="h2" sx={{ textAlign: "center" }}>
        {t("start.pickBuddy")}
      </Typography>
      <Box
        role="radiogroup"
        aria-label={t("start.pickBuddy")}
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 1.5 }}
      >
        {Object.entries(BUDDIES).map(([id, b]) => {
          const on = learner.buddy === id;
          return (
            <Box
              key={id}
              component="button"
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${b.name} the ${b.kind}`}
              onClick={() => pick(id)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.5,
                p: 1.5,
                cursor: "pointer",
                bgcolor: on ? colors.leaf.soft : "background.paper",
                border: `3px solid ${on ? colors.leaf.main : colors.line}`,
                borderRadius: 7,
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 18,
                color: "text.primary",
              }}
            >
              <Buddy id={id} size={88} mood={on ? "cheer" : "happy"} />
              {b.name}
            </Box>
          );
        })}
      </Box>
      <Button variant="contained" size="large" disabled={!learner.buddy} onClick={start}>
        {t("start.firstLesson", { name: learner.name })}
      </Button>
      {children.length > 1 && (
        <Button
          variant="outlined"
          size="large"
          sx={{ borderWidth: 2 }}
          onClick={() => {
            useFamily.getState().setActive(null);
            router.push("/play");
          }}
        >
          {t("start.handOver")}
        </Button>
      )}
      <Button onClick={() => router.push("/family")}>{t("start.toGrownUps")}</Button>
    </OnboardingShell>
  );
}
