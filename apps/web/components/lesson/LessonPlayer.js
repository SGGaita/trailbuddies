"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { buddyLine } from "@trailbuddies/content";
import { startLadder, answer, lessonOutcome } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { planLesson, completionEvents } from "@/lib/session";
import { speak, stop } from "@/lib/speech";
import Buddy from "@/components/art/Buddy";
import Bubble from "@/components/Bubble";
import Icon from "@/components/Icon";
import Loading from "@/components/Loading";
import { EXERCISES } from "./Exercises";
import LessonComplete from "./LessonComplete";

const ADVANCE_MS = 1100;
const line = (event, vars) => buddyLine(event, vars, Math.floor(Math.random() * 10));

/** True when e2e tests asked for answer hints in the DOM (never set in normal use). */
function readE2E() {
  try {
    return localStorage.getItem("tb_e2e") === "1";
  } catch {
    return false;
  }
}

/**
 * C06 Lesson player. Runs a lesson, trophy or review: intro, then exercises with the
 * three-step hint ladder, then the lesson-complete screen. All scoring is in
 * @trailbuddies/domain; this component only sequences steps and records events.
 * @param {{ where: { kind: "lesson" | "trophy" | "review", unitId?: string, step?: string, subjectId?: string } }} props
 */
export default function LessonPlayer({ where }) {
  const ready = useHydrated();
  const learner = useLearner();
  const router = useRouter();
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  if (!ready || !learner) return <Loading />;
  return <Player where={where} learner={learner} />;
}

/** Plans once at mount: later store changes (our own events) must not regenerate the lesson. */
function Player({ where, learner }) {
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  const record = useFamily((s) => s.record);
  const router = useRouter();

  const [plan] = useState(() => {
    const p = planLesson(where, learner, Date.now());
    if (p.blocked) return p;
    return {
      ...p,
      back: p.back || `/play/trail/${p.lesson.subjectId}`,
      todayBefore: learner.today,
      band: learner.band,
      startedAt: Date.now(),
      e2e: readE2E(),
    };
  });
  useEffect(() => {
    if (plan.blocked) router.replace(plan.blocked);
  }, [plan, router]);

  const [index, setIndex] = useState(0);
  const [ladders, setLadders] = useState(/** @type {Record<string, any>} */ ({}));
  // Feedback for the current step only; a new step starts from its own prompt.
  const [feedback, setFeedback] = useState(
    /** @type {{ stepId: string, bubble: string, mood: "happy" | "cheer" | "think", done: boolean } | null} */ (
      null
    ),
  );
  const [heard, setHeard] = useState(/** @type {string[]} */ ([]));
  const [leaving, setLeaving] = useState(false);
  const [outcome, setOutcome] = useState(/** @type {any} */ (null));
  const results = useRef(/** @type {Record<string, { firstTry: boolean, misses: number }>} */ ({}));

  const lesson = plan.lesson;
  const step = lesson?.steps[index];
  const fb = feedback && step && feedback.stepId === step.id ? feedback : null;
  const bubble = fb?.bubble ?? step?.prompt ?? "";
  const mood = fb?.mood ?? "happy";
  const stepDone = fb?.done ?? false;
  const hint = (step && ladders[step.id]) || startLadder();
  const questions = lesson ? lesson.steps.filter((s) => s.type !== "intro").length : 0;
  const answered = lesson ? lesson.steps.slice(0, index).filter((s) => s.type !== "intro").length : 0;
  const band = plan.band;

  const say = (text) => speak(text, { band, enabled: voice });

  // Each new step: say its prompt.
  useEffect(() => {
    if (step && !outcome) speak(step.say, { band, enabled: voice });
  }, [step, band, voice, outcome]);

  useEffect(() => stop, []);

  const finish = () => {
    const o = lessonOutcome(lesson, results.current, { lessonsToday: plan.todayBefore, goal });
    const durationSec = Math.max(1, Math.round((Date.now() - plan.startedAt) / 1000));
    record(completionEvents(learner.id, lesson, o, { durationSec }));
    setOutcome(o);
  };

  const advance = () => {
    if (index + 1 >= lesson.steps.length) finish();
    else setIndex(index + 1);
  };

  // After a right answer, move on once the praise has shown. Tied to state (not a
  // fire-and-forget timer) so it re-arms if React pauses and resumes this screen.
  const advanceLater = useEffectEvent(() => advance());
  useEffect(() => {
    if (!stepDone || outcome) return undefined;
    const id = setTimeout(advanceLater, ADVANCE_MS);
    return () => clearTimeout(id);
  }, [stepDone, outcome, index]);

  const onTry = ({ correct, finished, chosenId, wrongIds }) => {
    if (stepDone) return;
    if (correct && !finished) return; // a correct part of a match or sequence
    const cur = ladders[step.id] || startLadder();
    const res = answer(cur, correct, { wrongOptionIds: wrongIds, chosenId });
    setLadders((l) => ({ ...l, [step.id]: res.state }));
    if (res.effect === "correct") {
      results.current[step.id] = { firstTry: res.firstTry, misses: cur.misses };
      const praise = line("lesson.correct");
      setFeedback({ stepId: step.id, bubble: praise, mood: "cheer", done: true });
      say(praise);
    } else if (res.effect === "repeat") {
      setFeedback({ stepId: step.id, bubble: step.prompt, mood: "think", done: false });
      say(`${line("lesson.repeat")} ${step.say}`);
    } else if (res.effect === "eliminate" || res.effect === "reveal") {
      const msg = line(`lesson.${res.effect}`);
      setFeedback({ stepId: step.id, bubble: msg, mood: "think", done: false });
      say(msg);
    }
  };

  // Space repeats the question.
  const repeat = useEffectEvent(() => step && say(step.say));
  useEffect(() => {
    if (outcome || leaving) return undefined;
    const h = (e) => {
      if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        repeat();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [outcome, leaving]);

  const leave = () => {
    stop();
    if (lesson) {
      const o = lessonOutcome(lesson, results.current, { lessonsToday: plan.todayBefore, goal });
      const events = completionEvents(learner.id, lesson, { ...o, complete: false }, { durationSec: 0 });
      if (events.length) record(events);
    }
    router.push(plan.back || "/play/map");
  };

  if (plan.blocked) return <Loading />;
  if (outcome)
    return (
      <LessonComplete lesson={lesson} outcome={outcome} learner={learner} goal={goal} back={plan.back} />
    );

  const Exercise = EXERCISES[step.type];
  const intro = step.type === "intro";

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}
    >
      <Box
        component="header"
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
          onClick={() => setLeaving(true)}
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
        <LinearProgress
          variant="determinate"
          value={questions ? (answered / questions) * 100 : 0}
          aria-label={t("lesson.progress", { n: Math.min(answered + 1, questions), total: questions })}
          sx={{
            flex: 1,
            height: 16,
            borderRadius: 8,
            bgcolor: colors.sand,
            "& .MuiLinearProgress-bar": { bgcolor: colors.leaf.main, borderRadius: 8 },
          }}
        />
        <IconButton
          onClick={() => say(step.say)}
          aria-label={t("lesson.hear")}
          sx={{
            width: 52,
            height: 52,
            border: `3px solid ${colors.leaf.deep}`,
            color: colors.leaf.deep,
            bgcolor: "background.paper",
          }}
        >
          <Icon name="speak" size={24} />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 4 },
          pb: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          maxWidth: 1100,
          width: "100%",
          mx: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: { xs: 1, sm: 2 },
            alignSelf: { xs: "stretch", sm: "center" },
          }}
        >
          <Box sx={{ display: { xs: "block", sm: "none" } }}>
            <Buddy id={learner.buddy} outfit={learner.outfit} mood={mood} size={72} />
          </Box>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Buddy id={learner.buddy} outfit={learner.outfit} mood={mood} size={120} />
          </Box>
          <Bubble key={bubble} sx={{ flex: { xs: 1, sm: "none" }, maxWidth: 560, mb: { xs: 1, sm: 3 } }}>
            <span role="status">{bubble}</span>
          </Bubble>
        </Box>

        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <Exercise
            key={step.id}
            step={step}
            hint={hint}
            done={stepDone}
            onTry={onTry}
            e2e={plan.e2e}
            band={band}
            voice={voice}
            heard={heard}
            onHeard={(id) => setHeard((h) => (h.includes(id) ? h : [...h, id]))}
          />
        </Box>

        {intro && (
          <Button
            variant="contained"
            size="large"
            onClick={advance}
            className={heard.length >= step.items.length ? "glow" : undefined}
            sx={{ minWidth: 220, minHeight: 64, fontSize: 24 }}
          >
            {t("lesson.letsPlay")}
          </Button>
        )}
      </Box>

      <Dialog
        open={leaving}
        onClose={() => setLeaving(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 5.5,
              p: 3,
              maxWidth: 420,
              textAlign: "center",
              alignItems: "center",
              gap: 1.5,
            },
          },
        }}
      >
        <Buddy id={learner.buddy} outfit={learner.outfit} mood="think" size={96} />
        <Typography variant="h5" component="h2">
          {t("lesson.leaveTitle")}
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>{t("lesson.leaveSub")}</Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
          <Button variant="outlined" sx={{ borderWidth: 2 }} onClick={leave}>
            {t("lesson.stop")}
          </Button>
          <Button variant="contained" onClick={() => setLeaving(false)} autoFocus>
            {t("lesson.keepPlaying")}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
