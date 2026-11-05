"use client";
import { bandBirth, makePictureLock, studentName, hashPin } from "@trailbuddies/domain";
import { ulid } from "@trailbuddies/sync";
import { useFamily, DEFAULT_SETTINGS } from "./store";
import { api, refreshAccount, syncNow } from "./account";

/**
 * "Play as class" (S9): the teacher's device becomes the class's device. The roster children
 * appear in the profile picker, open their profile with their 3 pictures, and play; their
 * progress syncs to the class (separate from any family's).
 *
 * Classroom mode (S10, CRM-01): the same, on a shared tablet or lab computer the teacher set to
 * the class. The device is registered with the class (the teacher can remove it), the grown-up
 * zone needs the classroom PIN (hashed here, never sent), children are signed out after each
 * lesson or 3 minutes idle, and assigned work is kept on the device for when the Wi-Fi drops.
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

const DEVICE_KEY = "tb_classroom_device";
/** This device's id for classroom mode: made once, kept across classes. */
function deviceId() {
  try {
    const id = localStorage.getItem(DEVICE_KEY) || ulid();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return ulid();
  }
}

/**
 * @param {string} classId
 * @param {{ classroom?: { label: string, pin: string } }} [opts] set this device to the class (CRM-01)
 */
export async function startClassPlay(classId, opts = {}) {
  if (useFamily.getState().mode === "account") await syncNow(); // the family's own changes go up first
  const before = useFamily.getState();
  const cls = await api.getClass(classId);
  let classroom = null;
  let pin = null;
  if (opts.classroom) {
    const device = await api.addDevice(classId, { id: deviceId(), label: opts.classroom.label });
    classroom = { deviceId: device.id, label: device.label };
    pin = await hashPin(opts.classroom.pin);
  }
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
      classroom,
      pin,
    },
    classWork: { assignments: [], events: [], at: 0 },
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
    classWork: { assignments: [], events: [], at: 0 },
  });
  await refreshAccount();
  syncNow();
  return classId;
}
