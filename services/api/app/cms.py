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
import re
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
    "admin": {"edit", "review", "publish", "approve-asset", "roles", "moderate"},
    "editor": {"edit"},
    "reviewer": {"review", "approve-asset"},
    "moderator": {"moderate"},
}
OPEN = ("draft", "submitted", "approved")  # a version not yet published (CMS-06)
BADGES = ("badges", "built-in")  # the built-in badges document (CMS-08)
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

FILES = {
    "unit": "unit.json",
    "catalogue": "subject-catalogue.json",
    "assets": "asset-manifest.json",
    "badge": "badge.json",
}


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
    if kind == "badges":
        out = [f"badge {b.get('id', i)}: {e}" for i, b in enumerate(data) for e in problems("badge", b)]
        return out or [f'badge id "{d}" is used twice' for d in _dupes([b["id"] for b in data])]
    v = _validators()[kind]
    errors = [f"{_path(e)} {e.message}" for e in sorted(v.iter_errors(data), key=lambda e: list(e.path))]
    if not errors and kind == "unit":
        errors = unit_checks(data)
    if not errors and kind == "catalogue":
        units = [u["id"] for s in data["subjects"] for u in s["units"]]
        errors = [f'subject id "{d}" is used twice' for d in _dupes([s["id"] for s in data["subjects"]])]
        errors += [f'unit id "{d}" is used twice' for d in _dupes(units)]
    return errors


def slug(text: str) -> str:
    """packages/domain slug: lower-case words joined by hyphens, at most 40 characters."""
    import unicodedata

    t = unicodedata.normalize("NFKD", str(text or "").lower())
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:40].rstrip("-") if len(t) > 40 else t


def new_id(name: str, taken) -> str:
    """packages/domain newId: unique among `taken`, with -2, -3… when needed."""
    base = slug(name) or "item"
    out, n = base, 2
    while out in taken:
        out, n = f"{base}-{n}", n + 1
    return out


def new_unit(p: dict, src: dict | None = None) -> dict:
    """packages/domain newUnit: blank (four starter words) or a copy, always a draft."""
    uid = p["id"]
    if src:
        copy = json.loads(json.dumps(src))
        lessons = [{**lesson, "id": f"{uid}-{i + 1}"} for i, lesson in enumerate(copy["lessons"])]
        return {
            **copy,
            "id": uid,
            "subject": p["subject"],
            "title": p["title"],
            "band": p["band"],
            "status": "draft",
            "lessons": lessons,
        }
    words = [
        ("word-one", "word one", "1️⃣"),
        ("word-two", "word two", "2️⃣"),
        ("word-three", "word three", "3️⃣"),
        ("word-four", "word four", "4️⃣"),
    ]
    return {
        "schema": "unit/1",
        "id": uid,
        "subject": p["subject"],
        "title": p["title"],
        "band": p["band"],
        "status": "draft",
        "summary": f"Words about {p['title'].lower()}.",
        "items": [{"id": w, "label": label, "emoji": e} for w, label, e in words],
        "lessons": [
            {
                "id": f"{uid}-1",
                "title": "Meet the words",
                "focus": [w for w, _, _ in words],
                "exercises": [
                    {"type": "listen-tap"},
                    {"type": "listen-tap"},
                    {"type": "match"},
                    {"type": "name-it"},
                ],
            }
        ],
        "checkpoint": {"review": 4, "game": "jigsaw"},
    }


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
    """The version being worked on: a draft, submitted for review, or approved (CMS-06)."""
    return db.scalar(select(ContentVersion).where(ContentVersion.status.in_(OPEN)))


def authors(db: DbSession, draft: ContentVersion) -> list[str]:
    """Everyone who changed something in the draft: none of them may approve it (CMS-06)."""
    return sorted(set(db.scalars(select(ContentDoc.updated_by).where(ContentDoc.version_id == draft.id))))


def reopen(db: DbSession, draft: ContentVersion, who: str) -> None:
    """An edit to a submitted or approved draft sends it back to draft: it's reviewed again."""
    if draft.status != "draft":
        log(db, who, "draft_reopened", f"v{draft.id}", {"was": draft.status})
        draft.status = "draft"
        draft.approved_by = draft.approved_at = None


def docs(db: DbSession, upto: int | None, with_draft: bool = False) -> dict[tuple[str, str], ContentDoc]:
    """The content as of a version: for each document, its newest copy in a published version
    up to `upto` (and in the draft, when asked)."""
    versions = db.scalars(select(ContentVersion)).all()
    allowed = {v.id for v in versions if v.status == "published" and (upto is None or v.id <= upto)}
    if with_draft:
        allowed |= {v.id for v in versions if v.status in OPEN}
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
        top = db.scalar(select(ContentVersion.id).order_by(ContentVersion.id.desc()).limit(1))
        d = ContentVersion(id=(top or 0) + 1, status="draft", created_by=who)
        db.add(d)
        db.flush()
    else:
        reopen(db, d, who)
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


def diff_catalogue(before: dict | None, after: dict) -> list[str]:
    """The map's changes in plain words: trails added, renamed, archived or moved; unit order."""
    if not before:
        return []
    out = []
    was = {x["id"]: x for x in before["subjects"]}
    now = {x["id"]: x for x in after["subjects"]}
    for x in after["subjects"]:
        b = was.get(x["id"])
        if not b:
            out.append(f"new trail “{x['name']}”")
            continue
        if bool(b.get("archived")) != bool(x.get("archived")):
            out.append(f"{'archived' if x.get('archived') else 'restored'} “{x['name']}”")
        if (b["name"], b["place"]) != (x["name"], x["place"]):
            out.append(f"renamed “{b['name']}” to “{x['name']}” ({x['place']})")
        if b.get("art") != x.get("art"):
            out.append(f"new island art for “{x['name']}”")
        kept = [e["id"] for e in b["units"] if any(e["id"] == f["id"] for f in x["units"])]
        if [e["id"] for e in x["units"] if e["id"] in kept] != kept:
            out.append(f"units reordered in “{x['name']}”")
        added = [e["title"] for e in x["units"] if e["id"] not in {f["id"] for f in b["units"]}]
        if added:
            out.append(f"added {', '.join(added)} to “{x['name']}”")
    common = [i for i in was if i in now]
    if [i for i in now if i in common] != common:
        out.append("trails reordered on the map")
    return out


def diff_badges(before: list | None, after: list) -> list[str]:
    was = {b["id"]: b for b in before or []}
    out = []
    for b in after:
        old = was.get(b["id"])
        if not old:
            out.append(f"new badge “{b['name']}”")
        elif bool(old.get("retired")) != bool(b.get("retired")):
            out.append(f"{'retired' if b.get('retired') else 'brought back'} “{b['name']}”")
        elif old != b:
            out.append(f"edited “{b['name']}”")
    return out


def draft_changes(db: DbSession) -> list[dict]:
    """What the draft changes, one entry per unit, the map and the badges (the draft banner and
    the reviewer's list, CMS-06)."""
    d = draft_version(db)
    if not d:
        return []
    live = docs(db, None)
    out = []
    for doc in db.scalars(
        select(ContentDoc).where(ContentDoc.version_id == d.id).order_by(ContentDoc.kind, ContentDoc.key)
    ):
        before = live.get((doc.kind, doc.key))
        if doc.kind == "unit":
            lines = diff_unit(before.data if before else None, doc.data)
            title = doc.data["title"]
        elif doc.kind == "catalogue":
            lines, title = diff_catalogue(before.data if before else None, doc.data), "Map & trails"
            # Unit titles and bands are mirrored here from the unit; those show on the unit.
        elif doc.kind == "badges":
            lines, title = diff_badges(before.data if before else None, doc.data), "Badges"
        else:
            continue
        if lines:
            out.append(
                {"kind": doc.kind, "unit": doc.key, "title": title, "changes": lines, "by": doc.updated_by}
            )
    return out


# --- Content packs (CNT-02): the same shape as packages/content/scripts/packs.js ---------


def ships_on(channel: str, unit: dict) -> bool:
    return unit["status"] == "ready" or (channel == "preview" and unit["status"] == "draft")


def _upload_ok(db: DbSession, media_id: str) -> bool:
    up = db.get(ContentAsset, media_id)
    return bool(up and up.status == "ready" and up.approval == "approved")


def asset_problems(db: DbSession, current: dict) -> list[str]:
    """Production packs can't include unapproved assets (CNT-03): uploaded pictures, island
    art for trails children see (CMS-05) and badge art (CMS-08) included."""
    out = []
    cat = current[("catalogue", "catalogue")].data
    for s in cat["subjects"]:
        shipping = False
        for entry in s["units"]:
            u = current.get(("unit", entry["id"]))
            if not u or not ships_on("production", u.data):
                continue
            shipping = True
            used = {i.get("image") for i in u.data["items"] if i.get("image")}
            man = current.get(("assets", entry["id"]))
            for a in man.data["assets"] if man else []:
                if a["id"] not in used:
                    continue
                if a["path"].startswith(UPLOAD_PREFIX):
                    if not _upload_ok(db, a["path"][len(UPLOAD_PREFIX) :]):
                        out.append(f'{entry["id"]}: uploaded picture "{a["id"]}" isn\'t approved yet')
                elif a["review_status"] != "approved":
                    out.append(f'{entry["id"]}: asset "{a["id"]}" is {a["review_status"]}')
        if shipping and s.get("art") and not s.get("archived") and not _upload_ok(db, s["art"]):
            out.append(f"{s['id']}: the island art for “{s['name']}” isn't approved yet")
    badges = current.get(BADGES)
    for b in badges.data if badges else []:
        if b.get("art") and not b.get("retired") and not _upload_ok(db, b["art"]):
            out.append(f"badge {b['id']}: the art for “{b['name']}” isn't approved yet")
    return out


def _js(obj) -> str:
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


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
        # Byte for byte what `pnpm content packs:build` makes (JSON.stringify), so the imported
        # version gives exactly today's packs (CMS-02).
        h = hashlib.sha256(_js(body).encode()).hexdigest()[:16]
        text = _js({**body, "release": release, "hash": h})
        name = f"{s['id']}.{h}.json"
        files.append((name, text))
        packs.append({"subject": s["id"], "hash": h, "bytes": len(text.encode()), "file": name, "units": ids})
    # CMS-05: the map travels in the manifest (order, archived trails, art, new trails).
    shipping = {p["subject"]: p["units"] for p in packs}
    mapped = [
        {**s, "units": [e for e in s["units"] if e["id"] in shipping[s["id"]]]}
        for s in cat["subjects"]
        if s["id"] in shipping
    ]
    manifest = {"schema": "packs/1", "release": release, "channel": channel, "packs": packs, "map": mapped}
    badges = current.get(BADGES)
    if badges:  # CMS-08: the built-in badges, one small file every device downloads
        body = {"schema": "badges/1", "badges": badges.data}
        h = hashlib.sha256(_js(body).encode()).hexdigest()[:16]
        text = _js({**body, "release": release, "hash": h})
        name = f"badges.{h}.json"
        files.append((name, text))
        manifest["badges"] = {"hash": h, "bytes": len(text.encode()), "file": name}
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
