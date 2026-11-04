"use client";
import { useEffect, useEffectEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { buddyLine } from "@trailbuddies/content";
import { customId, lessonsFor } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearner } from "@/lib/store";
import { speak } from "@/lib/speech";
import LearnerShell from "@/components/shell/LearnerShell";
import Loading from "@/components/Loading";
import { CardPic } from "@/components/builder/parts";
import SubjectArt from "@/components/art/SubjectArt";
import { useTeacherWork, assignmentHref } from "@/lib/classWork";
import { getUnit } from "@trailbuddies/content";

const KIND = { learn: "builder.tpl.learn", sort: "builder.tpl.sort", puzzle: "builder.tpl.puzzle" };

/** C22 Family & Class Island (MAP-06): lessons grown-ups made, new ones glowing. */
export default function FamilyIsland() {
  const ready = useHydrated();
  const learner = useLearner();
  const lessons = useFamily((s) => s.lessons);
  // MAP-06b: work from the teacher, due work first. A class device shows only this.
  const work = useTeacherWork(learner);
  const classDevice = useFamily((s) => s.mode === "class");
  const voice = useFamily((s) => s.settings.voice);
  const goal = useFamily((s) => s.settings.goal);
  const router = useRouter();
  useEffect(() => {
    if (ready && !learner) router.replace("/play");
  }, [ready, learner, router]);
  const hello = useEffectEvent(() =>
    speak(buddyLine("island.hello", {}, 0, learner.buddy), {
      band: learner.band,
      buddy: learner.buddy,
      enabled: voice,
    }),
  );
  const learnerId = learner?.id;
  useEffect(() => {
    if (ready && learnerId) hello();
  }, [ready, learnerId]);
  if (!ready || !learner) return <Loading />;
  const mine = lessonsFor(lessons, learner.id);

  return (
    <LearnerShell learner={learner} title={t("map.familyIsland")} back="/play/map" goal={goal}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: classDevice ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
          },
          gap: { xs: 1.75, sm: 2.75 },
          px: { xs: 1.5, sm: 3.5 },
          py: { xs: 1.5, sm: 2.5 },
          alignItems: "start",
        }}
      >
        {!classDevice && (
          <Section title={t("island.family")}>
            {mine.length === 0 && (
              <Typography sx={{ color: "text.secondary" }}>{t("island.none")}</Typography>
            )}
            {mine.map((l) => {
              const stars = learner.progress[customId(l.id)] || 0;
              return (
                <Box
                  key={l.id}
                  component={Link}
                  href={`/play/custom?id=${l.id}`}
                  className={stars ? undefined : "glow"}
                  data-new={stars ? "no" : "yes"}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1.5, sm: 2 },
                    p: { xs: 1.25, sm: 1.75 },
                    borderRadius: 5.5,
                    border: `3px solid ${stars ? colors.line : colors.coral.main}`,
                    bgcolor: "background.paper",
                    textDecoration: "none",
                    color: "text.primary",
                  }}
                >
                  <CardPic card={l.cards[0]} size={84} radius={4.5} />
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: { xs: 20, sm: 24 },
                      }}
                    >
                      {l.title}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                      {l.by ? `${t("builder.by", { name: l.by })} · ` : ""}
                      {t("builder.cardsN", { n: l.cards.length })} · {t(KIND[l.template])}
                    </Typography>
                    {stars ? (
                      <Box
                        aria-label={t("done.stars", { stars })}
                        sx={{ color: colors.sun.main, fontSize: 20 }}
                      >
                        {"★".repeat(stars)}
                      </Box>
                    ) : (
                      <Box
                        component="span"
                        sx={{
                          alignSelf: "flex-start",
                          px: 1.25,
                          borderRadius: 999,
                          bgcolor: colors.coral.soft,
                          color: colors.coral.deep,
                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        {t("island.new")}
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Section>
        )}
        <Section title={t("island.teacher")}>
          {work.length === 0 && (
            <Typography sx={{ color: "text.secondary" }}>{t("island.noWork")}</Typography>
          )}
          {work.map((a) => (
            <TeacherWork key={a.id} a={a} learner={learner} showBy={!classDevice} />
          ))}
        </Section>
      </Box>
    </LearnerShell>
  );
}

const dateLabel = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** One piece of work from the teacher (C22): to do or done with stars, and its due date. */
function TeacherWork({ a, learner, showBy }) {
  const done = a.status.done;
  const unit = a.kind === "unit" ? getUnit(a.unit_id) : null;
  const today = new Date().toLocaleDateString("en-CA");
  const due = a.due_on
    ? a.overdue
      ? t("island.overdue", { date: dateLabel(a.due_on) })
      : a.due_on === today
        ? t("island.dueToday")
        : t("island.due", { date: dateLabel(a.due_on) })
    : null;
  return (
    <Box
      component={Link}
      href={assignmentHref(a, learner)}
      data-assignment={a.title}
      data-done={done ? "yes" : "no"}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 1.25, sm: 1.75 },
        borderRadius: 5.5,
        border: `3px solid ${done ? colors.line : colors.sky.main}`,
        bgcolor: "background.paper",
        textDecoration: "none",
        color: "text.primary",
      }}
    >
      {a.kind === "custom" ? (
        <CardPic card={a.lesson.cards[0]} size={84} radius={4.5} />
      ) : (
        <Box
          aria-hidden="true"
          sx={{
            width: 84,
            height: 84,
            flex: "none",
            borderRadius: 4.5,
            bgcolor: colors.sky.soft,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          <SubjectArt id={unit?.subject} small width={80} height={64} />
        </Box>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
        <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: { xs: 20, sm: 24 } }}>
          {a.title}
        </Typography>
        {showBy && a.teacher && (
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
            {t("island.teacherBy", { teacher: a.teacher, cls: a.class_name })}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <Box
            component="span"
            sx={{
              px: 1.25,
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 14,
              bgcolor: done ? colors.leaf.soft : colors.sky.soft,
              color: done ? colors.leaf.deep : colors.sky.deep,
            }}
          >
            {done ? t("island.doneStars", { stars: a.status.stars }) : t("island.toDo")}
          </Box>
          {!done && due && (
            <Box
              component="span"
              data-testid="due-badge"
              sx={{
                px: 1.25,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                bgcolor: a.overdue ? colors.coral.soft : colors.sun.soft,
                color: a.overdue ? colors.coral.deep : colors.warn.main,
              }}
            >
              {due}
            </Box>
          )}
          {!done && a.status.lessonsTotal > 1 && (
            <Typography component="span" sx={{ color: "text.secondary", fontSize: 14 }}>
              {t("island.lessonsLeft", { done: a.status.lessonsDone, n: a.status.lessonsTotal })}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <Box
      component="section"
      aria-label={title}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: { xs: 1.75, sm: 2.25 },
        borderRadius: 6.5,
        border: `2px solid ${colors.line}`,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h5" component="h2" sx={{ fontSize: { xs: 22, sm: 26 } }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
