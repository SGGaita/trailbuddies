"""Grown-ups' photos and voice clips (BLD-15, SAF-02).

1. ``POST /families/{id}/media`` reserves an id and returns a short-lived upload URL.
2. The device uploads the file straight to storage.
3. ``POST /families/{id}/media/{media_id}/complete`` makes the server read the file back and
   check it: the right kind of file, small enough, and for photos no GPS data. Anything that
   fails is deleted and refused with a reason.
4. ``GET /families/{id}/media/{media_id}`` redirects a family member to a short-lived URL.

Photos and recordings need the family's optional consent ("photos" / "voice").
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..media_check import Rejected, check_photo, check_voice
from ..models import MediaAsset, User
from ..schemas import MediaIn
from ..security import current_user, membership
from ..storage import LocalStorage, get_storage
from .families import latest_consent, require_consent

router = APIRouter()

LIMITS = {
    "photo": (2_000_000, {"image/jpeg", "image/png", "image/webp"}),
    "voice": (1_000_000, {"audio/wav", "audio/webm", "audio/ogg", "audio/mp4"}),
}
SCOPE = {"photo": "photos", "voice": "voice"}


def media_out(m: MediaAsset) -> dict:
    return {"id": m.id, "kind": m.kind, "content_type": m.content_type, "bytes": m.bytes, "status": m.status}


def owned(db: DbSession, family_id: str, media_id: str) -> MediaAsset:
    m = db.get(MediaAsset, media_id)
    if not m or m.family_id != family_id:
        raise HTTPException(404, "Not found")
    return m


@router.post("/families/{family_id}/media", status_code=201)
def start_upload(
    family_id: str,
    body: MediaIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
) -> dict:
    membership(db, user, family_id, write=True)
    require_consent(db, family_id)
    consent = latest_consent(db, family_id)
    if not (consent.scopes or {}).get(SCOPE[body.kind]):
        raise HTTPException(
            403, {"code": "consent_needed", "scope": SCOPE[body.kind], "message": "Turn this on first."}
        )
    max_bytes, types = LIMITS[body.kind]
    ctype = body.content_type.split(";")[0].strip().lower()
    if ctype not in types:
        raise HTTPException(422, {"code": "bad_type", "message": "That kind of file can't be used."})
    if body.bytes > max_bytes:
        raise HTTPException(413, {"code": "too_big", "message": "That file is too large."})
    m = db.get(MediaAsset, body.id)
    if m and m.family_id != family_id:
        raise HTTPException(409, "id already used")
    if m and m.status == "ready":
        return {**media_out(m), "upload": None}
    if not m:
        m = MediaAsset(
            id=body.id,
            family_id=family_id,
            kind=body.kind,
            content_type=ctype,
            bytes=body.bytes,
            created_by=user.id,
        )
        db.add(m)
    else:  # a retry: same file, maybe a new size
        m.kind, m.content_type, m.bytes, m.status, m.reject_code = (
            body.kind,
            ctype,
            body.bytes,
            "pending",
            None,
        )
    db.commit()
    url = storage.upload_url(m.id, ctype)
    return {**media_out(m), "upload": {"url": url, "method": "PUT", "headers": {"Content-Type": ctype}}}


@router.post("/families/{family_id}/media/{media_id}/complete")
def finish_upload(
    family_id: str,
    media_id: str,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
) -> dict:
    membership(db, user, family_id, write=True)
    m = owned(db, family_id, media_id)
    if m.status == "ready":
        return media_out(m)
    max_bytes, _ = LIMITS[m.kind]
    data = storage.get(m.id, max_bytes)
    if data is None:
        raise HTTPException(409, {"code": "not_uploaded", "message": "The file hasn't arrived yet."})
    try:
        if len(data) > max_bytes:
            raise Rejected("too_big", "That file is too large.")
        real = check_photo(data) if m.kind == "photo" else check_voice(data)
    except Rejected as r:
        storage.delete(m.id)
        m.status, m.reject_code, m.checked_at = "rejected", r.code, utcnow()
        db.commit()
        raise HTTPException(422, {"code": r.code, "message": r.message}) from None
    m.status, m.content_type, m.bytes, m.checked_at = "ready", real, len(data), utcnow()
    db.commit()
    return media_out(m)


@router.get("/families/{family_id}/media/{media_id}")
def open_media(
    family_id: str,
    media_id: str,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
):
    membership(db, user, family_id)
    m = owned(db, family_id, media_id)
    if m.status != "ready":
        raise HTTPException(404, "Not ready")
    return RedirectResponse(
        storage.download_url(m.id), status_code=307, headers={"Cache-Control": "no-store"}
    )


# Local backend only: the signed URLs above point here.
def local_storage(storage=Depends(get_storage)) -> LocalStorage:
    if not isinstance(storage, LocalStorage):
        raise HTTPException(404, "Not found")
    return storage


@router.put("/media/blob/{media_id}", status_code=204)
async def put_blob(
    media_id: str, exp: int, sig: str, request: Request, storage: LocalStorage = Depends(local_storage)
) -> Response:
    if not storage.check(media_id, "PUT", exp, sig):
        raise HTTPException(403, "Link expired")
    data = b""
    async for chunk in request.stream():
        data += chunk
        if len(data) > 2_000_000:
            raise HTTPException(413, "Too large")
    storage.put(media_id, data)
    return Response(status_code=204)


@router.get("/media/blob/{media_id}")
def get_blob(media_id: str, exp: int, sig: str, storage: LocalStorage = Depends(local_storage)):
    if not storage.check(media_id, "GET", exp, sig) or not storage.path(media_id).exists():
        raise HTTPException(404, "Not found")
    return FileResponse(storage.path(media_id), headers={"Cache-Control": "private, max-age=600"})
