"""Sessions and access checks. The cookie carries a random token; the database keeps only
its SHA-256, so a leaked database can't be used to sign in."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Cookie, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from .db import get_session, utcnow
from .ids import ulid
from .models import FamilyMember, Session, User
from .settings import get_settings

COOKIE = "tb_session"
WRITE_ROLES = {"owner", "parent", "carer"}


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def aware(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; treat them as UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def start_session(db: DbSession, user: User, response: Response) -> None:
    s = get_settings()
    token = secrets.token_urlsafe(32)
    now = utcnow()
    db.add(
        Session(
            id=ulid(),
            user_id=user.id,
            token_hash=hash_token(token),
            created_at=now,
            last_seen_at=now,
            expires_at=now + timedelta(days=s.session_days),
        )
    )
    db.commit()
    response.set_cookie(
        COOKIE,
        token,
        max_age=s.session_days * 86400,
        httponly=True,
        secure=s.cookie_secure,
        samesite="lax",
        path="/",
    )


def end_session(db: DbSession, token: str | None, response: Response) -> None:
    if token:
        row = db.scalar(select(Session).where(Session.token_hash == hash_token(token)))
        if row:
            db.delete(row)
            db.commit()
    response.delete_cookie(COOKIE, path="/")


def current_user(
    request: Request,
    db: DbSession = Depends(get_session),
    tb_session: str | None = Cookie(default=None),
) -> User:
    """FastAPI dependency: the signed-in grown-up, or 401. Sessions slide forward daily."""
    if not tb_session:
        raise HTTPException(401, "Not signed in")
    row = db.scalar(select(Session).where(Session.token_hash == hash_token(tb_session)))
    now = utcnow()
    if not row or aware(row.expires_at) <= now:
        raise HTTPException(401, "Not signed in")
    if now - aware(row.last_seen_at) > timedelta(days=1):
        row.last_seen_at = now
        row.expires_at = now + timedelta(days=get_settings().session_days)
        db.commit()
    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(401, "Not signed in")
    request.state.user_id = user.id
    return user


def membership(db: DbSession, user: User, family_id: str, write: bool = False) -> FamilyMember:
    """The user's role in a family, or 404 (never reveal that another family exists)."""
    m = db.scalar(
        select(FamilyMember).where(FamilyMember.family_id == family_id, FamilyMember.user_id == user.id)
    )
    if not m:
        raise HTTPException(404, "Family not found")
    if write and m.role not in WRITE_ROLES:
        raise HTTPException(403, "This role can only view progress")
    return m
