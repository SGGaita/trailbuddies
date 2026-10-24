"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getReadyUnits, getUnit } from "@trailbuddies/content";
import {
  placementQuestions,
  placementDone,
  placementStart,
  startLadder,
  ageFrom,
  bandForAge,
  rng,
} from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { speak } from "@/lib/speech";
import { EXERCISES } from "@/components/lesson/Exercises";
import LessonProgress from "@/components/lesson/LessonProgress";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";
import Icon from "@/components/Icon";
import Loading from "@/components/Loading";

/**
 * The placement check: no hints, no scores, just a start point. Grown-ups run it in
 * onboarding; a child can also choose "Show what you know" on a new subject's trail
 * (ADP-05), and then `back` returns to that trail.
 * @param {{ back?: string }} props
 */
export default function Check({ back = "/start/interests" }) {
  const ready = useHydrated();
  const params = useSearchParams();
  const learner = useFamily((s) => s.learners.find((l) => l.id === params.get("learner")));
  if (!ready) return <Loading />;
  if (!learner) return <Gone back={back} />;
  const subject = params.get("subject") || "numbers";
  return <Quiz learner={learner} subject={subject} back={back.replace("{subject}", subject)} />;
}

function Gone({ back }) {
  const router = useRouter();
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Button onClick={() => router.replace(back.includes("{subject}") ? "/play" : back)}>{t("start.continue")}</Button>
    </Box>
  );
}

function Quiz({ learner, subject, back }) {
  const router = useRouter();
  const voice = useFamily((s) => s.settings.voice);
  const updateLearner = useFamily((s) => s.updateLearner);
  const e2e = (() => {
    try {
      return localStorage.getItem("tb_e2e") === "1";
    } catch {
      return false;
    }
  })();
  const [state] = useState(() => {
    const units = getReadyUnits(subject);
    const band = bandForAge(ageFrom(learner.birth));
    return { units, band, questions: placementQuestions(units, { level: 2, band, r: rng(Date.now()) }) };
  });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(/** @type {Record<string, boolean[]>} */ ({}));
  const [result, setResult] = useState(/** @type {undefined | null | string} */ (undefined));
  const ids = state.units.map((u) => u.id);
  const q = state.questions[index];

  const onTry = ({ correct, finished }) => {
    if (correct && !finished) return;
    const next = { ...answers, [q.unitId]: [...(answers[q.unitId] || []), !!correct] };
    setAnswers(next);
    if (placementDone(ids, next) || index + 1 >= state.questions.length) {
      const start = placementStart(ids, next);
      const placement = { ...(learner.placement || {}) };
      if (start) placement[subject] = start;
      else delete placement[subject];
      updateLearner(learner.id, { placement });
      setResult(start);
      speak(t("start.checkThanks"), { band: state.band, enabled: voice });
    } else {
      setIndex(index + 1);
      speak(state.questions[index + 1].say, { band: state.band, enabled: voice });
    }
  };

  if (result !== undefined)
    return (
      <Box
        component="main"
        sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 3, textAlign: "center" }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, maxWidth: 480 }}>
          <Buddy id={learner.buddy || "zip"} mood="cheer" size={130} />
          <Typography variant="h4" component="h1">
            {t("start.checkThanks")}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontWeight: 700 }}>
            {result
              ? t("start.checkDone", { unit: getUnit(result)?.title || result })
              : t("start.checkBeginning")}
          </Typography>
          <Button variant="contained" size="large" onClick={() => router.push(back)}>
            {t("start.continue")}
          </Button>
        </Box>
      </Box>
    );

  const Exercise = EXERCISES[q.type];
  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1.25, sm: 2 },
          px: { xs: 1.5, sm: 3 },
          pt: "calc(env(safe-area-inset-top, 0px) + 10px)",
          pb: 1.25,
        }}
      >
        <IconButton
          onClick={() => router.push(back)}
          aria-label={t("lesson.leave")}
          sx={{
            border: `2px solid ${colors.line}`,
            borderRadius: 4,
            width: 52,
            height: 52,
            bgcolor: "background.paper",
          }}
        >
          <Icon name="x" size={24} />
        </IconButton>
        <LessonProgress index={index} total={state.questions.length} />
      </Box>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 4 },
          pb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
          <Buddy id={learner.buddy || "zip"} size={90} />
          <Bubble sx={{ mb: 2 }}>
            <span role="status">{q.prompt}</span>
          </Bubble>
          <IconButton
            onClick={() => speak(q.say, { band: state.band, enabled: voice })}
            aria-label={t("lesson.hear")}
            sx={{
              width: 52,
              height: 52,
              mb: 2,
              border: `3px solid ${colors.leaf.deep}`,
              color: colors.leaf.deep,
              bgcolor: "background.paper",
            }}
          >
            <Icon name="speak" size={24} />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
          <Exercise
            key={q.id}
            step={q}
            hint={startLadder()}
            done={false}
            onTry={onTry}
            e2e={e2e}
            band={state.band}
            voice={voice}
            heard={[]}
            onHeard={() => {}}
          />
        </Box>
      </Box>
    </Box>
  );
}
