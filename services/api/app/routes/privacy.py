"""SAF-03 export and SAF-04 delete. Only the family's owner or a parent can export; only the
owner can delete. Deleting needs the link sent by email, then waits 7 days so it can be undone."""

import secrets
from datetime import timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from .. import mailer
from ..db import get_session, utcnow
from ..ids import ulid
from ..models import DataExport, Family, FamilyDeletion, User
from ..privacy import EXPORT_DAYS, UNDO_DAYS, build_export, export_key
from ..schemas import TokenIn
from ..security import aware, current_user, hash_token, membership
from ..settings import get_settings
from ..storage import get_storage

router = APIRouter()
EXPORTS_PER_DAY = 3
DELETE_LINK_HOURS = 24


def export_out(e: DataExport) -> dict:
    return {
        "id": e.id,
        "status": e.status,
        "bytes": e.bytes,
        "created_at": aware(e.created_at).isoformat(),
        "expires_at": aware(e.expires_at).isoformat(),
    }


def parent_only(m) -> None:
    if m.role not in {"owner", "parent"}:
        raise HTTPException(403, "Only a parent can do this")


@router.get("/families/{family_id}/exports")
def list_exports(family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    parent_only(membership(db, user, family_id))
    rows = db.scalars(
        select(DataExport)
        .where(DataExport.family_id == family_id, DataExport.expires_at > utcnow())
        .order_by(DataExport.created_at.desc())
    )
    return {"exports": [export_out(e) for e in rows]}


@router.post("/families/{family_id}/exports", status_code=201)
def request_export(
    family_id: str,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
) -> dict:
    """Build the ZIP now (it's small: JSON plus a family's photos and clips) and email the link."""
    parent_only(membership(db, user, family_id))
    today = db.scalar(
        select(func.count())
        .select_from(DataExport)
        .where(DataExport.family_id == family_id, DataExport.created_at > utcnow() - timedelta(days=1))
    )
    if today >= EXPORTS_PER_DAY:
        raise HTTPException(429, "You can download your data 3 times a day. Please try again tomorrow.")
    fam = db.get(Family, family_id)
    token = secrets.token_urlsafe(32)
    e = DataExport(
        id=ulid(),
        family_id=family_id,
        requested_by=user.id,
        token_hash=hash_token(token),
        created_at=utcnow(),
        expires_at=utcnow() + timedelta(days=EXPORT_DAYS),
    )
    data = build_export(db, storage, fam)
    storage.put_key(export_key(e.id), data, "application/zip")
    e.bytes = len(data)
    db.add(e)
    db.commit()
    s = get_settings()
    link = f"{s.web_url}/api/exports/{e.id}/download?{urlencode({'token': token})}"
    mailer.send_notice(
        user.email,
        "Your Trailbuddies data is ready",
        [
            "Here is everything Trailbuddies keeps about your family, as a ZIP file.",
            f"The link works for {EXPORT_DAYS} days. After that the file is deleted.",
            "If you didn't ask for this, please tell us at privacy@trailbuddies.africa.",
        ],
        link,
        "Download your data",
    )
    return export_out(e)


@router.get("/exports/{export_id}/download")
def download_export(
    export_id: str, token: str, db: DbSession = Depends(get_session), storage=Depends(get_storage)
):
    """The emailed link. The token is the permission, so it works in any browser."""
    e = db.get(DataExport, export_id)
    if (
        not e
        or not secrets.compare_digest(e.token_hash, hash_token(token))
        or aware(e.expires_at) <= utcnow()
    ):
        raise HTTPException(404, "This download link has expired. Ask for a new one in Settings.")
    name = f"trailbuddies-data-{aware(e.created_at).date().isoformat()}.zip"
    url = storage.key_download_url(export_key(e.id), name)
    if url:
        return RedirectResponse(url, status_code=307, headers={"Cache-Control": "no-store"})
    data = storage.get_key(export_key(e.id))
    if data is None:
        raise HTTPException(404, "This download link has expired. Ask for a new one in Settings.")
    return Response(
        data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{name}"', "Cache-Control": "no-store"},
    )


@router.post("/families/{family_id}/deletion", status_code=202)
def request_deletion(
    family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    m = membership(db, user, family_id)
    if m.role != "owner":
        raise HTTPException(403, "Only the family's owner can delete the family")
    token = secrets.token_urlsafe(32)
    row = db.get(FamilyDeletion, family_id)
    if row and row.confirmed_at:
        raise HTTPException(409, "This family is already being deleted")
    if not row:
        row = FamilyDeletion(family_id=family_id, requested_by=user.id)
        db.add(row)
    row.token_hash = hash_token(token)
    row.requested_at = utcnow()
    row.token_expires_at = utcnow() + timedelta(hours=DELETE_LINK_HOURS)
    db.commit()
    link = f"{get_settings().web_url}/delete?{urlencode({'token': token})}"
    mailer.send_notice(
        user.email,
        "Confirm: delete your Trailbuddies family",
        [
            "You asked to delete your family and everything Trailbuddies keeps about it: grown-ups, "
            "learner profiles, progress, custom lessons, photos and voice clips.",
            f"Tap the button to confirm. The link works for {DELETE_LINK_HOURS} hours.",
            f"After you confirm, you have {UNDO_DAYS} days to change your mind in Settings.",
            "If you didn't ask for this, ignore this email and nothing will happen.",
        ],
        link,
        "Yes, delete our family",
    )
    return {"sent": True}


@router.post("/families/deletion/confirm")
def confirm_deletion(body: TokenIn, db: DbSession = Depends(get_session)) -> dict:
    row = db.scalar(select(FamilyDeletion).where(FamilyDeletion.token_hash == hash_token(body.token)))
    if not row or (not row.confirmed_at and aware(row.token_expires_at) <= utcnow()):
        raise HTTPException(404, "This link has expired. You can ask again in Settings.")
    if not row.confirmed_at:
        row.confirmed_at = utcnow()
        row.purge_after = utcnow() + timedelta(days=UNDO_DAYS)
        db.commit()
        who = db.get(User, row.requested_by)
        if who:
            mailer.send_notice(
                who.email,
                "Your Trailbuddies family will be deleted",
                [
                    f"Your family will be deleted on {aware(row.purge_after).date().isoformat()}.",
                    "Changed your mind? Open Trailbuddies, go to Settings and choose Keep our family.",
                ],
                get_settings().web_url + "/family/settings",
                "Open Settings",
            )
    return {"purge_after": aware(row.purge_after).isoformat()}


@router.post("/families/{family_id}/deletion/undo", status_code=204)
def undo_deletion(family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    parent_only(membership(db, user, family_id))
    row = db.get(FamilyDeletion, family_id)
    if not row:
        raise HTTPException(404, "Nothing to undo")
    db.delete(row)
    db.commit()
