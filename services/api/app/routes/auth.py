"""Grown-up sign-in: email magic link and (when configured) Google. Children never sign in."""

import secrets
from datetime import timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..ids import ulid
from ..mailer import send_magic_link
from ..models import LoginToken, Session, User
from ..schemas import MagicLinkIn, MeIn, UserOut, VerifyIn
from ..security import COOKIE, aware, current_user, end_session, hash_token, start_session
from ..settings import get_settings
from ..tasks import later
from .families import families_for

router = APIRouter()

GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"
STATE_COOKIE = "tb_oauth_state"


def user_for_email(db: DbSession, email: str) -> tuple[User, bool]:
    email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user, False
    user = User(id=ulid(), email=email, name="")
    db.add(user)
    db.commit()
    return user, True


@router.get("/auth/config")
def auth_config() -> dict:
    s = get_settings()
    return {"google": s.google_enabled, "policy_version": s.policy_version}


@router.post("/auth/magic-link", status_code=202)
def magic_link(body: MagicLinkIn, tasks: BackgroundTasks, db: DbSession = Depends(get_session)) -> dict:
    """Always answers 202, so the response never reveals whether an address has an account."""
    s = get_settings()
    email = body.email.strip().lower()
    hour_ago = utcnow() - timedelta(hours=1)
    recent = db.scalar(
        select(func.count())
        .select_from(LoginToken)
        .where(LoginToken.email == email, LoginToken.created_at > hour_ago)
    )
    if recent < s.magic_links_per_hour:
        token = secrets.token_urlsafe(32)
        db.add(
            LoginToken(
                email=email,
                token_hash=hash_token(token),
                created_at=utcnow(),
                expires_at=utcnow() + timedelta(minutes=s.magic_link_minutes),
            )
        )
        db.commit()
        later(tasks, send_magic_link, email, f"{s.web_url}/auth/verify?{urlencode({'token': token})}")
    return {"sent": True}


@router.post("/auth/verify")
def verify(
    body: VerifyIn, request: Request, response: Response, db: DbSession = Depends(get_session)
) -> dict:
    row = db.scalar(select(LoginToken).where(LoginToken.token_hash == hash_token(body.token)))
    if not row or row.used or aware(row.expires_at) <= utcnow():
        raise HTTPException(400, "This link has expired or was already used. Ask for a new one.")
    row.used = True
    db.commit()
    user, new = user_for_email(db, row.email)
    start_session(db, user, response, request)
    return {"user": UserOut.of(user), "new": new}


@router.get("/auth/google/start")
def google_start() -> RedirectResponse:
    s = get_settings()
    if not s.google_enabled:
        raise HTTPException(404, "Google sign-in is not set up")
    state = secrets.token_urlsafe(24)
    params = {
        "client_id": s.google_client_id,
        "redirect_uri": f"{s.web_url}/api/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    r = RedirectResponse(f"{GOOGLE_AUTH}?{urlencode(params)}", status_code=302)
    r.set_cookie(STATE_COOKIE, state, max_age=600, httponly=True, secure=s.cookie_secure, samesite="lax")
    return r


def google_identity(code: str) -> dict:
    """Exchange the code and check the ID token with Google. Split out so tests can stub it."""
    s = get_settings()
    with httpx.Client(timeout=10) as http:
        tok = http.post(
            GOOGLE_TOKEN,
            data={
                "code": code,
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
                "redirect_uri": f"{s.web_url}/api/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        tok.raise_for_status()
        info = http.get(GOOGLE_TOKENINFO, params={"id_token": tok.json()["id_token"]})
        info.raise_for_status()
        return info.json()


@router.get("/auth/google/callback")
def google_callback(
    request: Request,
    code: str = "",
    state: str = "",
    tb_oauth_state: str | None = Cookie(default=None),
    db: DbSession = Depends(get_session),
) -> RedirectResponse:
    s = get_settings()
    fail = RedirectResponse(f"{s.web_url}/start/account?error=google", status_code=302)
    if not s.google_enabled or not code or not state or state != tb_oauth_state:
        return fail
    try:
        info = google_identity(code)
    except (httpx.HTTPError, KeyError, ValueError):
        return fail
    if info.get("aud") != s.google_client_id or str(info.get("email_verified")).lower() != "true":
        return fail
    # ONB-03: one account per person. A linked Google account signs in to its own account; the
    # first Google sign-in with an email that already has an account links the two.
    sub = str(info.get("sub") or "")[:64] or None
    user = db.scalar(select(User).where(User.google_sub == sub)) if sub else None
    if not user:
        user, _ = user_for_email(db, info["email"])
        if sub and not user.google_sub:
            user.google_sub = sub
    if not user.name and info.get("given_name"):
        user.name = str(info["given_name"])[:120]
    db.commit()
    r = RedirectResponse(f"{s.web_url}/auth/done", status_code=302)
    start_session(db, user, r, request)
    r.delete_cookie(STATE_COOKIE)
    return r


@router.post("/auth/logout")
def logout(
    response: Response, db: DbSession = Depends(get_session), tb_session: str | None = Cookie(default=None)
):
    end_session(db, tb_session, response)
    return {"ok": True}


@router.post("/auth/logout-all")
def logout_all(response: Response, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    """Sign out of every device: all of this grown-up's sessions end."""
    db.execute(delete(Session).where(Session.user_id == user.id))
    db.commit()
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> dict:
    return {"user": UserOut.of(user), "families": families_for(db, user)}


@router.patch("/me")
def update_me(body: MeIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> dict:
    user.name = body.name.strip()
    db.commit()
    return {"user": UserOut.of(user)}


__all__ = ["router", "COOKIE"]
