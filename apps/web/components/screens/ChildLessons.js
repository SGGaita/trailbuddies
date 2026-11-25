"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { getSubjects } from "@trailbuddies/content";
import { isStandard, normalPlan, togglePlan } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { ChoiceChip, Pill } from "@/components/builder/parts";
import LearnerAvatar from "@/components/LearnerAvatar";
import Loading from "@/components/Loading";
import FamilyShell from "@/components/shell/FamilyShell";
import { useFamily, useHydrated, useLearners } from "@/lib/store";
import { trailUnits } from "@/lib/trail";

/**
 * P31 Lessons for a child (PAR-09): hide a trail or a unit for one child, or skip a lesson
 * they already know. Changes apply to this child only; other children keep the standard trail
 * and the content team's updates still arrive. Everything can be undone.
 */
export default function ChildLessons() {
  const ready = useHydrated();
  const learners = useLearners();
  const family = useFamily((s) => s.family);
  const params = useSearchParams();
  const router = useRouter();
  const [note, setNote] = useState("");
  if (!ready) return <Loading />;
  const kids = learners.filter((k) => !k.adult);
  const l = kids.find((x) => x.id === params.get("learner")) || kids[0];
  if (!l) return <Loading />;
  const plan = normalPlan(l.lessonPlan);
  const save = (next, line) => {
    useFamily.getState().updateLearner(l.id, { lessonPlan: next });
    if (line) setNote(line);
  };
  const hidden = new Set(plan.hidden);
  const skipped = new Set(plan.skipped);

  return (
    <FamilyShell title={t("plan.title", { name: l.name })} family={family} active="/family/progress" back={`/family/progress?learner=${l.id}`} wide>
      <Box role="group" aria-label="Learners" sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {kids.map((k) => (
          <Chip
            key={k.id}
            component={Link}
            href={`/family/progress/lessons?learner=${k.id}`}
            clickable
            avatar={<LearnerAvatar learner={k} size={28} />}
            label={k.name}
            color={k.id === l.id ? "primary" : "default"}
            variant={k.id === l.id ? "filled" : "outlined"}
            aria-current={k.id === l.id ? "page" : undefined}
            sx={{ fontWeight: 800, height: 40 }}
          />
        ))}
      </Box>
      <Typography sx={{ color: "text.secondary" }}>{t("plan.intro", { name: l.name })}</Typography>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, alignItems: "start" }}>
        {getSubjects().map((s) => {
          const off = hidden.has(s.id);
          const units = trailUnits(s.id).filter((u) => u.status !== "planned");
          return (
            <Card key={s.id} data-plan-trail={s.id} sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1, opacity: off ? 0.65 : 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 17, flex: 1 }}>{s.place || s.name}</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 14 }}>{t(off ? "plan.hidden" : "plan.shown")}</Typography>
                <Switch
                  checked={!off}
                  onChange={() =>
                    save(togglePlan(plan, "hidden", s.id), t(off ? "plan.trailBack" : "plan.trailHidden", { trail: s.place || s.name, name: l.name }))
                  }
                  slotProps={{ input: { "aria-label": t("plan.showTrail", { trail: s.place || s.name, name: l.name }) } }}
                />
              </Box>
              {!off &&
                units.map((u, ui) => {
                  const uOff = hidden.has(u.id);
                  return (
                    <Box key={u.id} data-plan-unit={u.id} sx={{ borderTop: `1px solid ${colors.line}`, pt: 1, display: "flex", flexDirection: "column", gap: 0.75, opacity: uOff ? 0.6 : 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ fontWeight: 700, flex: 1 }}>
                          {ui + 1}. {u.title}
                        </Typography>
                        {uOff && <Pill>{t("plan.hidden")}</Pill>}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => save(togglePlan(plan, "hidden", u.id), t(uOff ? "plan.unitBack" : "plan.unitHidden", { unit: u.title }))}
                          aria-label={t(uOff ? "plan.showUnit" : "plan.hideUnit", { unit: u.title })}
                        >
                          {t(uOff ? "plan.show" : "plan.hide")}
                        </Button>
                      </Box>
                      {!uOff && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
                          <Typography sx={{ color: "text.secondary", fontSize: 13, mr: 0.5 }}>{t("plan.skip")}</Typography>
                          {u.lessonIds.map((id, li) => {
                            const done = (l.progress[id] || 0) > 0;
                            const on = skipped.has(id) && !done;
                            return (
                              <ChoiceChip
                                key={id}
                                on={on}
                                disabled={done}
                                aria-pressed={on}
                                aria-label={t(done ? "plan.lessonDone" : on ? "plan.unskip" : "plan.skipLesson", { n: li + 1, unit: u.title })}
                                onClick={() => save(togglePlan(plan, "skipped", id), t(on ? "plan.lessonBack" : "plan.lessonSkipped"))}
                              >
                                {t("plan.lessonN", { n: li + 1 })}
                                {done ? " ✓" : on ? " ⤼" : ""}
                              </ChoiceChip>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  );
                })}
            </Card>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        {!isStandard(plan) && (
          <Button variant="outlined" onClick={() => save({ hidden: [], skipped: [], order: {} }, t("plan.resetDone", { name: l.name }))}>
            {t("plan.reset")}
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={() => {
            useFamily.getState().setActive(l.id);
            router.push("/play/map");
          }}
        >
          {t("progress.openAs", { name: l.name })}
        </Button>
      </Box>
      {/* On touch screens the tap that showed it would count as a tap away: only the timer closes it. */}
      <Snackbar open={!!note} autoHideDuration={4000} onClose={(_, reason) => reason !== "clickaway" && setNote("")} message={note} />
    </FamilyShell>
  );
}
