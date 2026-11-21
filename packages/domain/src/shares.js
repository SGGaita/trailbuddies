/**
 * Sharing by code (SHR-01…05) and the image checks behind it (SAF-08, BST-08). Pure rules
 * shared by the web app, mobile and tests; the API mirrors them in app/shares.py.
 *
 * A share is a copy of a grown-up's own content: one lesson, a trail (several lessons played
 * in order) or a set of badges. The package holds only cards, media, templates, lesson
 * settings and badge designs (SHR-04): never learner ids, who it's assigned to, progress,
 * names or children's recordings. The server builds the package from its own rows, so a
 * device can't put anything else in it.
 */
import { normaliseCode, validCode } from "./classes.js";

export const SHARE_KINDS = ["lesson", "trail", "badges"];
/** A code works for this many days (P17 "Works for 30 days"). */
export const SHARE_DAYS = 30;
/** A trail or a badge set holds at most this many lessons or badges. */
export const SHARE_MAX_ITEMS = 6;
/** SHR-05: reports from this many different families suspend a code until it's reviewed. */
export const REPORT_THRESHOLD = 3;
export const REPORT_REASONS = ["child-photo", "personal-details", "unkind", "not-for-children", "other"];
/** MOD-01: open items waiting longer than this are highlighted and emailed about. */
export const REVIEW_HOURS = 24;

/** "ABCDEF" shown as "ABC-DEF"; people may type it with or without the dash. */
export const formatShareCode = (code) => {
  const c = normaliseCode(code);
  return c.length === 6 ? `${c.slice(0, 3)}-${c.slice(3)}` : c;
};
export const validShareCode = validCode;
export { normaliseCode as normaliseShareCode };

const LESSON_FIELDS = ["title", "template", "question", "puzzle_card"];
const CARD_FIELDS = ["id", "label", "emoji", "photo", "voice", "group", "fact", "number"];
const OPTION_FIELDS = ["band", "activities", "hints", "games"];

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined && obj[k] !== null).map((k) => [k, obj[k]]));

/**
 * A rule that can travel: lessons in a badge's rule belong to the sender's family, so a badge
 * set's lesson and mastery conditions are dropped. A combination left with one condition
 * becomes that condition; with none, the badge is given by a grown-up.
 * @param {any} rule
 */
export function portableRule(rule) {
  const ok = (r) => ["count", "streak", "assignment"].includes(r?.type);
  if (rule?.type === "combo") {
    const all = (rule.all || []).filter(ok);
    if (all.length >= 2) return { type: "combo", op: rule.op, all };
    return all[0] || { type: "manual" };
  }
  return ok(rule) ? rule : { type: "manual" };
}

/**
 * SHR-04: the share package. Leaves out photos the sender chose to remove (SHR-03) and
 * grown-ups' voice clips unless they ticked "Include my voice recordings".
 * @param {{ kind: string, title?: string, lessons?: any[], badges?: any[] }} src
 * @param {{ voice?: boolean, removed?: string[] }} [opts]
 * @returns {{ kind: string, title: string, lessons: any[], badges: any[] }}
 */
export function sharePackage(src, { voice = false, removed = [] } = {}) {
  const gone = new Set(removed);
  const media = (id) => (id && !gone.has(id) ? id : undefined);
  const lessons = (src.kind === "badges" ? [] : src.lessons || []).map((l) => ({
    ...pick(l, LESSON_FIELDS),
    cards: (l.cards || []).map((c) => {
      const card = pick(c, CARD_FIELDS);
      if (!media(card.photo)) delete card.photo;
      if (!voice || !media(card.voice)) delete card.voice;
      return card;
    }),
    options: pick(l.options || {}, OPTION_FIELDS),
  }));
  const badges = (src.kind === "badges" ? src.badges || [] : []).map((b) => {
    const photo = media(b.photo ?? b.design?.photo);
    const out = {
      name: b.name,
      design: {
        shape: b.shape ?? b.design?.shape,
        colour: b.colour ?? b.design?.colour,
        icon: b.icon ?? b.design?.icon,
        ...(photo ? { photo } : {}),
      },
      rule: portableRule(b.rule),
      treasures: b.treasures | 0,
    };
    if (b.note) out.note = b.note;
    if (b.reward) out.reward = b.reward;
    if (voice && media(b.voice)) out.voice = b.voice;
    return out;
  });
  const title = src.title || lessons[0]?.title || badges[0]?.name || "";
  return { kind: src.kind, title, lessons, badges };
}

/** Every photo and voice clip in a package. */
export function packageMedia(pkg) {
  const photos = [];
  const voices = [];
  for (const l of pkg.lessons || [])
    for (const c of l.cards || []) {
      if (c.photo) photos.push(c.photo);
      if (c.voice) voices.push(c.voice);
    }
  for (const b of pkg.badges || []) {
    if (b.design?.photo) photos.push(b.design.photo);
    if (b.voice) voices.push(b.voice);
  }
  return { photos: [...new Set(photos)], voices: [...new Set(voices)] };
}

/** A share with photos or voice clips waits for the safety team before its code works. */
export const needsReview = (pkg) => {
  const m = packageMedia(pkg);
  return m.photos.length + m.voices.length > 0;
};

/**
 * SHR-03: what still stops a share. `faces` are photos the check found a face in; each must
 * be confirmed as not a child, or removed.
 * @param {{ noNames?: boolean, notChild?: string[], removed?: string[] }} checklist
 * @param {string[]} faces
 * @returns {string[]} i18n keys under share.problem.*
 */
export function shareProblems(checklist, faces = []) {
  const out = [];
  if (!checklist?.noNames) out.push("noNames");
  const ok = new Set([...(checklist?.notChild || []), ...(checklist?.removed || [])]);
  if (faces.some((id) => !ok.has(id))) out.push("faces");
  return out;
}

/** What a code's status means to someone typing it in (P23). */
export const SHARE_STATUS = {
  live: "share.status.live",
  review: "share.status.review",
  revoked: "share.status.gone",
  suspended: "share.status.gone",
  expired: "share.status.gone",
};

/** Is the code past its 30 days? */
export const shareExpired = (share, now = Date.now()) =>
  Boolean(share?.expires_at) && Date.parse(share.expires_at) <= now;

// --- The image check (SAF-08, BST-08) ---------------------------------------------------

/**
 * nsfwjs gives a probability for each of Drawing, Hentai, Neutral, Porn and Sexy. A photo is
 * flagged when explicit content is likely, or suggestive content very likely. The thresholds
 * err towards flagging: a wrong flag costs the grown-up a short wait for review.
 */
export const SCAN_LIMITS = { porn: 0.4, hentai: 0.5, sexy: 0.6 };

/**
 * @param {{ className: string, probability: number }[]} predictions from nsfwjs
 * @returns {{ flagged: boolean, reason: string | null, scores: Record<string, number> }}
 */
export function scanVerdict(predictions) {
  const scores = Object.fromEntries(
    (predictions || []).map((p) => [String(p.className).toLowerCase(), Math.round(p.probability * 1000) / 1000]),
  );
  const over = Object.entries(SCAN_LIMITS).find(([k, v]) => (scores[k] || 0) >= v);
  return { flagged: Boolean(over), reason: over ? "nudity" : null, scores };
}

/**
 * Faces the detector found that are worth asking about: confident and not tiny (a face in
 * a crowd far away isn't identifiable).
 * @param {{ score: number, box: { width: number, height: number } }[]} detections
 * @param {{ width: number, height: number }} size the photo
 */
export function facesWorthAsking(detections, size) {
  const area = size.width * size.height || 1;
  return (detections || []).filter((d) => d.score >= 0.6 && (d.box.width * d.box.height) / area >= 0.005).length;
}

// --- Moderation (MOD-01) --------------------------------------------------------------

/**
 * MOD-01: the queue, oldest first, with items waiting more than 24 hours marked overdue.
 * @param {{ id: string, status: string, created_at: string }[]} items
 * @param {number} [now]
 */
export function moderationQueue(items, now = Date.now()) {
  return [...items]
    .filter((i) => i.status === "open")
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
    .map((i) => ({ ...i, overdue: now - Date.parse(i.created_at) > REVIEW_HOURS * 3600_000 }));
}
