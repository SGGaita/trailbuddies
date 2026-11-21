"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useMemo, useState } from "react";
import { ulid } from "@trailbuddies/sync";
import { normaliseLesson, nextVersion, overdueRemovals, flagOn, DEMO_FLAGS } from "@trailbuddies/domain";
import { seedFamily } from "./seed";
import { learnerView } from "./learner";
import { familyDb, loadEvents, saveEvents } from "./db";

const safeStorage = createJSONStorage(() => {
  try {
    const k = "__tb_probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
  }
});

export const DEFAULT_SETTINGS = {
  goal: 2,
  limit: 20,
  bedtime: { on: false, start: "19:30", end: "06:30" },
  voice: true,
  voice_rate: 1,
  sound: true,
  treasure_cap: true,
  breaks: 0,
  captions: true,
  calm: "device",
  emails: { digest: true, badges: false, wishes: false },
};

const empty = () => ({
  /** @type {null | "demo" | "account" | "class"} "class": a class playing on the teacher's device (S9) */
  mode: null,
  /** The signed-in grown-up's teacher side (ONB-13): school and classes, from /me. */
  teacher: /** @type {any} */ (null),
  /** @type {null | { id: string, email: string, name: string }} */
  user: null,
  /** @type {any} */
  family: null,
  settings: DEFAULT_SETTINGS,
  learners: /** @type {any[]} */ ([]),
  waiting: /** @type {any[]} */ ([]),
  activeId: /** @type {string | null} */ (null),
  /** Learners removed on this device that the server still has. */
  removed: /** @type {string[]} */ ([]),
  /** Learners being removed: kept for a 7-day undo (FAM-03), hidden from the children. */
  removing: /** @type {any[]} */ ([]),
  /** Custom lessons from the Lesson Builder (BLD-01..09). */
  lessons: /** @type {any[]} */ ([]),
  /** Lessons deleted on this device that the server still has. */
  removedLessons: /** @type {string[]} */ ([]),
  /** LES-19: letter-sound recordings, sound id -> media id (the family's, on every device). */
  sounds: /** @type {Record<string, string>} */ ({}),
  /** Sound changes made on this device that the server doesn't have yet (null = device voice). */
  soundEdits: /** @type {Record<string, string | null>} */ ({}),
  /** Grown-up tips dismissed on this device (ONB-12). */
  tips: /** @type {Record<string, boolean>} */ ({}),
  /**
   * Work from teachers (S10, lib/classWork.js): at home, the children's assignments and their
   * class play towards them; on a class device, the class's assignments and its play. Kept on
   * the device so Class Island works offline (CRM-05).
   */
  classWork: /** @type {{ assignments: any[], events: any[], at: number }} */ ({
    assignments: [],
    events: [],
    at: 0,
  }),
  /** Badge Studio (BST-01…06): the family's own badges; on a class device, the class's badges. */
  customBadges: /** @type {any[]} */ ([]),
  /** Badges deleted on this device that the server still has. */
  removedBadges: /** @type {string[]} */ ([]),
  /** On a class device (S9/S10): the class's badges, made by the teacher (T05). */
  classBadges: /** @type {any[]} */ ([]),
  /** Wishes (BST-07): real-world rewards set up for each child. */
  wishes: /** @type {any[]} */ ([]),
  removedWishes: /** @type {string[]} */ ([]),
  /**
   * Badges a grown-up awarded from another device that this device has celebrated, per learner
   * (BST-05: the child sees the celebration the next time they open the app).
   */
  celebrated: /** @type {Record<string, string[]>} */ ({}),
  /**
   * Awards made before this time aren't celebrated here: when this device first loaded the
   * family (so years of history don't all celebrate at once), or a week back on a class device.
   */
  celebrateFrom: 0,
});

/** Called after local changes so account mode can sync (set by lib/account.js). */
let afterChange = () => {};
export const onLocalChange = (fn) => {
  afterChange = fn;
};

const now = () => new Date().toISOString();
const GATE_KEY = "tb_grown_up_gate";
const GATE_MS = 10 * 60_000;

// Classroom devices keep their unlock in memory. Account and demo unlocks can
// survive a reload in the same tab and are tied to the current grown-up.
const gateOwner = ({ mode, user }) =>
  mode === "demo" ? "demo" : mode === "account" && user?.id ? `account:${user.id}` : null;

function savedGateUntil(state) {
  try {
    const grant = JSON.parse(sessionStorage.getItem(GATE_KEY) || "null");
    const owner = gateOwner(state);
    if (owner && grant?.owner === owner && Number.isFinite(grant.until) && grant.until > Date.now())
      return grant.until;
  } catch {
    /* No session storage: unlocks still work in memory. */
  }
  return 0;
}

function rememberGate(owner, until) {
  try {
    if (owner && until) sessionStorage.setItem(GATE_KEY, JSON.stringify({ owner, until }));
    else sessionStorage.removeItem(GATE_KEY);
  } catch {
    /* No session storage: unlocks still work in memory. */
  }
}
/** The IndexedDB name for the current mode. */
export const dbName = (s) => (s.mode === "demo" ? "demo" : s.family?.id || null);

/**
 * Local-first family store. Profiles, settings and the session's mode persist in
 * localStorage; the event log lives in IndexedDB (lib/db.js) and is loaded into memory.
 * Every profile or settings edit is stamped with `updated_at` and marked dirty until the
 * server has it (last edit wins).
 */
export const useFamily = create(
  persist(
    (set, get) => ({
      ...empty(),
      events: /** @type {any[]} */ ([]),
      eventsReady: false,
      sync: { state: "idle", at: null, pending: 0 },
      /** Photos and clips waiting to upload, and how many have failed 3 times (BLD-16). */
      uploads: { waiting: 0, failed: 0 },
      /** Content packs on this device (OFF-02): see lib/packs.js. */
      packs: { release: null, cached: {}, ready: [], noRoom: [], waiting: false, unused: [], checkedAt: 0 },
      gateUntil: 0,
      seenVersion: /** @type {string | null} */ (null),

      /** Load the demo family into its own database (never uploaded). */
      startDemo: async () => {
        const seed = seedFamily();
        const db = familyDb("demo");
        await db.events.clear();
        await saveEvents(db, seed.events, 1);
        set({
          ...empty(),
          mode: "demo",
          family: { ...seed.family, id: "demo", role: "owner" },
          settings: { ...DEFAULT_SETTINGS, ...seed.settings },
          learners: seed.learners,
          lessons: seed.lessons,
          customBadges: seed.badges || [],
          celebrateFrom: Date.now(),
          wishes: seed.wishes || [],
          waiting: seed.waiting,
          events: seed.events,
          eventsReady: true,
          gateUntil: 0,
        });
      },
      /** Leave the demo or sign out on this device. */
      clear: () => set({ ...empty(), events: [], eventsReady: true, gateUntil: 0 }),
      /** @param {Partial<ReturnType<typeof empty>>} patch */
      patch: (patch) => set(patch),
      /** Load events for the current mode from IndexedDB. */
      loadEvents: async () => {
        const name = dbName(get());
        const events = name ? await loadEvents(familyDb(name)) : [];
        set({ events, eventsReady: true });
      },

      setActive: (id) => set({ activeId: id }),
      toggleVoice: () => get().setSettings({ voice: !get().settings.voice }),
      /** @param {Partial<typeof DEFAULT_SETTINGS>} patch */
      setSettings: (patch) => {
        set((s) => ({
          settings: { ...s.settings, ...patch },
          family: s.family ? { ...s.family, updated_at: now(), dirty: true } : s.family,
        }));
        afterChange();
      },
      /** @param {{ salt: string, hash: string, iterations: number } | null} pin */
      setPin: (pin) => {
        set((s) => ({ family: { ...s.family, pin, updated_at: now(), dirty: true } }));
        afterChange();
      },
      /** Add a learner profile; the id is made here so it works offline. */
      addLearner: (profile) => {
        const id = ulid();
        set((s) => ({
          learners: [
            ...s.learners,
            {
              id,
              buddy: null,
              outfit: {},
              interests: [],
              placement: {},
              difficulty: "auto",
              ...profile,
              updated_at: now(),
              dirty: true,
            },
          ],
        }));
        afterChange();
        return id;
      },
      /** @param {string} id @param {object} patch */
      updateLearner: (id, patch) => {
        set((s) => ({
          learners: s.learners.map((l) =>
            l.id === id ? { ...l, ...patch, updated_at: now(), dirty: true } : l,
          ),
        }));
        afterChange();
      },
      /** @param {string} id */
      removeLearner: (id) => {
        set((s) => ({
          learners: s.learners.filter((l) => l.id !== id),
          removed: s.mode === "account" ? [...s.removed, id] : s.removed,
          activeId: s.activeId === id ? null : s.activeId,
        }));
        afterChange();
      },
      /** FAM-03: remove a learner after a 7-day undo window. @param {string} id */
      scheduleRemoval: (id) => {
        const l = get().learners.find((x) => x.id === id);
        if (!l) return;
        const at = now();
        set((s) => ({
          learners: s.learners.filter((x) => x.id !== id),
          removing: [...s.removing, { ...l, removing_at: at, updated_at: at, dirty: true }],
          activeId: s.activeId === id ? null : s.activeId,
        }));
        afterChange();
      },
      /** FAM-03: bring a learner back during the undo window. @param {string} id */
      undoRemoval: (id) => {
        const l = get().removing.find((x) => x.id === id);
        if (!l) return;
        set((s) => ({
          removing: s.removing.filter((x) => x.id !== id),
          learners: [...s.learners, { ...l, removing_at: null, updated_at: now(), dirty: true }],
        }));
        afterChange();
      },
      /** Forget learners whose undo window ended (the server deletes its copy the same night). */
      dropOverdue: () => {
        const gone = overdueRemovals(get().removing).map((l) => l.id);
        if (gone.length) set((s) => ({ removing: s.removing.filter((l) => !gone.includes(l.id)) }));
      },
      /** LES-19: use a recording for a sound, or null for the device voice. */
      setSound: (sound, mediaId) => {
        set((s) => {
          const sounds = { ...s.sounds };
          if (mediaId) sounds[sound] = mediaId;
          else delete sounds[sound];
          return {
            sounds,
            soundEdits: s.mode === "account" ? { ...s.soundEdits, [sound]: mediaId } : s.soundEdits,
          };
        });
        afterChange();
      },
      /** @param {string} name */
      dismissTip: (name) => set((s) => ({ tips: { ...s.tips, [name]: true } })),
      /** OFF-06: the app version whose "What's new" the grown-ups have seen. @param {string} v */
      markSeen: (v) => set({ seenVersion: v }),
      /** @param {string} learnerId @param {"auto" | "1" | "2" | "3"} difficulty */
      setDifficulty: (learnerId, difficulty) => get().updateLearner(learnerId, { difficulty }),
      /**
       * Save a custom lesson (new or edited). Card ids never change; the version goes up when
       * the cards or template change. Returns the saved lesson.
       */
      saveLesson: (draft) => {
        const before = get().lessons.find((l) => l.id === draft.id);
        const id = draft.id || ulid();
        const clean = normaliseLesson({ ...draft, id, version: before?.version });
        const saved = {
          ...clean,
          version: nextVersion(before, clean),
          by: before?.by || draft.by || get().family?.parent || get().user?.name || "",
          created_at: before?.created_at || now(),
          updated_at: now(),
          dirty: true,
        };
        set((s) => ({
          lessons: before ? s.lessons.map((l) => (l.id === id ? saved : l)) : [...s.lessons, saved],
        }));
        afterChange();
        return saved;
      },
      /** @param {string} id */
      deleteLesson: (id) => {
        set((s) => ({
          lessons: s.lessons.filter((l) => l.id !== id),
          removedLessons: s.mode === "account" ? [...s.removedLessons, id] : s.removedLessons,
        }));
        afterChange();
      },
      /** BST-01…06: save a badge (new or edited). Returns it. */
      saveBadge: (draft) => {
        const id = draft.id || ulid();
        const saved = { ...draft, id, updated_at: now(), dirty: true };
        set((s) => ({
          customBadges: s.customBadges.some((b) => b.id === id)
            ? s.customBadges.map((b) => (b.id === id ? saved : b))
            : [...s.customBadges, saved],
        }));
        afterChange();
        return saved;
      },
      /** Children who earned it keep it (BDG-07). @param {string} id */
      deleteBadge: (id) => {
        set((s) => ({
          customBadges: s.customBadges.filter((b) => b.id !== id),
          removedBadges: s.mode === "account" ? [...s.removedBadges, id] : s.removedBadges,
        }));
        afterChange();
      },
      /** BST-07: save a wish (new or edited). Returns it. */
      saveWish: (draft) => {
        const id = draft.id || ulid();
        const saved = { ...draft, id, updated_at: now(), dirty: true };
        set((s) => ({
          wishes: s.wishes.some((w) => w.id === id) ? s.wishes.map((w) => (w.id === id ? saved : w)) : [...s.wishes, saved],
        }));
        afterChange();
        return saved;
      },
      /** @param {string} id */
      deleteWish: (id) => {
        set((s) => ({
          wishes: s.wishes.filter((w) => w.id !== id),
          removedWishes: s.mode === "account" ? [...s.removedWishes, id] : s.removedWishes,
        }));
        afterChange();
      },
      /** @param {string} learnerId @param {string[]} eventIds */
      markCelebrated: (learnerId, eventIds) => {
        set((s) => ({
          celebrated: { ...s.celebrated, [learnerId]: [...new Set([...(s.celebrated[learnerId] || []), ...eventIds])] },
        }));
        // On a class device, kept with the class's other device choices (lib/classPlay.js), so
        // the next class session doesn't celebrate the same award again.
        const { mode, family, celebrated } = get();
        if (mode === "class" && family?.classId)
          try {
            const key = `tb_class_${family.classId}`;
            const saved = JSON.parse(localStorage.getItem(key) || "{}");
            localStorage.setItem(key, JSON.stringify({ ...saved, celebrated }));
          } catch {
            /* private window: celebrated again next session at worst */
          }
      },
      /** Append events (built with createEvent): memory now, IndexedDB and the outbox next. */
      record: (events) => {
        const s = get();
        set({ events: [...s.events, ...events] });
        const name = dbName(s);
        if (name) saveEvents(familyDb(name), events, s.mode === "demo" ? 1 : 0).then(() => afterChange());
      },
      /** The grown-up zone stays open for 10 minutes after the gate. */
      unlockGate: () => {
        const gateUntil = Date.now() + GATE_MS;
        rememberGate(gateOwner(get()), gateUntil);
        set({ gateUntil });
      },
      lockGate: () => {
        rememberGate(null, 0);
        set({ gateUntil: 0 });
      },
      active: () => get().learners.find((l) => l.id === get().activeId) || null,
    }),
    {
      name: "trailbuddies-family-v3",
      storage: safeStorage,
      version: 5,
      merge: (stored, current) => {
        const state = { ...current, .../** @type {Partial<typeof current>} */ (stored) };
        return { ...state, gateUntil: savedGateUntil(state) };
      },
      // v4 (Sprint 9): Juma the elephant is now Jumbo.
      migrate: (state, version) => {
        // v5 (Sprint 11): grown-ups' awards are celebrated from now on, not all the old ones.
        if (version < 5 && state) state.celebrateFrom = Date.now();
        if (version < 4 && state) {
          const rename = (l) => (l.buddy === "juma" ? { ...l, buddy: "jumbo" } : l);
          state.learners = (state.learners || []).map(rename);
          state.removing = (state.removing || []).map(rename);
        }
        return state;
      },
      partialize: ({
        mode,
        user,
        family,
        settings,
        learners,
        waiting,
        activeId,
        removed,
        removing,
        lessons,
        removedLessons,
        seenVersion,
        sounds,
        soundEdits,
        tips,
        teacher,
        classWork,
        customBadges,
        removedBadges,
        classBadges,
        wishes,
        removedWishes,
        celebrated,
        celebrateFrom,
      }) => ({
        celebrateFrom,
        classBadges,
        customBadges,
        removedBadges,
        wishes,
        removedWishes,
        celebrated,
        classWork,
        teacher,
        sounds,
        soundEdits,
        tips,
        removed,
        removing,
        seenVersion,
        lessons,
        removedLessons,
        mode,
        user,
        family,
        settings,
        learners,
        waiting,
        activeId,
      }),
    },
  ),
);

useFamily.subscribe((state, previous) => {
  if (gateOwner(previous) && gateOwner(state) !== gateOwner(previous)) state.lockGate();
  else if (previous.gateUntil && !state.gateUntil) rememberGate(null, 0);
});

/** True once the persisted store and the event log have loaded (avoids hydration mismatches). */
export function useHydrated() {
  const [ok, setOk] = useState(false);
  const eventsReady = useFamily((s) => s.eventsReady);
  useEffect(() => {
    const done = () => setOk(true);
    if (useFamily.persist.hasHydrated()) done();
    return useFamily.persist.onFinishHydration(done);
  }, []);
  return ok && eventsReady;
}

/**
 * A learner's profile plus everything derived from the event log.
 * @param {string | null | undefined} [id] defaults to the active learner
 */
export function useLearner(id) {
  const learnerId = useFamily((s) => id ?? s.activeId);
  const learner = useFamily((s) => s.learners.find((l) => l.id === learnerId));
  const events = useFamily((s) => s.events);
  const goal = useFamily((s) => s.settings.goal);
  return useMemo(
    () => (learner ? learnerView(learner, events, new Date(), { goal }) : null),
    [learner, events, goal],
  );
}

/** Every learner with derived state (parent dashboard). */
export function useLearners() {
  const learners = useFamily((s) => s.learners);
  const events = useFamily((s) => s.events);
  const goal = useFamily((s) => s.settings.goal);
  return useMemo(
    () => learners.map((l) => learnerView(l, events, new Date(), { goal })),
    [learners, events, goal],
  );
}

/** OPS-06: is a feature flag on for this family? The demo family shows the beta tools. */
export function useFlag(key) {
  return useFamily((s) => flagOn(s.mode === "demo" ? DEMO_FLAGS : s.family?.flags, key));
}
