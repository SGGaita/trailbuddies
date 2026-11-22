"use client";
import { getUnit, setPreviewUnit } from "@trailbuddies/content";
import { uploadedMediaId } from "@trailbuddies/domain";
import { api } from "./account";

/**
 * CMS-04: play a draft unit in the real learner screens. The draft lives in memory (and in this
 * tab's sessionStorage, so a reload keeps it); nothing is saved for any child.
 */
const KEY = "tb-cms-preview";

function install(unit, manifest) {
  setPreviewUnit(unit, manifest);
  // Uploaded pictures waiting for approval aren't public yet: staff see them from the staff URL.
  const shown = getUnit(unit.id);
  const byId = new Map((manifest?.assets || []).map((a) => [a.id, a]));
  for (const it of shown?.items || []) {
    const id = uploadedMediaId(byId.get(it.image));
    if (id) it.imageSrc = api.contentAssetUrl(id);
  }
}

/** @param {any} unit @param {any} manifest @param {number | "trophy"} step */
export function previewHref(unit, manifest, step) {
  install(unit, manifest);
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ unit, manifest }));
  } catch {
    /* private mode: the in-memory copy is enough until a reload */
  }
  const q = new URLSearchParams({ unit: unit.id, step: String(step), preview: "1", admin: "1", band: unit.band });
  return `/play/go?${q}`;
}

/** After a reload of /play/go?admin=1: put the stashed draft back. @param {string} unitId */
export function restorePreview(unitId) {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (s?.unit?.id === unitId) install(s.unit, s.manifest);
  } catch {
    /* nothing stashed */
  }
  return true;
}
