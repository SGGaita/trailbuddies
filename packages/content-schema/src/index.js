/**
 * Content validation: JSON Schema checks (Ajv, draft 2020-12) plus cross-checks
 * that a schema can't express (ids unique, lesson items exist, catalogue matches units).
 * Node only: schemas are read from disk.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(join(here, "schemas", name), "utf8"));

/** @typedef {"unit" | "catalogue" | "badge" | "buddy-script" | "assets" | "item"} Kind */
/** @typedef {{ valid: boolean, errors: string[] }} Result */

const FILES = {
  item: "item.json",
  unit: "unit.json",
  catalogue: "subject-catalogue.json",
  badge: "badge.json",
  "buddy-script": "buddy-script.json",
  assets: "asset-manifest.json",
};

let ajv;
function compiler() {
  if (ajv) return ajv;
  ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  ajv.addSchema(load("common.json"));
  for (const f of Object.values(FILES)) ajv.addSchema(load(f));
  return ajv;
}

const ID = (kind) => `https://trailbuddies.africa/schema/${FILES[kind]}`;

/** Every kind this package can validate. */
export const KINDS = Object.keys(FILES);

/**
 * Validate one document.
 * @param {Kind} kind
 * @param {unknown} data
 * @returns {Result}
 */
export function validate(kind, data) {
  if (!FILES[kind]) throw new Error(`Unknown content kind: ${kind}`);
  const check = compiler().getSchema(ID(kind));
  const ok = check(data);
  const errors = ok
    ? []
    : check.errors.map(
        (e) =>
          `${e.instancePath || "(root)"} ${e.message}${e.params?.allowedValues ? ": " + e.params.allowedValues.join(", ") : ""}`,
      );
  if (ok && kind === "unit") errors.push(...unitChecks(/** @type {any} */ (data)));
  if (ok && kind === "catalogue") errors.push(...catalogueChecks(/** @type {any} */ (data)));
  return { valid: errors.length === 0, errors };
}

function dupes(list) {
  const seen = new Set();
  const out = new Set();
  for (const x of list) (seen.has(x) ? out : seen).add(x);
  return [...out];
}

/** Rules for a unit that JSON Schema can't express. */
export function unitChecks(unit) {
  const errors = [];
  const ids = unit.items.map((i) => i.id);
  for (const d of dupes(ids)) errors.push(`item id "${d}" is used twice`);
  for (const d of dupes(unit.lessons.map((l) => l.id))) errors.push(`lesson id "${d}" is used twice`);
  const known = new Set(ids);
  const introduced = new Set();
  unit.lessons.forEach((l, i) => {
    if (!l.focus.length && !(l.review || []).length)
      errors.push(`lesson "${l.id}": needs new (focus) or review items`);
    if (!l.id.startsWith(unit.id + "-")) errors.push(`lesson ${i + 1}: id should start with "${unit.id}-"`);
    for (const f of l.focus) {
      if (!known.has(f)) errors.push(`lesson "${l.id}": focus item "${f}" is not in items`);
      introduced.add(f);
    }
    for (const r of l.review || []) {
      if (!known.has(r)) errors.push(`lesson "${l.id}": review item "${r}" is not in items`);
      else if (!introduced.has(r))
        errors.push(`lesson "${l.id}": review item "${r}" hasn't been introduced yet`);
    }
    for (const e of l.exercises) {
      if (e.choices && e.choices > unit.items.length)
        errors.push(`lesson "${l.id}": ${e.choices} choices but only ${unit.items.length} items`);
    }
  });
  const unused = ids.filter((id) => !introduced.has(id));
  if (unused.length) errors.push(`items never introduced in a lesson: ${unused.join(", ")}`);
  return errors;
}

/** Rules for the subject catalogue. */
export function catalogueChecks(cat) {
  const errors = [];
  for (const d of dupes(cat.subjects.map((s) => s.id))) errors.push(`subject id "${d}" is used twice`);
  for (const d of dupes(cat.subjects.flatMap((s) => s.units.map((u) => u.id))))
    errors.push(`unit id "${d}" is used twice`);
  return errors;
}

/**
 * Check a unit file against its catalogue entry.
 * @returns {string[]}
 */
export function matchesCatalogue(unit, cat) {
  const subject = cat.subjects.find((s) => s.id === unit.subject);
  if (!subject) return [`unit "${unit.id}": subject "${unit.subject}" is not in the catalogue`];
  const entry = subject.units.find((u) => u.id === unit.id);
  if (!entry) return [`unit "${unit.id}" is not listed under ${subject.name} in the catalogue`];
  const errors = [];
  if (entry.title !== unit.title)
    errors.push(`unit "${unit.id}": title differs from catalogue ("${entry.title}")`);
  if (entry.band !== unit.band) errors.push(`unit "${unit.id}": band differs from catalogue (${entry.band})`);
  if (entry.status !== unit.status)
    errors.push(`unit "${unit.id}": status differs from catalogue (${entry.status})`);
  if (entry.lessons && entry.lessons !== unit.lessons.length)
    errors.push(`unit "${unit.id}": ${unit.lessons.length} lessons but catalogue says ${entry.lessons}`);
  return errors;
}

/**
 * Production gate: every asset must be approved.
 * @returns {string[]}
 */
export function unapprovedAssets(manifest) {
  return manifest.assets
    .filter((a) => a.review_status !== "approved")
    .map((a) => `asset "${a.id}" is ${a.review_status}`);
}
