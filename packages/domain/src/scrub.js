// Scrubbing for error reports (SAF-07), mirrored in services/api/app/scrub.py. A report
// must never carry a child's name, an email address or a link to a photo, clip or pack.

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const URL_RE = /\b(?:https?|blob|data):[^\s"'<>)]+/gi;
const MEDIA = /\/media\/|\/packs?\/|r2\.|cloudflarestorage|amazonaws|blob:|data:|[?&](exp|sig|token|X-Amz)/i;
const SECRET = /\b(token|sig|signature|password|secret|key|code|pin)=([^&\s]+)/gi;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @param {unknown} text
 * @param {string[]} [names] learner names in this family
 * @param {number} [limit]
 */
export function scrubText(text, names = [], limit = 4000) {
  if (!text) return "";
  let out = String(text).replace(SECRET, (_, k) => `${k}=[hidden]`);
  out = out.replace(URL_RE, (u) => (MEDIA.test(u) ? "[media-url]" : u.split("?")[0].split("#")[0]));
  out = out.replace(EMAIL, "[email]");
  const unique = [...new Set(names.map((n) => (n || "").trim()).filter((n) => n.length > 1))];
  for (const n of unique.sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`\\b${escape(n)}\\b`, "gi"), "[child]");
  }
  return out.slice(0, limit);
}

/** A page path without its query string or learner-specific parts. @param {string} path */
export const scrubPath = (path) =>
  scrubText(
    String(path || "")
      .split("?")[0]
      .split("#")[0],
    [],
    80,
  );

/**
 * Sentry `beforeSend` / `beforeBreadcrumb` helpers: keep only what helps debugging.
 * @param {any} event @param {string[]} names
 */
export function scrubEvent(event, names = []) {
  delete event.user;
  delete event.extra;
  delete event.contexts?.state;
  if (event.request) event.request = { url: scrubText(String(event.request.url || "").split("?")[0], names) };
  if (event.message) event.message = scrubText(event.message, names);
  for (const ex of event.exception?.values || []) {
    ex.value = scrubText(ex.value, names);
    for (const f of ex.stacktrace?.frames || []) delete f.vars;
  }
  if (Array.isArray(event.breadcrumbs))
    event.breadcrumbs = event.breadcrumbs.map((b) => scrubCrumb(b, names));
  else if (event.breadcrumbs?.values)
    event.breadcrumbs.values = event.breadcrumbs.values.map((b) => scrubCrumb(b, names));
  return event;
}

/** Breadcrumbs keep the category and a scrubbed message, never DOM text or request data. */
export function scrubCrumb(crumb, names = []) {
  if (!crumb) return crumb;
  if (crumb.category === "ui.click" || crumb.category === "ui.input" || crumb.category === "console")
    return null;
  return { ...crumb, message: scrubText(crumb.message, names, 300), data: undefined };
}
