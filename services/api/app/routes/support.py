"""HLP-02: contact support from the grown-up zone. Stored with a reference, emailed to support,
and confirmed to the grown-up. Diagnostics are what the app chose to send: version, device
and recent error codes, never children's names, media or progress."""

import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from .. import mailer
from ..db import get_session, utcnow
from ..models import FamilyMember, Learner, SupportTicket, User
from ..schemas import SupportIn
from ..scrub import scrub_text
from ..security import current_user
from ..settings import get_settings

router = APIRouter()
PER_DAY = 5
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
DIAG_KEYS = {"app_version", "release", "device", "browser", "screen", "online", "errors", "storage"}


def new_ref(db: DbSession) -> str:
    while True:
        ref = "TB-" + "".join(secrets.choice(ALPHABET) for _ in range(5))
        if not db.scalar(select(SupportTicket.id).where(SupportTicket.ref == ref)):
            return ref


@router.post("/support", status_code=201)
def contact(body: SupportIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    today = db.scalar(
        select(func.count())
        .select_from(SupportTicket)
        .where(SupportTicket.user_id == user.id, SupportTicket.created_at > utcnow() - timedelta(days=1))
    )
    if today >= PER_DAY:
        raise HTTPException(429, "We've had 5 messages from you today. We'll reply to those first.")
    family_id = db.scalar(select(FamilyMember.family_id).where(FamilyMember.user_id == user.id).limit(1))
    names = list(db.scalars(select(Learner.name).where(Learner.family_id == family_id))) if family_id else []
    diag = None
    if body.diagnostics is not None:
        diag = {
            k: (
                [scrub_text(x, names, 120) for x in v][:10]
                if isinstance(v, list)
                else scrub_text(str(v), names, 120)
            )
            for k, v in body.diagnostics.items()
            if k in DIAG_KEYS
        }
    t = SupportTicket(
        ref=new_ref(db),
        family_id=family_id,
        user_id=user.id,
        topic=body.topic,
        subject=scrub_text(body.subject, names, 120),
        message=scrub_text(body.message, names, 4000),
        diagnostics=diag,
    )
    db.add(t)
    db.commit()
    s = get_settings()
    if s.support_email:
        lines = [f"From: {user.email} · topic: {t.topic}", f"Subject: {t.subject}", t.message]
        if diag:
            lines.append("Diagnostics: " + "; ".join(f"{k}={v}" for k, v in diag.items()))
        mailer.send_notice(s.support_email, f"[{t.ref}] {t.subject}", lines)
    mailer.send_notice(
        user.email,
        f"We got your message ({t.ref})",
        [
            f"Thanks for writing to Trailbuddies. Your reference is {t.ref}.",
            "We usually reply within two working days. Just reply to this email to add anything.",
        ],
    )
    return {"ref": t.ref}
