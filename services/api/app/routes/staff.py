"""The staff area at /admin (CMS-01…04): staff and roles, and the content admin.

- ``/admin/me``: the signed-in person's staff role, or 403.
- ``/admin/staff``: admins invite staff by email and change or remove their role.
- ``/admin/content``: the built-in catalogue as of the draft, with what changed.
- ``/admin/content/import``: an admin seeds version 1 from the files bundled in the web app.
- ``/admin/content/units/{id}``: read and save a unit (editors). Checked against the same JSON
  Schemas as the content CLI; problems come back by field.
- ``/admin/content/publish``: an admin publishes the draft as the next version; the content
  packs and manifests are rebuilt so devices download it (CNT-02).
- ``/admin/content/assets``: uploaded pictures; reviewers or admins approve them.
"""

from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session as DbSession

from .. import cms
from ..db import get_session, utcnow
from ..media_check import Rejected, check_photo
from ..models import AdminLog, ContentAsset, ContentDoc, ContentVersion, StaffMember, User
from ..schemas import (
    AssetDecisionIn,
    ContentAssetIn,
    ContentImportIn,
    MediaCompleteIn,
    PublishIn,
    StaffIn,
    StaffPatch,
    UnitSaveIn,
)
from ..security import aware, current_user
from ..settings import get_settings
from ..storage import get_storage
from .rewards import iso

router = APIRouter()
PHOTO_MAX = 2_000_000
PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}


class Staff:
    def __init__(self, user: User, role: str):
        self.user, self.role, self.email = user, role, user.email.lower()

    def need(self, action: str) -> None:
        if not cms.can(self.role, action):
            raise HTTPException(403, {"code": "role", "message": "Your role can't do that."})


def staff(user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> Staff:
    role = cms.role_of(db, user)
    if not role:
        raise HTTPException(403, "Only Trailbuddies staff can open this")
    m = db.get(StaffMember, user.email.lower())
    if m and (not m.seen_at or (utcnow() - aware(m.seen_at)).total_seconds() > 3600):
        m.seen_at = utcnow()
        db.commit()
    return Staff(user, role)


@router.get("/admin/me")
def me(s: Staff = Depends(staff)) -> dict:
    return {"email": s.email, "role": s.role, "can": sorted(cms.ROLE_CAN[s.role])}


# ---------- staff & roles (CMS-01) ----------


def staff_out(m: StaffMember | None, email: str, role: str, bootstrap: bool = False) -> dict:
    return {
        "email": email,
        "role": role,
        "name": m.name if m else None,
        "invited_by": m.invited_by if m else None,
        "seen_at": iso(m.seen_at) if m and m.seen_at else None,
        "bootstrap": bootstrap,
    }


@router.get("/admin/staff")
def list_staff(s: Staff = Depends(staff), db: DbSession = Depends(get_session)) -> dict:
    s.need("roles")
    rows = {m.email: m for m in db.scalars(select(StaffMember).order_by(StaffMember.created_at))}
    out = [staff_out(rows.pop(e, None), e, "admin", True) for e in sorted(get_settings().admins)]
    out += [staff_out(m, m.email, m.role) for m in rows.values()]
    log = db.scalars(select(AdminLog).order_by(AdminLog.at.desc()).limit(50)).all()
    return {
        "staff": out,
        "log": [
            {
                "id": x.id,
                "who": x.who,
                "action": x.action,
                "target": x.target,
                "detail": x.detail,
                "at": iso(x.at),
            }
            for x in log
        ],
    }


@router.post("/admin/staff", status_code=201)
def add_staff(body: StaffIn, s: Staff = Depends(staff), db: DbSession = Depends(get_session)) -> dict:
    s.need("roles")
    email = str(body.email).lower()
    if email in get_settings().admins or db.get(StaffMember, email):
        raise HTTPException(409, {"code": "exists", "message": "That person is already staff."})
    db.add(StaffMember(email=email, role=body.role, name=body.name, invited_by=s.email))
    cms.log(db, s.email, "staff_add", email, {"role": body.role})
    db.commit()
    # They sign in with the usual magic link at /admin; no separate account.
    return staff_out(db.get(StaffMember, email), email, body.role)


@router.patch("/admin/staff/{email}")
def change_role(
    email: str, body: StaffPatch, s: Staff = Depends(staff), db: DbSession = Depends(get_session)
) -> dict:
    s.need("roles")
    m = db.get(StaffMember, email.lower())
    if not m:
        raise HTTPException(404, "Not staff (people in TB_ADMIN_EMAILS are changed on Vercel)")
    was, m.role = m.role, body.role
    cms.log(db, s.email, "staff_role", m.email, {"from": was, "to": body.role})
    db.commit()
    return staff_out(m, m.email, m.role)


@router.delete("/admin/staff/{email}", status_code=204)
def remove_staff(email: str, s: Staff = Depends(staff), db: DbSession = Depends(get_session)) -> None:
    s.need("roles")
    m = db.get(StaffMember, email.lower())
    if not m:
        raise HTTPException(404, "Not staff")
    if m.email == s.email:
        raise HTTPException(422, {"code": "self", "message": "You can't remove yourself."})
    cms.log(db, s.email, "staff_remove", m.email, {"role": m.role})
    db.delete(m)
    db.commit()


# ---------- content (CMS-02) ----------


def summary(db: DbSession) -> dict:
    live = cms.live_version(db)
    draft = cms.draft_version(db)
    current = cms.docs(db, None, with_draft=True)
    cat = current.get(("catalogue", "catalogue"))
    edited = set()
    if draft:
        edited = set(
            db.scalars(
                select(ContentDoc.key).where(ContentDoc.version_id == draft.id, ContentDoc.kind == "unit")
            )
        )
    waiting = db.scalar(
        select(func.count())
        .select_from(ContentAsset)
        .where(ContentAsset.approval == "waiting", ContentAsset.status == "ready")
    )
    return {
        "imported": live is not None,
        "live": {
            "version": live.id,
            "published_at": iso(live.published_at),
            "by": live.published_by,
            "note": live.note,
        }
        if live
        else None,
        "draft": {"version": draft.id, "changes": cms.draft_changes(db), "created_by": draft.created_by}
        if draft
        else None,
        "subjects": [
            {
                "id": sub["id"],
                "name": sub["name"],
                "units": [
                    {
                        "id": e["id"],
                        "title": e["title"],
                        "band": e["band"],
                        "status": e["status"],
                        "has_content": ("unit", e["id"]) in current,
                        "items": len(current[("unit", e["id"])].data["items"])
                        if ("unit", e["id"]) in current
                        else 0,
                        "edited": e["id"] in edited,
                    }
                    for e in sub["units"]
                ],
            }
            for sub in (cat.data["subjects"] if cat else [])
        ],
        "assets_waiting": waiting or 0,
    }


@router.get("/admin/content")
def content(s: Staff = Depends(staff), db: DbSession = Depends(get_session)) -> dict:
    if not (cms.can(s.role, "edit") or cms.can(s.role, "approve-asset")):
        s.need("edit")
    return summary(db)


@router.post("/admin/content/import", status_code=201)
def import_content(
    body: ContentImportIn, s: Staff = Depends(staff), db: DbSession = Depends(get_session)
) -> dict:
    """CMS-02: version 1 is exactly the content files in the code (sent by the admin page from
    the web app's own bundle). Nothing is published to devices: they already have it."""
    s.need("publish")
    if db.scalar(select(ContentVersion.id).limit(1)):
        raise HTTPException(409, {"code": "imported", "message": "The content is already imported."})
    errs = [f"catalogue: {e}" for e in cms.problems("catalogue", body.catalogue)]
    listed = {e["id"]: e for sub in body.catalogue.get("subjects", []) for e in sub.get("units", [])}
    for u in body.units:
        errs += [f"{u.get('id', '?')}: {e}" for e in cms.problems("unit", u)]
        if u.get("id") not in listed:
            errs.append(f"{u.get('id', '?')}: not in the catalogue")
    for uid, man in body.assets.items():
        errs += [f"{uid} assets: {e}" for e in cms.problems("assets", man)]
    if errs:
        raise HTTPException(
            422, {"code": "invalid", "message": "The content didn't pass the checks.", "problems": errs[:50]}
        )
    now = utcnow()
    v = ContentVersion(
        id=1,
        status="published",
        note="Imported from the content files in the code",
        created_by=s.email,
        published_by=s.email,
        published_at=now,
    )
    db.add(v)
    db.flush()
    cms.put_doc(db, v, "catalogue", "catalogue", body.catalogue, s.email)
    for u in body.units:
        cms.put_doc(db, v, "unit", u["id"], u, s.email)
    for uid, man in body.assets.items():
        cms.put_doc(db, v, "assets", uid, man, s.email)
    cms.log(db, s.email, "content_import", "v1", {"units": len(body.units)})
    db.commit()
    return summary(db)


def unit_doc(db: DbSession, unit_id: str, with_draft: bool):
    current = cms.docs(db, None, with_draft=with_draft)
    return current.get(("unit", unit_id)), current.get(("assets", unit_id)), current


@router.get("/admin/content/export")
def export_content(s: Staff = Depends(staff), db: DbSession = Depends(get_session)) -> dict:
    """CMS-02: the published version as one file; `pnpm content export:apply <file>` writes it
    over the bundled copy in the code, so new installs start from today's content."""
    s.need("publish")
    live = cms.live_version(db)
    if not live:
        raise HTTPException(404, "Nothing is published yet")
    current = cms.docs(db, None)
    return {
        "schema": "content-export/1",
        "version": live.id,
        "release": live.release,
        "catalogue": current[("catalogue", "catalogue")].data,
        "units": [d.data for (k, _), d in current.items() if k == "unit"],
        "assets": {key: d.data for (k, key), d in current.items() if k == "assets"},
    }


@router.get("/admin/content/units/{unit_id}")
def get_unit(unit_id: str, s: Staff = Depends(staff), db: DbSession = Depends(get_session)) -> dict:
    if not (cms.can(s.role, "edit") or cms.can(s.role, "approve-asset")):
        s.need("edit")
    u, a, current = unit_doc(db, unit_id, True)
    if not u:
        raise HTTPException(404, "No content for that unit")
    live_u, _, _ = unit_doc(db, unit_id, False)
    ups = [x for x in (a.data["assets"] if a else []) if x["path"].startswith(cms.UPLOAD_PREFIX)]
    approvals = {
        x.id: x.approval
        for x in db.scalars(
            select(ContentAsset).where(
                ContentAsset.id.in_([x["path"][len(cms.UPLOAD_PREFIX) :] for x in ups])
            )
        )
    }
    return {
        "unit": u.data,
        "assets": a.data if a else {"schema": "assets/1", "assets": []},
        "published": live_u.data if live_u else None,
        "changes": cms.diff_unit(live_u.data if live_u else None, u.data) if live_u is not u else [],
        "uploads": approvals,
        "updated_by": u.updated_by,
        "updated_at": iso(u.updated_at),
    }


@router.put("/admin/content/units/{unit_id}")
def save_unit(
    unit_id: str, body: UnitSaveIn, s: Staff = Depends(staff), db: DbSession = Depends(get_session)
) -> dict:
    """CMS-03: saved to the draft; children keep the published version."""
    s.need("edit")
    old, old_assets, current = unit_doc(db, unit_id, True)
    if not old:
        raise HTTPException(404, "No content for that unit")
    unit = body.unit
    if (
        unit.get("id") != unit_id
        or unit.get("subject") != old.data["subject"]
        or unit.get("schema") != "unit/1"
    ):
        raise HTTPException(
            422,
            {
                "code": "invalid",
                "message": "A unit's id and subject can't change.",
                "problems": ["/id can't change"],
            },
        )
    if unit.get("status") != old.data["status"] and not cms.can(s.role, "publish"):
        raise HTTPException(
            403, {"code": "role", "message": "Only an admin can mark a unit ready or back to draft."}
        )
    errs = cms.problems("unit", unit)
    assets = (
        body.assets
        if body.assets is not None
        else (old_assets.data if old_assets else {"schema": "assets/1", "assets": []})
    )
    errs += [f"assets {e}" for e in cms.problems("assets", assets)]
    known = {a["id"] for a in assets.get("assets", [])}
    errs += [
        f'/items item "{i["id"]}": picture "{i["image"]}" isn\'t in the asset list'
        for i in unit.get("items", [])
        if i.get("image") and i["image"] not in known
    ]
    for a in assets.get("assets", []):
        if a.get("path", "").startswith(cms.UPLOAD_PREFIX):
            up = db.get(ContentAsset, a["path"][len(cms.UPLOAD_PREFIX) :])
            if not up or up.status != "ready" or up.approval in ("flagged", "refused"):
                errs.append(f'assets picture "{a["id"]}" can\'t be used')
    if errs:
        raise HTTPException(
            422, {"code": "invalid", "message": "Fix these before saving.", "problems": errs[:50]}
        )
    draft = cms.ensure_draft(db, s.email)
    cms.put_doc(db, draft, "unit", unit_id, unit, s.email)
    if body.assets is not None:
        cms.put_doc(db, draft, "assets", unit_id, assets, s.email)
    cat = current[("catalogue", "catalogue")].data
    new_cat = {
        **cat,
        "subjects": [
            {**sub, "units": [cms.sync_entry(e, unit) if e["id"] == unit_id else e for e in sub["units"]]}
            for sub in cat["subjects"]
        ],
    }
    if new_cat != cat:
        cms.put_doc(db, draft, "catalogue", "catalogue", new_cat, s.email)
    cms.log(
        db, s.email, "unit_save", unit_id, {"version": draft.id, "changes": cms.diff_unit(old.data, unit)}
    )
    db.commit()
    return get_unit(unit_id, s, db)


@router.delete("/admin/content/draft", status_code=204)
def discard_draft(s: Staff = Depends(staff), db: DbSession = Depends(get_session)) -> None:
    s.need("edit")
    d = cms.draft_version(db)
    if d:
        db.execute(delete(ContentDoc).where(ContentDoc.version_id == d.id))
        cms.log(db, s.email, "draft_discard", f"v{d.id}")
        db.delete(d)
        db.commit()


@router.post("/admin/content/publish")
def publish(
    body: PublishIn,
    s: Staff = Depends(staff),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
) -> dict:
    """An admin publishes the draft (reviewers' approve-and-publish comes in Sprint 13). An admin
    publishing their own changes must confirm it, and it's flagged in the log."""
    s.need("publish")
    d = cms.draft_version(db)
    if not d:
        raise HTTPException(409, {"code": "no_draft", "message": "There's nothing to publish."})
    authors = set(db.scalars(select(ContentDoc.updated_by).where(ContentDoc.version_id == d.id)))
    own = authors <= {s.email}
    if own and not body.confirm_own:
        raise HTTPException(
            409,
            {
                "code": "own",
                "message": "These are your own changes. Confirm to publish them without a second person.",
            },
        )
    current = cms.docs(db, None, with_draft=True)
    blocked = cms.asset_problems(db, current)
    if blocked:
        raise HTTPException(
            409, {"code": "assets", "message": "Some pictures aren't approved yet.", "problems": blocked}
        )
    # Uploaded pictures that were approved show as approved in the published manifests. The
    # packs get copies, so the stored documents are never changed by building them.
    approved = {a.id for a in db.scalars(select(ContentAsset).where(ContentAsset.approval == "approved"))}

    def mark(a: dict) -> dict:
        mid = a["path"][len(cms.UPLOAD_PREFIX) :] if a["path"].startswith(cms.UPLOAD_PREFIX) else None
        return {**a, "review_status": "approved"} if mid in approved else a

    packed = {
        k: SimpleNamespace(data={**doc.data, "assets": [mark(a) for a in doc.data["assets"]]})
        if k[0] == "assets"
        else doc
        for k, doc in current.items()
    }
    release = cms.release_name(d.id)
    cms.publish_packs(storage, packed, release)
    d.status, d.published_by, d.published_at, d.note, d.self_published, d.release = (
        "published",
        s.email,
        utcnow(),
        body.note,
        own,
        release,
    )
    cms.log(
        db,
        s.email,
        "content_publish",
        f"v{d.id}",
        {"release": release, "self_published": own, "note": body.note},
    )
    db.commit()
    return summary(db)


# ---------- uploaded pictures (CMS-03) ----------


def asset_out(a: ContentAsset) -> dict:
    return {
        "id": a.id,
        "status": a.status,
        "approval": a.approval,
        "label": a.label,
        "scan": a.scan,
        "uploaded_by": a.uploaded_by,
        "approved_by": a.approved_by,
        "created_at": iso(a.created_at),
    }


@router.post("/admin/content/assets", status_code=201)
def start_asset(
    body: ContentAssetIn,
    s: Staff = Depends(staff),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
) -> dict:
    s.need("edit")
    ctype = body.content_type.split(";")[0].strip().lower()
    if ctype not in PHOTO_TYPES:
        raise HTTPException(422, {"code": "bad_type", "message": "Pictures must be JPEG, PNG or WebP."})
    if body.bytes > PHOTO_MAX:
        raise HTTPException(413, {"code": "too_big", "message": "That picture is too large."})
    a = db.get(ContentAsset, body.id)
    if a and a.status == "ready":
        return {**asset_out(a), "upload": None}
    if not a:
        a = ContentAsset(
            id=body.id, content_type=ctype, bytes=body.bytes, label=body.label, uploaded_by=s.email
        )
        db.add(a)
    db.commit()
    url = storage.upload_url(a.id, ctype)
    return {**asset_out(a), "upload": {"url": url, "method": "PUT", "headers": {"Content-Type": ctype}}}


@router.post("/admin/content/assets/{asset_id}/complete")
def finish_asset(
    asset_id: str,
    body: MediaCompleteIn | None = None,
    s: Staff = Depends(staff),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
) -> dict:
    s.need("edit")
    a = db.get(ContentAsset, asset_id)
    if not a:
        raise HTTPException(404, "Not found")
    if a.status == "ready":
        return asset_out(a)
    data = storage.get(a.id, PHOTO_MAX)
    if data is None:
        raise HTTPException(409, {"code": "not_uploaded", "message": "The file hasn't arrived yet."})
    try:
        if len(data) > PHOTO_MAX:
            raise Rejected("too_big", "That picture is too large.")
        real = check_photo(data)  # also refuses GPS metadata (SAF-02)
    except Rejected as r:
        storage.delete(a.id)
        a.status = "rejected"
        db.commit()
        raise HTTPException(422, {"code": r.code, "message": r.message}) from None
    a.status, a.content_type, a.bytes = "ready", real, len(data)
    if body and body.scan:
        a.scan = body.scan.model_dump()
        if body.scan.flagged:
            a.approval = "flagged"  # never shown to children; a reviewer can still look
    cms.log(db, s.email, "asset_upload", a.id, {"approval": a.approval})
    db.commit()
    return asset_out(a)


@router.get("/admin/content/assets")
def list_assets(s: Staff = Depends(staff), db: DbSession = Depends(get_session)) -> dict:
    if not (cms.can(s.role, "edit") or cms.can(s.role, "approve-asset")):
        s.need("approve-asset")
    rows = db.scalars(
        select(ContentAsset)
        .where(ContentAsset.status == "ready")
        .order_by(ContentAsset.created_at.desc())
        .limit(100)
    )
    return {"assets": [asset_out(a) for a in rows]}


@router.post("/admin/content/assets/{asset_id}/decision")
def decide_asset(
    asset_id: str, body: AssetDecisionIn, s: Staff = Depends(staff), db: DbSession = Depends(get_session)
) -> dict:
    """A reviewer or admin approves an uploaded picture before children can see it. Staff never
    approve their own uploads unless they're an admin."""
    s.need("approve-asset")
    a = db.get(ContentAsset, asset_id)
    if not a or a.status != "ready":
        raise HTTPException(404, "Not found")
    if a.uploaded_by == s.email and s.role != "admin":
        raise HTTPException(403, {"code": "own", "message": "Someone else must approve your upload."})
    a.approval = "approved" if body.approve else "refused"
    a.approved_by, a.approved_at = s.email, utcnow()
    cms.log(db, s.email, "asset_" + a.approval, a.id, {"reason": body.reason} if body.reason else None)
    db.commit()
    return asset_out(a)


@router.get("/admin/content/assets/{asset_id}/file")
def staff_asset_file(
    asset_id: str,
    s: Staff = Depends(staff),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
):
    a = db.get(ContentAsset, asset_id)
    if not a or a.status != "ready":
        raise HTTPException(404, "Not found")
    return RedirectResponse(
        storage.download_url(a.id), status_code=307, headers={"Cache-Control": "no-store"}
    )


@router.get("/content/assets/{asset_id}")
def public_asset(asset_id: str, db: DbSession = Depends(get_session), storage=Depends(get_storage)):
    """An approved picture in published content: anyone (children's devices) can load it."""
    a = db.get(ContentAsset, asset_id)
    if not a or a.status != "ready" or a.approval != "approved":
        raise HTTPException(404, "Not found")
    return RedirectResponse(
        storage.download_url(a.id), status_code=307, headers={"Cache-Control": "public, max-age=600"}
    )
