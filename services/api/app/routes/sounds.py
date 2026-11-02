"""LES-19: a grown-up records each letter sound once; every family device plays it in lessons.
The recording is an ordinary voice clip (routes/media.py, consent scope "voice"); this keeps
which clip belongs to which sound. A replaced clip is deleted 30 days later (SAF-05)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..models import Family, MediaAsset, User
from ..privacy import release_media
from ..schemas import SoundIn
from ..security import current_user, membership
from .families import require_consent

router = APIRouter()

LETTERS = list("abcdefghijklmnopqrstuvwxyz")
DIGRAPHS = ["sh", "ch", "th", "ng", "ck", "ee", "oo", "ai", "oa", "ar"]
SOUNDS = LETTERS + DIGRAPHS  # mirrors packages/domain/src/sounds.js


@router.get("/families/{family_id}/sounds")
def list_sounds(family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    membership(db, user, family_id)
    return {"sounds": db.get(Family, family_id).sounds or {}, "all": SOUNDS}


@router.put("/families/{family_id}/sounds/{sound}")
def put_sound(
    family_id: str,
    sound: str,
    body: SoundIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    membership(db, user, family_id, write=True)
    require_consent(db, family_id)
    if sound not in SOUNDS:
        raise HTTPException(404, "Not a sound on the list")
    fam = db.get(Family, family_id)
    if body.media_id:
        m = db.get(MediaAsset, body.media_id)
        if not m or m.family_id != family_id or m.kind != "voice":
            raise HTTPException(422, "Record the sound first")
        m.released_at = None
    sounds = dict(fam.sounds or {})
    old = sounds.get(sound)
    if body.media_id:
        sounds[sound] = body.media_id
    else:
        sounds.pop(sound, None)  # back to the device voice
    fam.sounds = sounds
    db.flush()
    if old and old != body.media_id:
        release_media(db, family_id, {old}, utcnow())
    db.commit()
    return {"sounds": sounds}
