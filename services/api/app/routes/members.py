"""Grown-ups in a family (concept report §4.3): a second parent or guardian with equal
access, or a carer who can only view progress. Invited by email; the invitation link
also signs them in, so it works like a magic link for that address only."""

import secrets
from datetime import timedelta
from urllib.parse import urlencode

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..mailer import send_invite
from ..models import Family, FamilyMember, Invite, User
from ..schemas import InviteIn, VerifyIn
from ..security import aware, current_user, hash_token, membership, start_session
from ..settings import get_settings
from ..tasks import later
from .auth import user_for_email

router = APIRouter()
MANAGERS = {"owner", "parent"}


@router.get("/families/{family_id}/members")
def members(family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> dict:
    membership(db, user, family_id)
    rows = db.execute(
        select(FamilyMember, User)
        .join(User, User.id == FamilyMember.user_id)
        .where(FamilyMember.family_id == family_id)
    ).all()
    pending = db.scalars(
        select(Invite).where(
            Invite.family_id == family_id,
            Invite.accepted_at.is_(None),
            Invite.cancelled_at.is_(None),
            Invite.expires_at > utcnow(),
        )
    ).all()
    # FAM-05: every invitation is logged (kept until 30 days after it expires, see privacy.purge).
    log = db.execute(
        select(Invite, User.name, User.email)
        .join(User, User.id == Invite.invited_by)
        .where(Invite.family_id == family_id)
        .order_by(Invite.created_at.desc())
        .limit(30)
    ).all()
    return {
        "members": [
            {"user_id": u.id, "name": u.name, "email": u.email, "role": m.role, "you": u.id == user.id}
            for m, u in rows
        ],
        "invites": [
            {"id": i.id, "email": i.email, "role": i.role, "expires_at": aware(i.expires_at).isoformat()}
            for i in pending
        ],
        "history": [invite_log(i, name or email.split("@")[0]) for i, name, email in log],
    }


def invite_status(i: Invite) -> str:
    if i.accepted_at:
        return "accepted"
    if i.cancelled_at:
        return "cancelled"
    if aware(i.expires_at) <= utcnow():
        return "expired"
    return "pending"


def invite_log(i: Invite, by: str) -> dict:
    when = lambda d: aware(d).isoformat() if d else None  # noqa: E731
    return {
        "id": i.id,
        "email": i.email,
        "role": i.role,
        "invited_by": by,
        "status": invite_status(i),
        "created_at": when(i.created_at),
        "resent_at": when(i.resent_at),
        "accepted_at": when(i.accepted_at),
        "expires_at": when(i.expires_at),
    }


@router.post("/families/{family_id}/invites", status_code=201)
def invite(
    family_id: str,
    body: InviteIn,
    tasks: BackgroundTasks,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    m = membership(db, user, family_id)
    if m.role not in MANAGERS:
        raise HTTPException(403, "Only parents can invite grown-ups")
    email = body.email.strip().lower()
    already = db.scalar(
        select(FamilyMember)
        .join(User, User.id == FamilyMember.user_id)
        .where(FamilyMember.family_id == family_id, User.email == email)
    )
    if already:
        raise HTTPException(409, "That grown-up is already in the family")
    s = get_settings()
    token = secrets.token_urlsafe(32)
    inv = Invite(
        family_id=family_id,
        email=email,
        role=body.role,
        token_hash=hash_token(token),
        invited_by=user.id,
        created_at=utcnow(),
        expires_at=utcnow() + timedelta(days=s.invite_days),
    )
    db.add(inv)
    db.commit()
    fam = db.get(Family, family_id)
    link = f"{s.web_url}/invite?{urlencode({'token': token})}"
    later(tasks, send_invite, email, link, user.name or "A parent", fam.name, body.role)
    return {"id": inv.id, "email": email, "role": body.role, "expires_at": aware(inv.expires_at).isoformat()}


@router.delete("/families/{family_id}/invites/{invite_id}", status_code=204)
def cancel_invite(
    family_id: str, invite_id: int, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    m = membership(db, user, family_id)
    inv = db.get(Invite, invite_id)
    if m.role not in MANAGERS or not inv or inv.family_id != family_id:
        raise HTTPException(404, "Invitation not found")
    inv.cancelled_at = utcnow()  # kept in the log
    db.commit()


@router.post("/families/{family_id}/invites/{invite_id}/resend")
def resend_invite(
    family_id: str,
    invite_id: int,
    tasks: BackgroundTasks,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    """FAM-05: an invitation that ran out (or got lost) gets a fresh link for another 7 days."""
    m = membership(db, user, family_id)
    inv = db.get(Invite, invite_id)
    if m.role not in MANAGERS or not inv or inv.family_id != family_id:
        raise HTTPException(404, "Invitation not found")
    if inv.accepted_at:
        raise HTTPException(409, "That invitation was already accepted")
    s = get_settings()
    token = secrets.token_urlsafe(32)
    inv.token_hash = hash_token(token)
    inv.expires_at = utcnow() + timedelta(days=s.invite_days)
    inv.resent_at = utcnow()
    inv.cancelled_at = None
    db.commit()
    fam = db.get(Family, family_id)
    link = f"{s.web_url}/invite?{urlencode({'token': token})}"
    later(tasks, send_invite, inv.email, link, user.name or "A parent", fam.name, inv.role)
    return invite_log(inv, user.name or user.email.split("@")[0])


@router.delete("/families/{family_id}/members/{user_id}", status_code=204)
def remove_member(
    family_id: str, user_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    """Parents can remove other grown-ups; anyone but the owner can leave. The owner stays."""
    m = membership(db, user, family_id)
    target = db.scalar(
        select(FamilyMember).where(FamilyMember.family_id == family_id, FamilyMember.user_id == user_id)
    )
    if not target:
        raise HTTPException(404, "Not in this family")
    if target.role == "owner":
        raise HTTPException(403, "The family owner can't be removed")
    if user_id != user.id and m.role not in MANAGERS:
        raise HTTPException(403, "Only parents can remove grown-ups")
    db.delete(target)
    db.commit()


@router.post("/invites/accept")
def accept(
    body: VerifyIn, request: Request, response: Response, db: DbSession = Depends(get_session)
) -> dict:
    """Accept an invitation: joins the family and signs in as the invited address."""
    inv = db.scalar(select(Invite).where(Invite.token_hash == hash_token(body.token)))
    if not inv or inv.accepted_at or inv.cancelled_at or aware(inv.expires_at) <= utcnow():
        raise HTTPException(400, "This invitation has expired or was already used. Ask for a new one.")
    user, _ = user_for_email(db, inv.email)
    exists = db.scalar(
        select(FamilyMember).where(FamilyMember.family_id == inv.family_id, FamilyMember.user_id == user.id)
    )
    if not exists:
        db.add(FamilyMember(family_id=inv.family_id, user_id=user.id, role=inv.role))
    inv.accepted_at = utcnow()
    db.commit()
    start_session(db, user, response, request)
    return {"family_id": inv.family_id, "role": inv.role}
