"use client";
import { createClient, ApiError } from "@trailbuddies/api-client";
import { createSyncer, newer } from "@trailbuddies/sync";
import { useFamily, onLocalChange, dbName } from "./store";
import { familyDb, outbox, cursor, saveEvents, loadEvents, pendingCount, forget } from "./db";
import { uploadMedia, refreshUploadStatus } from "./media";

/** The API, through the web app's own /api proxy (same-origin session cookie). */
export const api = createClient({ baseUrl: "/api" });
export { ApiError };

const get = () => useFamily.getState();

/** Store learner ↔ API learner. Children's records hold only these fields. */
export const learnerToApi = (l) => ({
  name: l.name,
  birth_year: l.birth.year,
  birth_month: l.birth.month,
  avatar_color: l.color,
  buddy: l.buddy || null,
  outfit: l.outfit || {},
  interests: l.interests || [],
  placement: l.placement || {},
  difficulty: l.difficulty || "auto",
  levels: l.levels || {},
  wish: l.wish || null,
  updated_at: l.updated_at,
});
export const learnerFromApi = (a) => ({
  id: a.id,
  name: a.name,
  birth: { year: a.birth_year, month: a.birth_month },
  color: a.avatar_color,
  buddy: a.buddy,
  outfit: a.outfit,
  interests: a.interests,
  placement: a.placement,
  difficulty: a.difficulty,
  levels: a.levels || {},
  wish: a.wish ?? null,
  updated_at: a.updated_at,
});

/** Store lesson ↔ API lesson (Lesson Builder). */
export const lessonToApi = (l) => ({
  title: l.title,
  template: l.template,
  question: l.question ?? null,
  puzzle_card: l.puzzleCard ?? null,
  cards: l.cards,
  assigned: l.assigned,
  version: l.version || 1,
  options: l.options || {},
  updated_at: l.updated_at,
});
export const lessonFromApi = (a) => ({
  id: a.id,
  title: a.title,
  template: a.template,
  ...(a.question ? { question: a.question } : {}),
  ...(a.puzzle_card ? { puzzleCard: a.puzzle_card } : {}),
  cards: a.cards,
  assigned: a.assigned,
  version: a.version,
  options: a.options || {},
  updated_at: a.updated_at,
});

/** Merge the server's lessons: a dirty local edit wins only if it's newer. */
function applyLessons(remote) {
  const s = get();
  const local = new Map(s.lessons.map((l) => [l.id, l]));
  const lessons = remote
    .filter((a) => !s.removedLessons.includes(a.id))
    .map((a) => {
      const theirs = lessonFromApi(a);
      const mine = local.get(a.id);
      local.delete(a.id);
      return mine?.dirty ? newer(theirs, mine) : { ...theirs, by: mine?.by };
    });
  for (const l of local.values()) if (l.dirty) lessons.push(l);
  useFamily.setState({ lessons });
}

async function pushLessons() {
  const s = get();
  const fam = s.family;
  if (!fam?.id || !fam.consent || fam.role === "viewer") return;
  for (const id of s.removedLessons) {
    try {
      await api.deleteLesson(fam.id, id);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
    useFamily.setState((st) => ({ removedLessons: st.removedLessons.filter((x) => x !== id) }));
  }
  for (const l of s.lessons.filter((x) => x.dirty)) {
    await api.putLesson(fam.id, l.id, lessonToApi(l));
    useFamily.setState((st) => ({
      lessons: st.lessons.map((x) =>
        x.id === l.id && x.updated_at === l.updated_at ? { ...x, dirty: false } : x,
      ),
    }));
  }
}

/** Merge the server's copy into the store: dirty local edits win only if they are newer. */
function applyMe(me) {
  const s = get();
  const fam = me.families[0] || null;
  const local = new Map(s.learners.map((l) => [l.id, l]));
  const learners = (fam?.learners || [])
    .filter((a) => !s.removed.includes(a.id))
    .map((a) => {
      const remote = learnerFromApi(a);
      const mine = local.get(a.id);
      local.delete(a.id);
      return mine?.dirty ? newer(remote, mine) : remote;
    });
  // Learners made on this device that the server hasn't seen yet.
  for (const l of local.values()) if (l.dirty) learners.push(l);
  const keepLocalFamily = s.family?.dirty && fam && newer(fam, s.family) === s.family;
  const family = fam
    ? keepLocalFamily
      ? {
          ...s.family,
          consent: fam.consent,
          role: fam.role,
          learner_limit: fam.learner_limit,
          device_limit: fam.device_limit,
          region: fam.region,
          country: fam.country,
        }
      : {
          id: fam.id,
          name: fam.name,
          country: fam.country,
          plan: fam.plan === "free" ? "Free" : fam.plan === "family" ? "Family" : fam.plan,
          learner_limit: fam.learner_limit,
          device_limit: fam.device_limit,
          region: fam.region,
          role: fam.role,
          pin: fam.pin,
          consent: fam.consent,
          updated_at: fam.updated_at,
          parent: me.user.name || "",
        }
    : null;
  useFamily.setState({
    mode: "account",
    user: me.user,
    family: family && { ...family, parent: me.user.name || "" },
    settings: keepLocalFamily ? s.settings : fam ? fam.settings : s.settings,
    learners,
    waiting: [],
    activeId: learners.some((l) => l.id === s.activeId) ? s.activeId : null,
  });
}

/**
 * Fetch the account. Returns "signed-out", "offline" or "ok". Offline keeps whatever is
 * on the device, so a family can keep playing without a connection.
 */
export async function refreshAccount() {
  try {
    applyMe(await api.me());
    await get().loadEvents();
    return "ok";
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      if (get().mode === "account") get().patch({ user: null });
      return "signed-out";
    }
    return "offline";
  }
}

/** After the magic link or Google: load the account and its events. */
export async function signedIn() {
  if (get().mode === "demo") get().clear();
  const r = await refreshAccount();
  if (r === "ok") syncNow();
  return r;
}

/** Sign out of every device, then this one. */
export async function signOutEverywhere() {
  await api.logoutAll();
  await signOut();
}

/** A carer can view progress but never changes anything. */
export const canEdit = (s) => s.mode !== "account" || s.family?.role !== "viewer";

export async function signOut() {
  const name = dbName(get());
  try {
    await api.logout();
  } catch {
    /* offline: the cookie expires on its own */
  }
  get().clear();
  if (name && name !== "demo") await forget(name);
}

/** Where a grown-up should be in onboarding, or null when set up. */
export function setupStep(s, policyVersion) {
  if (s.mode === "demo") return null;
  if (s.mode !== "account") return "/start";
  if (!s.user) return "/start"; // signed out (here or from another device): back to the welcome
  if (!s.family) return "/start/about";
  if (s.family.role === "viewer") return null; // carers join a family that's already set up
  if (!s.family.consent || (policyVersion && s.family.consent.policy_version !== policyVersion))
    return "/start/consent";
  // ONB-05: after moving to a country with different privacy rules, agree again.
  if (s.family.region && s.family.consent.region && s.family.region !== s.family.consent.region)
    return "/start/consent";
  if (!s.learners.length) return "/start/learners";
  return null;
}

async function pushProfiles() {
  const s = get();
  const fam = s.family;
  if (!fam?.id || !fam.consent || fam.role === "viewer") return;
  if (fam.dirty) {
    const body = { settings: s.settings, updated_at: fam.updated_at };
    if (fam.pin) body.pin = fam.pin;
    else body.clear_pin = true;
    await api.patchFamily(fam.id, body);
    useFamily.setState((st) => ({
      family: st.family.updated_at === fam.updated_at ? { ...st.family, dirty: false } : st.family,
    }));
  }
  for (const id of s.removed) {
    try {
      await api.deleteLearner(fam.id, id);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
    useFamily.setState((st) => ({ removed: st.removed.filter((x) => x !== id) }));
  }
  for (const l of s.learners.filter((x) => x.dirty && !x.overLimit)) {
    try {
      await api.putLearner(fam.id, l.id, learnerToApi(l));
    } catch (e) {
      // Over the plan's learner limit (e.g. added offline): keep it on this device, flagged.
      if (e instanceof ApiError && e.code === "plan_limit") {
        useFamily.setState((st) => ({
          learners: st.learners.map((x) => (x.id === l.id ? { ...x, overLimit: true } : x)),
        }));
        continue;
      }
      throw e;
    }
    useFamily.setState((st) => ({
      learners: st.learners.map((x) =>
        x.id === l.id && x.updated_at === l.updated_at ? { ...x, dirty: false } : x,
      ),
    }));
  }
}

let syncer = null;
let syncerFor = null;
let queued = null;

/** Push profile edits and events, pull other devices' events. Safe to call often. */
export async function syncNow() {
  const s = get();
  if (s.mode !== "account" || !s.family?.id || !s.family.consent) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    useFamily.setState({ sync: { ...s.sync, state: "offline" } });
    return;
  }
  const db = familyDb(s.family.id);
  if (syncerFor !== s.family.id) {
    syncerFor = s.family.id;
    syncer = createSyncer({
      api,
      familyId: s.family.id,
      outbox: outbox(db),
      cursor: cursor(db),
      onPulled: async (events) => {
        await saveEvents(db, events, 1);
        useFamily.setState({ events: await loadEvents(db) });
      },
    });
  }
  useFamily.setState({ sync: { ...get().sync, state: "syncing" } });
  try {
    await pushProfiles();
    // Photos and clips first, then the lessons that use them (a card works locally meanwhile).
    await uploadMedia(api);
    await pushLessons();
    // Carers only read: their devices pull progress but never upload.
    if (get().family?.role === "viewer") await syncer.pull();
    else await syncer.syncOnce();
    applyMe(await api.me());
    applyLessons((await api.lessons(s.family.id)).lessons);
    useFamily.setState({ sync: { state: "idle", at: Date.now(), pending: await pendingCount(db) } });
  } catch (e) {
    const signedOut = e instanceof ApiError && e.status === 401;
    if (signedOut) useFamily.setState({ user: null });
    useFamily.setState({
      sync: {
        state: signedOut ? "signed-out" : "offline",
        at: get().sync.at,
        pending: await pendingCount(db),
      },
    });
  }
  await refreshUploadStatus();
}

/** A grown-up pressed Retry on the "waiting to upload" banner (BLD-16). */
export async function retryUploads() {
  await uploadMedia(api, { retry: true });
  syncNow();
}

/** Debounced sync after local changes. */
function soon() {
  clearTimeout(queued);
  queued = setTimeout(syncNow, 800);
}
onLocalChange(soon);

/**
 * ONB-05: change the family's country (online only). Returns "consent" when the new country
 * has different privacy rules, so the grown-up is asked to agree again.
 * @param {string} country ISO code
 */
export async function changeCountry(country) {
  const fam = get().family;
  if (!fam?.id) return "ok";
  await api.patchFamily(fam.id, { country, updated_at: new Date().toISOString() });
  await refreshAccount();
  const f = get().family;
  return f?.region && f.consent?.region && f.region !== f.consent.region ? "consent" : "ok";
}

/** FAM-08: this family's signed-in devices. */
export const listDevices = () => api.devices(get().family.id);
/** FAM-08: sign out one device. */
export const signOutDevice = (id) => api.signOutDevice(get().family.id, id);
