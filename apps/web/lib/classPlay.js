"use client";
import { bandBirth, makePictureLock, studentName } from "@trailbuddies/domain";
import { useFamily, DEFAULT_SETTINGS } from "./store";
import { api, refreshAccount, syncNow } from "./account";

/**
 * "Play as class" (S9): the teacher's device becomes the class's device. The roster children
 * appear in the profile picker, open their profile with their 3 pictures, and play; their
 * progress syncs to the class (separate from any family's). Shared-tablet classroom mode is S10.
 *
 * Choices a child makes on this device (buddy, outfit) are remembered here between sessions.
 */

const KEY = (id) => `tb_class_${id}`;
const readLocal = (id) => {
  try {
    return JSON.parse(localStorage.getItem(KEY(id)) || "{}");
  } catch {
    return {};
  }
};
const writeLocal = (id, data) => {
  try {
    localStorage.setItem(KEY(id), JSON.stringify(data));
  } catch {
    /* private window: they'll pick again next time */
  }
};

/** @param {string} classId */
export async function startClassPlay(classId) {
  if (useFamily.getState().mode === "account") await syncNow(); // the family's own changes go up first
  const before = useFamily.getState();
  const cls = await api.getClass(classId);
  const local = readLocal(classId);
  const now = new Date().toISOString();
  const learners = await Promise.all(
    cls.roster.map(async (st) => ({
      id: st.id,
      name: studentName(st),
      birth: bandBirth(cls.band),
      color: st.avatar_color,
      buddy: local[st.id]?.buddy || null,
      outfit: local[st.id]?.outfit || {},
      interests: [],
      placement: {},
      difficulty: "auto",
      levels: {},
      picture_lock: st.pictures?.length === 3 ? await makePictureLock(st.pictures) : null,
      updated_at: now,
    })),
  );
  useFamily.setState({
    mode: "class",
    user: before.user,
    teacher: before.teacher,
    family: {
      id: `class-${cls.id}`,
      classId: cls.id,
      name: cls.name,
      role: "owner",
      plan: "Class",
      parent: before.user?.name || "",
    },
    settings: DEFAULT_SETTINGS,
    learners,
    activeId: null,
    events: [],
    eventsReady: false,
    gateUntil: 0,
  });
  await useFamily.getState().loadEvents();
  api.teacherTips({ played: true }).catch(() => {});
  syncNow();
  return cls;
}

/** Back to the teacher's own account (and family, if they have one). */
export async function endClassPlay() {
  const s = useFamily.getState();
  const classId = s.family?.classId;
  if (classId)
    writeLocal(
      classId,
      Object.fromEntries(s.learners.map((l) => [l.id, { buddy: l.buddy, outfit: l.outfit }])),
    );
  await syncNow(); // last class progress up first
  useFamily.setState({
    mode: "account",
    family: null,
    learners: [],
    events: [],
    eventsReady: false,
    activeId: null,
  });
  await refreshAccount();
  syncNow();
  return classId;
}
