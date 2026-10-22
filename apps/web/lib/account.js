"use client";
import { createClient, ApiError } from "@trailbuddies/api-client";
import { createSyncer, newer } from "@trailbuddies/sync";
import { useFamily, onLocalChange, dbName } from "./store";
import { familyDb, outbox, cursor, saveEvents, loadEvents, pendingCount, forget } from "./db";

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
  wish: a.wish ?? null,
  updated_at: a.updated_at,
});

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
      ? { ...s.family, consent: fam.consent, role: fam.role, learner_limit: fam.learner_limit }
      : {
          id: fam.id,
          name: fam.name,
          country: fam.country,
          plan: fam.plan === "free" ? "Free" : fam.plan === "family" ? "Family" : fam.plan,
          learner_limit: fam.learner_limit,
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
    // Carers only read: their devices pull progress but never upload.
    if (get().family?.role === "viewer") await syncer.pull();
    else await syncer.syncOnce();
    applyMe(await api.me());
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
}

/** Debounced sync after local changes. */
function soon() {
  clearTimeout(queued);
  queued = setTimeout(syncNow, 800);
}
onLocalChange(soon);
