"use client";
import Dexie from "dexie";
import { installPack, installMap, installBadges, getSubjects, BUILT_IN_SUBJECT_IDS } from "@trailbuddies/content";
import { activeSubjects, packPlan, unusedPacks } from "@trailbuddies/domain";
import { api } from "./account";
import { useFamily } from "./store";
import { classroomPackSubjects } from "./classWork";

/**
 * Content packs on this device (CNT-02, OFF-02). Downloaded packs are kept in IndexedDB and
 * installed before the app first renders, so lessons work offline and updated lessons arrive
 * without an app release (they take effect on the next launch). Downloads happen in the
 * background on Wi-Fi, or straight away when a grown-up taps "Download now".
 */

/** Production builds read approved packs; development and previews also get drafts. */
export const CHANNEL = process.env.NEXT_PUBLIC_TB_CHANNEL === "production" ? "production" : "preview";

let db = null;
const store = () => {
  if (!db) {
    db = new Dexie("trailbuddies-content");
    db.version(1).stores({ packs: "subject" });
    // CMS-05/08: the published map and badges, applied at every launch (offline too).
    db.version(2).stores({ packs: "subject", meta: "key" });
  }
  return db;
};

/** Install every pack kept on this device. Never throws: built-in content always works. */
export async function installStoredPacks() {
  try {
    const rows = await store().packs.toArray();
    rows.forEach((r) => installPack(r.pack));
    const meta = Object.fromEntries((await store().meta.toArray()).map((m) => [m.key, m.value]));
    installMap(meta.map);
    installBadges(meta.badges?.doc);
    useFamily.setState({
      packs: {
        ...useFamily.getState().packs,
        cached: Object.fromEntries(rows.map((r) => [r.subject, r.hash])),
      },
    });
  } catch {
    /* no IndexedDB (private window): use what's built in */
  }
}

/** Is the connection one we may use for background downloads? */
function onWifi() {
  const c = typeof navigator !== "undefined" ? navigator.connection : null;
  if (!c) return true; // unknown (desktop, Safari): assume a home connection
  if (c.saveData) return false;
  return c.type ? !["cellular", "bluetooth"].includes(c.type) : true;
}

async function freeBytes() {
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (typeof quota === "number" && typeof usage === "number") return quota - usage;
  } catch {
    /* unknown */
  }
  return Infinity;
}

/** Subjects this device should keep: the children's started subjects and favourites, else all. */
export function wantedSubjects(learners) {
  const list = activeSubjects(
    learners.map((l) => ({
      interests: l.interests,
      started: Object.keys(l.placement || {}).concat(l.subjectsStarted || []),
    })),
  );
  return list.length ? list : getSubjects().map((s) => s.id);
}

/** Trails added in the content admin aren't built into this app: every device downloads them. */
export const newTrails = (manifest) => (manifest?.map || []).filter((m) => !m.archived && !BUILT_IN_SUBJECT_IDS.has(m.id)).map((m) => m.id);

/**
 * Check the manifest and download what's due. Status lands in the store's `packs` for the
 * grown-ups' Settings (what's ready, waiting for Wi-Fi, or didn't fit).
 * @param {{ force?: boolean, learners?: any[] }} [opts]
 */
export async function syncPacks({ force = false, learners } = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const st = useFamily.getState();
  // The demo family has no server; its content is what's built in. Class devices (S10) keep
  // the subjects of their assignments (CRM-05).
  if (st.mode !== "account" && st.mode !== "class") return;
  let manifest;
  try {
    manifest = await api.contentManifest(CHANNEL);
  } catch {
    useFamily.setState({ packs: { ...st.packs, release: null, checkedAt: Date.now() } });
    return; // nothing published yet, or offline: built-in content keeps working
  }
  if (!manifest?.release) {
    useFamily.setState({ packs: { ...st.packs, release: null, checkedAt: Date.now() } });
    return;
  }
  const rows = await store().packs.toArray();
  const cached = Object.fromEntries(rows.map((r) => [r.subject, r.hash]));
  const forClass = st.mode === "class" ? classroomPackSubjects() : [];
  const wanted = [...new Set([...(forClass.length ? forClass : wantedSubjects(learners || st.learners)), ...newTrails(manifest)])];
  const plan = packPlan(manifest, cached, wanted, { free: await freeBytes(), wifi: onWifi(), force });
  for (const p of plan.download) {
    try {
      const pack = await api.contentPack(p.file);
      await store().packs.put({ subject: p.subject, hash: p.hash, bytes: p.bytes, pack });
      cached[p.subject] = p.hash;
    } catch (e) {
      if (e?.name === "QuotaExceededError" || e?.inner?.name === "QuotaExceededError") plan.noRoom.push(p);
    }
  }
  // The map and the badges (CMS-05, CMS-08) take effect on the next launch, like packs.
  try {
    if (manifest.map) await store().meta.put({ key: "map", value: manifest.map });
    const kept = await store().meta.get("badges");
    if (manifest.badges && kept?.value?.hash !== manifest.badges.hash) {
      const doc = await api.contentPack(manifest.badges.file);
      await store().meta.put({ key: "badges", value: { hash: manifest.badges.hash, doc } });
    }
  } catch {
    /* offline or no room: the bundled map and badges keep working */
  }
  useFamily.setState({
    packs: {
      release: manifest.release,
      cached,
      ready: Object.keys(cached).filter((s) =>
        manifest.packs.some((p) => p.subject === s && p.hash === cached[s]),
      ),
      noRoom: plan.noRoom.map((p) => p.subject),
      waiting: plan.waiting,
      unused: unusedPacks(cached, wanted),
      checkedAt: Date.now(),
    },
  });
}

/** Free space: remove downloaded subjects no child is using (built-in content still works). */
export async function clearUnusedPacks() {
  const st = useFamily.getState();
  for (const s of st.packs?.unused || []) await store().packs.delete(s);
  await syncPacks();
}
