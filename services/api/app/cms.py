"""The content admin (CMS-01…04). Mirrors packages/domain/src/cms.js and the checks in
packages/content-schema.

- Staff roles: admin, editor, reviewer, moderator. The emails in TB_ADMIN_EMAILS are admins.
- Built-in content (the subject catalogue, each unit and its asset manifest) is versioned.
  Version 1 is the import of the files in the code. A draft holds only the documents that
  changed. Publishing makes the next version and builds the same content packs devices already
  download (CNT-02), so devices need no change and play the new content offline.
"""

import hashlib
import json
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry
from referencing.jsonschema import DRAFT202012
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from .db import utcnow
from .ids import ulid
from .models import AdminLog, ContentAsset, ContentDoc, ContentVersion, StaffMember, User
from .packs import manifest_key
from .settings import get_settings

ROLE_CAN = {
    "admin": {"edit", "publish", "approve-asset", "roles", "moderate"},
    "editor": {"edit"},
    "reviewer": {"approve-asset"},
    "moderator": {"moderate"},
}
ROLES = tuple(ROLE_CAN)
UPLOAD_PREFIX = "uploads/"


def role_of(db: DbSession, user: User) -> str | None:
    email = user.email.lower()
    if email in get_settings().admins:
        return "admin"
    m = db.get(StaffMember, email)
    return m.role if m else None


def can(role: str | None, action: str) -> bool:
    return bool(role) and action in ROLE_CAN.get(role, set())


def log(db: DbSession, who: str, action: str, target: str, detail: dict | None = None) -> None:
    db.add(AdminLog(id=ulid(), who=who, action=action, target=target, detail=detail))


# --- Validation: the same JSON Schemas as packages/content-schema ------------------------

FILES = {"unit": "unit.json", "catalogue": "subject-catalogue.json", "assets": "asset-manifest.json"}


@lru_cache
def _validators() -> dict:
    schemas = json.loads((Path(__file__).parent / "content_schemas.json").read_text())
    # Draft 2020-12 everywhere (the files don't all say which draft they are).
    registry = Registry().with_resources((s["$id"], DRAFT202012.create_resource(s)) for s in schemas.values())
    return {k: Draft202012Validator(schemas[f], registry=registry) for k, f in FILES.items()}


def _path(err) -> str:
    return "".join(f"/{p}" for p in err.absolute_path) or "(root)"


def _dupes(xs: list) -> list:
    seen, out = set(), []
    for x in xs:
        if x in seen and x not in out:
            out.append(x)
        seen.add(x)
    return out


def unit_checks(unit: dict) -> list[str]:
    """packages/content-schema unitChecks: rules JSON Schema can't express."""
    errors = []
    ids = [i["id"] for i in unit["items"]]
    errors += [f'item id "{d}" is used twice' for d in _dupes(ids)]
    errors += [f'lesson id "{d}" is used twice' for d in _dupes([lesson["id"] for lesson in unit["lessons"]])]
    known, introduced = set(ids), set()
    for i, lesson in enumerate(unit["lessons"]):
        if not lesson["focus"] and not lesson.get("review"):
            errors.append(f'lesson "{lesson["id"]}": needs new (focus) or review items')
        if not lesson["id"].startswith(unit["id"] + "-"):
            errors.append(f'lesson {i + 1}: id should start with "{unit["id"]}-"')
        for f in lesson["focus"]:
            if f not in known:
                errors.append(f'lesson "{lesson["id"]}": focus item "{f}" is not in items')
            introduced.add(f)
        for r in lesson.get("review", []):
            if r not in known:
                errors.append(f'lesson "{lesson["id"]}": review item "{r}" is not in items')
            elif r not in introduced:
                errors.append(f'lesson "{lesson["id"]}": review item "{r}" hasn\'t been introduced yet')
        for e in lesson["exercises"]:
            if e.get("choices") and e["choices"] > len(ids):
                errors.append(f'lesson "{lesson["id"]}": {e["choices"]} choices but only {len(ids)} items')
    unused = [i for i in ids if i not in introduced]
    if unused:
        errors.append(f"items never introduced in a lesson: {', '.join(unused)}")
    return errors


def problems(kind: str, data) -> list[str]:
    v = _validators()[kind]
    errors = [f"{_path(e)} {e.message}" for e in sorted(v.iter_errors(data), key=lambda e: list(e.path))]
    if not errors and kind == "unit":
        errors = unit_checks(data)
    if not errors and kind == "catalogue":
        units = [u["id"] for s in data["subjects"] for u in s["units"]]
        errors = [f'subject id "{d}" is used twice' for d in _dupes([s["id"] for s in data["subjects"]])]
        errors += [f'unit id "{d}" is used twice' for d in _dupes(units)]
    return errors


def sync_entry(entry: dict, unit: dict) -> dict:
    out = {**entry, "title": unit["title"], "band": unit["band"], "status": unit["status"]}
    if entry.get("lessons") is not None:
        out["lessons"] = len(unit["lessons"])
    return out


# --- Versions --------------------------------------------------------------------------


def live_version(db: DbSession) -> ContentVersion | None:
    return db.scalar(
        select(ContentVersion).where(ContentVersion.status == "published").order_by(ContentVersion.id.desc())
    )


def draft_version(db: DbSession) -> ContentVersion | None:
    return db.scalar(select(ContentVersion).where(ContentVersion.status == "draft"))


def docs(db: DbSession, upto: int | None, with_draft: bool = False) -> dict[tuple[str, str], ContentDoc]:
    """The content as of a version: for each document, its newest copy in a published version
    up to `upto` (and in the draft, when asked)."""
    versions = db.scalars(select(ContentVersion)).all()
    allowed = {v.id for v in versions if v.status == "published" and (upto is None or v.id <= upto)}
    if with_draft:
        allowed |= {v.id for v in versions if v.status == "draft"}
    out: dict[tuple[str, str], ContentDoc] = {}
    for d in db.scalars(
        select(ContentDoc).where(ContentDoc.version_id.in_(allowed)).order_by(ContentDoc.version_id)
    ):
        out[(d.kind, d.key)] = d
    return out


def put_doc(db: DbSession, version: ContentVersion, kind: str, key: str, data: dict, who: str) -> None:
    d = db.scalar(
        select(ContentDoc).where(
            ContentDoc.version_id == version.id, ContentDoc.kind == kind, ContentDoc.key == key
        )
    )
    if d:
        d.data, d.updated_by, d.updated_at = data, who, utcnow()
    else:
        db.add(ContentDoc(id=ulid(), version_id=version.id, kind=kind, key=key, data=data, updated_by=who))


def ensure_draft(db: DbSession, who: str) -> ContentVersion:
    d = draft_version(db)
    if not d:
        live = live_version(db)
        d = ContentVersion(id=(live.id if live else 0) + 1, status="draft", created_by=who)
        db.add(d)
        db.flush()
    return d


# --- What changed (the draft banner; the reviewer's list in S13) ------------------------


def _item_text(i: dict) -> str:
    return "|".join(str(i.get(k) or "") for k in ("label", "say", "fact", "emoji", "image"))


def diff_unit(before: dict | None, after: dict) -> list[str]:
    """packages/domain diffUnit."""
    if not before:
        return [f"new unit “{after['title']}”"]
    out = []
    if before["title"] != after["title"]:
        out.append(f"renamed to “{after['title']}”")
    if before["band"] != after["band"]:
        out.append(f"band {before['band']} → {after['band']}")
    if before["status"] != after["status"]:
        out.append(
            "marked ready for children"
            if after["status"] == "ready"
            else f"status {before['status']} → {after['status']}"
        )
    if (before.get("summary") or "") != (after.get("summary") or ""):
        out.append("summary changed")
    was = {i["id"]: i for i in before["items"]}
    now = {i["id"]: i for i in after["items"]}
    added = [i["label"] for i in after["items"] if i["id"] not in was]
    removed = [i["label"] for i in before["items"] if i["id"] not in now]
    changed = [
        i["label"] for i in after["items"] if i["id"] in was and _item_text(was[i["id"]]) != _item_text(i)
    ]
    if added:
        out.append("added " + ", ".join(added))
    if removed:
        out.append("removed " + ", ".join(removed))
    if changed:
        out.append("edited " + ", ".join(changed))

    def order(u):
        return [i["id"] for i in u["items"] if i["id"] in was and i["id"] in now]

    if not added and not removed and order(before) != order(after):
        out.append("items reordered")
    if before["lessons"] != after["lessons"]:
        out.append("lessons changed")
    return out


def draft_changes(db: DbSession) -> list[dict]:
    d = draft_version(db)
    if not d:
        return []
    live = docs(db, None)
    out = []
    for doc in db.scalars(select(ContentDoc).where(ContentDoc.version_id == d.id, ContentDoc.kind == "unit")):
        before = live.get(("unit", doc.key))
        lines = diff_unit(before.data if before else None, doc.data)
        if lines:
            out.append({"unit": doc.key, "title": doc.data["title"], "changes": lines, "by": doc.updated_by})
    return out


# --- Content packs (CNT-02): the same shape as packages/content/scripts/packs.js ---------


def ships_on(channel: str, unit: dict) -> bool:
    return unit["status"] == "ready" or (channel == "preview" and unit["status"] == "draft")


def asset_problems(db: DbSession, current: dict) -> list[str]:
    """Production packs can't include unapproved assets (CNT-03), uploaded pictures included."""
    out = []
    cat = current[("catalogue", "catalogue")].data
    for s in cat["subjects"]:
        for entry in s["units"]:
            u = current.get(("unit", entry["id"]))
            if not u or not ships_on("production", u.data):
                continue
            used = {i.get("image") for i in u.data["items"] if i.get("image")}
            man = current.get(("assets", entry["id"]))
            for a in man.data["assets"] if man else []:
                if a["id"] not in used:
                    continue
                if a["path"].startswith(UPLOAD_PREFIX):
                    up = db.get(ContentAsset, a["path"][len(UPLOAD_PREFIX) :])
                    if not up or up.approval != "approved":
                        out.append(f'{entry["id"]}: uploaded picture "{a["id"]}" isn\'t approved yet')
                elif a["review_status"] != "approved":
                    out.append(f'{entry["id"]}: asset "{a["id"]}" is {a["review_status"]}')
    return out


def build_packs(current: dict, channel: str, release: str) -> tuple[dict, list[tuple[str, str]]]:
    cat = current[("catalogue", "catalogue")].data
    files, packs = [], []
    for s in cat["subjects"]:
        ships = []
        for entry in s["units"]:
            u = current.get(("unit", entry["id"]))
            if u and ships_on(channel, u.data):
                ships.append((entry, u.data))
        if not ships:
            continue
        ids = [u["id"] for _, u in ships]
        body = {
            "schema": "pack/1",
            "subject": {**s, "units": [e for e in s["units"] if e["id"] in ids]},
            "units": [u for _, u in ships],
            "assets": {
                uid: (
                    current[("assets", uid)].data
                    if ("assets", uid) in current
                    else {"schema": "assets/1", "assets": []}
                )
                for uid in ids
            },
        }
        h = hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]
        text = json.dumps({**body, "release": release, "hash": h}, ensure_ascii=False)
        name = f"{s['id']}.{h}.json"
        files.append((name, text))
        packs.append({"subject": s["id"], "hash": h, "bytes": len(text.encode()), "file": name, "units": ids})
    manifest = {"schema": "packs/1", "release": release, "channel": channel, "packs": packs}
    return manifest, files


def release_name(version: int, now: datetime | None = None) -> str:
    now = now or datetime.now(UTC)
    return f"{now:%Y.%m}.cms{version}"


def publish_packs(storage, current: dict, release: str) -> list[str]:
    """Packs first, manifest last, so a device never sees a manifest pointing at a missing pack."""
    done = []
    for channel in ("production", "preview"):
        manifest, files = build_packs(current, channel, release)
        for name, text in files:
            storage.put_key(f"packs/{name}", text.encode())
            done.append(name)
        storage.put_key(manifest_key(channel), json.dumps(manifest, indent=2).encode())
        done.append(f"manifest-{channel}.json")
    return done
