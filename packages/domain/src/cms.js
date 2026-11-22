/**
 * The content admin (CMS-01…04): staff roles, and the rules for editing built-in units. Pure
 * functions shared by the web admin and tests; the API mirrors them in app/cms.py.
 *
 * Built-in content is versioned. A draft holds only the units that changed; publishing makes a
 * new version and builds the same content packs devices already download (CNT-02), so devices
 * need no change and play it offline.
 */

/** CMS-01: what each staff role may do. The first admin comes from TB_ADMIN_EMAILS. */
export const STAFF_ROLES = ["admin", "editor", "reviewer", "moderator"];
export const ROLE_CAN = {
  admin: ["edit", "publish", "approve-asset", "roles", "moderate"],
  editor: ["edit"],
  reviewer: ["approve-asset"],
  moderator: ["moderate"],
};
/** @param {string | null | undefined} role @param {string} action */
export const can = (role, action) => Boolean(role && ROLE_CAN[role]?.includes(action));

/** The first screen a role lands on in /admin. */
export const homeFor = (role) => (can(role, "edit") || can(role, "approve-asset") ? "/admin/content" : can(role, "moderate") ? "/admin/moderation" : null);

/** Exercise types a lesson can use (unit.json), with the ones that take a number of choices. */
export const EXERCISE_TYPES = ["listen-tap", "clue-tap", "match", "count", "name-it", "compare", "sequence", "sort", "odd-one-out", "case-match", "build-word", "trace", "clock", "true-false"];
export const TAKES_CHOICES = new Set(["listen-tap", "clue-tap", "name-it", "odd-one-out", "count", "compare"]);

const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/**
 * A new item's id: made from its word, unique in the unit. Ids never change afterwards, so a
 * child's stars and mastery follow the item through every edit (CMS-03).
 * @param {string} label @param {string[]} taken
 */
export function newItemId(label, taken) {
  const base = slug(label) || "item";
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** Item ids that existed in the published unit and are still there: they must keep their ids. */
export const keptItems = (published, draft) => {
  const now = new Set((draft?.items || []).map((i) => i.id));
  return (published?.items || []).map((i) => i.id).filter((id) => now.has(id));
};

/**
 * Remove an item and every reference to it in the lessons. A lesson left with nothing to teach
 * keeps its review items, and the validator says what's missing.
 * @param {any} unit @param {string} id
 */
export function removeItem(unit, id) {
  return {
    ...unit,
    items: unit.items.filter((i) => i.id !== id),
    lessons: unit.lessons.map((l) => ({
      ...l,
      focus: l.focus.filter((f) => f !== id),
      ...(l.review ? { review: l.review.filter((r) => r !== id) } : {}),
    })),
  };
}

/**
 * Keep the catalogue entry in step with the unit (the validator checks title, band, status and
 * the number of lessons match).
 * @param {any} entry @param {any} unit
 */
export const syncEntry = (entry, unit) => ({
  ...entry,
  title: unit.title,
  band: unit.band,
  status: unit.status,
  ...(entry.lessons != null ? { lessons: unit.lessons.length } : {}),
});

/** An uploaded picture in a unit's asset manifest (CMS-03). Children see it once approved. */
export const UPLOAD_PREFIX = "uploads/";
export const uploadAssetEntry = (mediaId, approved = false) => ({
  id: `img-up-${mediaId.toLowerCase()}`,
  kind: "image",
  path: `${UPLOAD_PREFIX}${mediaId}`,
  source: "uploaded",
  license: "Trailbuddies staff upload",
  review_status: approved ? "approved" : "reviewed",
});
/** The media id of an uploaded asset, or null for a built-in illustration. */
export const uploadedMediaId = (asset) => (asset?.path?.startsWith(UPLOAD_PREFIX) ? asset.path.slice(UPLOAD_PREFIX.length) : null);

const itemText = (i) => [i.label, i.say, i.fact, i.emoji, i.image].map((x) => x || "").join("|");

/**
 * What changed between two versions of a unit, in plain words (the draft banner, and the
 * reviewer's list in S13).
 * @param {any} before published unit (or null for a new one)
 * @param {any} after draft
 * @returns {string[]}
 */
export function diffUnit(before, after) {
  if (!before) return [`new unit “${after.title}”`];
  const out = [];
  if (before.title !== after.title) out.push(`renamed to “${after.title}”`);
  if (before.band !== after.band) out.push(`band ${before.band} → ${after.band}`);
  if (before.status !== after.status) out.push(after.status === "ready" ? "marked ready for children" : `status ${before.status} → ${after.status}`);
  if ((before.summary || "") !== (after.summary || "")) out.push("summary changed");
  const was = new Map(before.items.map((i) => [i.id, i]));
  const now = new Map(after.items.map((i) => [i.id, i]));
  const added = after.items.filter((i) => !was.has(i.id)).map((i) => i.label);
  const removed = before.items.filter((i) => !now.has(i.id)).map((i) => i.label);
  const changed = after.items.filter((i) => was.has(i.id) && itemText(was.get(i.id)) !== itemText(i)).map((i) => i.label);
  if (added.length) out.push(`added ${added.join(", ")}`);
  if (removed.length) out.push(`removed ${removed.join(", ")}`);
  if (changed.length) out.push(`edited ${changed.join(", ")}`);
  const order = (u) => u.items.map((i) => i.id).filter((id) => was.has(id) && now.has(id)).join();
  if (!added.length && !removed.length && order(before) !== order(after)) out.push("items reordered");
  if (JSON.stringify(before.lessons) !== JSON.stringify(after.lessons)) out.push("lessons changed");
  return out;
}

/**
 * Turn validator messages ("/items/2/label must NOT have fewer than 1 characters") into the
 * field they belong to, so the editor shows each problem next to its field.
 * @param {string[]} errors from content-schema validate("unit")
 * @returns {{ field: string, message: string }[]}
 */
export function fieldErrors(errors) {
  return errors.map((e) => {
    const m = e.match(/^\/(items|lessons)\/(\d+)(?:\/([a-z_]+))?/);
    if (m) return { field: `${m[1]}.${m[2]}${m[3] ? "." + m[3] : ""}`, message: e.replace(/^\S+\s/, "") };
    const top = e.match(/^\/([a-z]+)/);
    if (top) return { field: top[1], message: e.replace(/^\S+\s/, "") };
    const lesson = e.match(/^lesson "([^"]+)"/);
    if (lesson) return { field: `lesson:${lesson[1]}`, message: e };
    return { field: "unit", message: e };
  });
}
