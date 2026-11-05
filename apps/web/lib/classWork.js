"use client";
import { useMemo } from "react";
import { getUnit } from "@trailbuddies/content";
import {
  assignmentStatus,
  assignmentMedia,
  classroomSubjects,
  islandOrder,
  isOverdue,
  customId,
  normaliseLesson,
} from "@trailbuddies/domain";
import { useFamily, dbName } from "./store";
import { familyDb } from "./db";

/**
 * Work from teachers on this device (ASN-01, MAP-06b, CRM-05).
 *
 * - At home (account mode): the children's assignments from their linked classes, plus what
 *   they did towards them in class, so Class Island shows it as done whichever device it was on.
 * - On a class device (class mode): the class's assignments, and every child's play towards
 *   them (from the server), merged with what's on this device.
 *
 * Kept in the store, so Class Island works offline. Custom-lesson photos and clips are
 * downloaded on class devices (CRM-05) and opened through the assignment elsewhere.
 */

/** @param {any} api */
export async function loadClassWork(api) {
  const s = useFamily.getState();
  try {
    let next = null;
    if (s.mode === "account" && s.family?.id && s.learners.length)
      next = await api.familyAssignments(s.family.id);
    else if (s.mode === "class" && s.family?.classId) next = await api.classProgress(s.family.classId);
    if (!next) return;
    useFamily.setState({
      classWork: { assignments: next.assignments || [], events: next.events || [], at: Date.now() },
    });
    if (s.mode === "class" && s.family?.classroom) await keepMediaOffline(next.assignments || []);
  } catch {
    /* offline or signed out: keep what this device has */
  }
}

/** Lessons in a unit (1 for a custom lesson). */
export const lessonsTotal = (a) => (a.kind === "unit" ? getUnit(a.unit_id)?.lessons.length || 1 : 1);

/** Assignments for one learner on this device. */
function forLearner(classWork, mode, learnerId) {
  return (classWork.assignments || []).filter((a) =>
    mode === "class" ? (a.to || []).includes(learnerId) : a.learner_id === learnerId,
  );
}

/**
 * MAP-06b: a learner's work from their teacher, with status, due work first.
 * @param {any} learner learnerView
 */
export function useTeacherWork(learner) {
  const classWork = useFamily((s) => s.classWork);
  const mode = useFamily((s) => s.mode);
  const events = useFamily((s) => s.events);
  return useMemo(() => {
    if (!learner) return [];
    const mine = forLearner(classWork, mode, learner.id);
    if (!mine.length) return [];
    const seen = new Set();
    const all = [...events, ...(classWork.events || [])].filter(
      (e) => e.learnerId === learner.id && !seen.has(e.id) && seen.add(e.id),
    );
    const now = new Date();
    return islandOrder(
      mine
        .filter((a) => a.kind === "custom" || getUnit(a.unit_id))
        .map((a) => ({
          ...a,
          status: assignmentStatus(a, all, lessonsTotal(a)),
          overdue: isOverdue(a, now),
        })),
    );
  }, [learner, classWork, mode, events]);
}

/**
 * Where tapping an assignment goes: the next unfinished lesson of a unit, or the custom lesson.
 * @param {any} a with status @param {any} learner learnerView
 */
export function assignmentHref(a, learner) {
  if (a.kind === "custom") return `/play/custom?id=${a.lesson.id}`;
  const unit = getUnit(a.unit_id);
  const next = unit.lessons.findIndex((l) => !learner.progress[l.id]);
  return `/play/lesson/${unit.id}/${next >= 0 ? next + 1 : 1}`;
}

/** Is this unit assigned to this learner (so its trail locks don't apply)? */
export function isAssignedUnit(learnerId, unitId) {
  const s = useFamily.getState();
  return forLearner(s.classWork, s.mode, learnerId).some((a) => a.kind === "unit" && a.unit_id === unitId);
}

/** Assigned custom lessons as Lesson Builder lessons, for the player. */
export function assignedLessons(learnerId) {
  const s = useFamily.getState();
  return forLearner(s.classWork, s.mode, learnerId)
    .filter((a) => a.kind === "custom" && a.lesson)
    .map((a) => ({
      ...normaliseLesson({
        ...a.lesson,
        puzzleCard: a.lesson.puzzle_card ?? undefined,
        question: a.lesson.question ?? undefined,
      }),
      assigned: [learnerId],
      assignmentId: a.id,
      by: a.teacher || null,
    }));
}

/** The assignment a custom lesson's photo or clip belongs to, to open it through. */
export function assignmentMediaPath(mediaId) {
  const s = useFamily.getState();
  for (const a of s.classWork?.assignments || []) {
    if (a.kind === "custom" && assignmentMedia([a]).includes(mediaId))
      return `/api/assignments/${a.id}/media/${mediaId}`;
  }
  return null;
}

/** CRM-05: keep custom-lesson media on a class device, so it works when the Wi-Fi drops. */
async function keepMediaOffline(assignments) {
  const name = dbName(useFamily.getState());
  if (!name) return;
  const d = familyDb(name);
  for (const a of assignments) {
    for (const id of assignmentMedia([a])) {
      try {
        if (await d.media.get(id)) continue;
        const r = await fetch(`/api/assignments/${a.id}/media/${id}`);
        if (!r.ok) continue;
        const blob = await r.blob();
        const kind = blob.type.startsWith("audio") ? "voice" : "photo";
        await d.media.put({ id, kind, type: blob.type, blob, state: "device", attempts: 0 });
      } catch {
        /* try again at the next sync */
      }
    }
  }
}

/** CRM-05: the subjects a class device keeps for its assignments. */
export const classroomPackSubjects = () =>
  classroomSubjects(useFamily.getState().classWork?.assignments || [], (id) => getUnit(id));

export { customId };
