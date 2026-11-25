"use client";
import { t } from "@trailbuddies/i18n";
import { ulid } from "@trailbuddies/sync";
import { api } from "./account";
import { checkImage, scanForServer } from "./imageCheck";
import { preparePhoto } from "./media";

/**
 * Upload a picture for built-in content: a unit picture (CMS-03), island art (CMS-05) or badge
 * art (CMS-08). It's cropped and re-encoded on this device (no EXIF or location), passes the
 * on-device image check, and waits for a reviewer or admin to approve it.
 * @param {File} file
 * @param {string} label what it shows, for the reviewer
 * @returns {Promise<string>} the upload's id
 */
export async function uploadContentPicture(file, label) {
  const blob = await preparePhoto(file);
  const check = await checkImage(blob, { faces: false });
  if (check.flagged) throw new Error(t("cms.pic.flagged"));
  const id = ulid();
  const r = await api.startContentAsset({ id, content_type: "image/jpeg", bytes: blob.size, label: label.slice(0, 80) });
  if (r.upload) {
    const put = await fetch(r.upload.url, { method: "PUT", body: blob, headers: r.upload.headers });
    if (!put.ok) throw new Error(t("cms.pic.uploadFailed"));
  }
  await api.completeContentAsset(id, scanForServer(check));
  return id;
}
