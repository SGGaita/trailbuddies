"""Closed beta tools: invite codes (cohorts for feature flags) and grown-ups' feedback.
Feedback is grown-up only; children's names in it are replaced before it is stored."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..flags import flags_for, redeem
from ..models import Family, Feedback, Learner, User
from ..schemas import CodeIn, FeedbackIn
from ..scrub import scrub_text
from ..security import current_user, membership

router = APIRouter()
FEEDBACK_PER_DAY = 20


@router.get("/families/{family_id}/flags")
def get_flags(family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    membership(db, user, family_id)
    fam = db.get(Family, family_id)
    return {"cohorts": fam.cohorts or [], "flags": flags_for(db, fam)}


@router.post("/families/{family_id}/beta")
def join_beta(
    family_id: str, body: CodeIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    membership(db, user, family_id, write=True)
    fam = db.get(Family, family_id)
    if not redeem(db, fam, body.code):
        raise HTTPException(404, "That invite code can't be used. Check it or ask us for a new one.")
    db.commit()
    return {"cohorts": fam.cohorts, "flags": flags_for(db, fam)}


@router.post("/families/{family_id}/feedback", status_code=201)
def send_feedback(
    family_id: str, body: FeedbackIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    membership(db, user, family_id)
    today = db.scalar(
        select(func.count())
        .select_from(Feedback)
        .where(Feedback.user_id == user.id, Feedback.created_at > utcnow() - timedelta(days=1))
    )
    if today >= FEEDBACK_PER_DAY:
        raise HTTPException(
            429, "Thank you! That's a lot of feedback for one day. Please send more tomorrow."
        )
    names = list(db.scalars(select(Learner.name).where(Learner.family_id == family_id)))
    message = scrub_text(body.message, names, limit=1000)
    db.add(
        Feedback(
            family_id=family_id,
            user_id=user.id,
            kind=body.kind,
            message=message,
            screen=body.screen,
            version=body.version,
        )
    )
    db.commit()
    return {"kind": body.kind, "message": message}
