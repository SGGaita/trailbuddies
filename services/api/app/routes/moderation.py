"""The safety team's moderation screen (M01, MOD-01…03): only for the emails in
``TB_ADMIN_EMAILS``. One queue of shares waiting for review, reported shares and flagged
uploads, oldest first; every action is logged with who, when and why."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from .. import cms
from ..db import get_session, utcnow
from ..models import MediaAsset, ModerationAction, ModerationItem, Share, ShareReport, User
from ..moderation import (
    hide_media,
    log,
    overdue,
    reason_text,
    restore_media,
    tell_creator,
    tell_reporters,
    tell_uploader,
)
from ..schemas import ModActionIn
from ..security import aware, current_user
from ..shares import fmt, photos_of
from ..storage import get_storage
from .rewards import iso
from .shares import state

router = APIRouter()

# Actions that settle an item. The others (restoring, warning) can follow on a closed one.
CLOSES = {
    "approve": "approved",
    "keep": "kept",
    "suspend_share": "removed",
    "suspend_creator": "removed",
    "dismiss": "dismissed",
}


def admin(user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> User:
    """CMS-01: moderators and admins (TB_ADMIN_EMAILS, or staff with the role)."""
    if not cms.can(cms.role_of(db, user), "moderate"):
        raise HTTPException(403, "Only the safety team can open this")
    return user


def item_out(db: DbSession, i: ModerationItem, now) -> dict:
    share = db.get(Share, i.share_id) if i.share_id else None
    media = db.get(MediaAsset, i.media_id) if i.media_id else None
    reasons = (
        dict(
            db.execute(
                select(ShareReport.reason, func.count())
                .where(ShareReport.share_id == i.share_id)
                .group_by(ShareReport.reason)
            ).all()
        )
        if share
        else {}
    )
    photos = [i.media_id] if media else sorted(photos_of(share.package)) if share else []
    statuses = dict(
        db.execute(select(MediaAsset.id, MediaAsset.status).where(MediaAsset.id.in_(photos))).all()
    )
    return {
        "id": i.id,
        "kind": i.kind,
        "reason": i.reason,
        "reason_text": reason_text(i.reason),
        "status": i.status,
        "outcome": i.outcome,
        "created_at": iso(i.created_at),
        "uploaded_at": iso(media.created_at if media else share.created_at if share else i.created_at),
        "overdue": overdue(i, now),
        "reports": sum(reasons.values()),
        "report_reasons": {k: v for k, v in reasons.items()},
        "photos": [{"id": p, "status": statuses.get(p, "missing")} for p in photos],
        "scan": media.scan if media else None,
        "share": {
            "id": share.id,
            "code": fmt(share.code),
            "kind": share.kind,
            "title": share.title,
            "status": state(share),
            "imports": share.imports,
            "package": share.package,
            "checklist": share.checklist,
        }
        if share
        else None,
    }


@router.get("/admin/moderation")
def queue(closed: bool = False, user: User = Depends(admin), db: DbSession = Depends(get_session)) -> dict:
    """MOD-01: open items oldest first (anything over 24 hours marked overdue), then the most
    recent decisions and the audit log."""
    now = utcnow()
    open_items = db.scalars(
        select(ModerationItem).where(ModerationItem.status == "open").order_by(ModerationItem.created_at)
    ).all()
    done = db.scalars(
        select(ModerationItem)
        .where(ModerationItem.status == "closed")
        .order_by(ModerationItem.closed_at.desc())
        .limit(30)
    ).all()
    audit = db.scalars(select(ModerationAction).order_by(ModerationAction.at.desc()).limit(50)).all()
    return {
        "items": [item_out(db, i, now) for i in open_items],
        "closed": [item_out(db, i, now) for i in done],
        "audit": [
            {
                "id": a.id,
                "item_id": a.item_id,
                "action": a.action,
                "target": a.target,
                "who": a.who,
                "why": a.why,
                "at": iso(a.at),
            }
            for a in audit
        ],
    }


@router.get("/admin/media/{media_id}")
def admin_media(
    media_id: str,
    user: User = Depends(admin),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
):
    """The safety team can see any file, hidden or flagged, to review it."""
    m = db.get(MediaAsset, media_id)
    if not m or m.status in ("pending", "rejected"):
        raise HTTPException(404, "Not found")
    return RedirectResponse(
        storage.download_url(m.id), status_code=307, headers={"Cache-Control": "no-store"}
    )


@router.post("/admin/moderation/{item_id}")
def act(
    item_id: str, body: ModActionIn, user: User = Depends(admin), db: DbSession = Depends(get_session)
) -> dict:
    """MOD-02: one action on one item, logged with who, when and why (MOD-03 emails follow)."""
    i = db.get(ModerationItem, item_id)
    if not i:
        raise HTTPException(404, "Not found")
    share = db.get(Share, i.share_id) if i.share_id else None
    a = body.action
    target = fmt(share.code) if share else (i.media_id or "")

    def need_share() -> Share:
        if not share:
            raise HTTPException(422, "This item has no share")
        return share

    if a == "approve":
        s = need_share()
        if s.status == "review":
            s.status = "live"
    elif a == "keep":
        s = need_share()
        if s.status == "suspended" and aware(s.expires_at) > utcnow():
            s.status = "live"
    elif a in ("hide_image", "restore_image"):
        mid = body.media_id or i.media_id
        m = db.get(MediaAsset, mid) if mid else None
        if not m or (share and mid not in (share.media or [])) or (not share and mid != i.media_id):
            raise HTTPException(422, "Choose an image from this item")
        target = mid
        if a == "hide_image":
            hide_media(db, mid)
            tell_uploader(db, m, body.reason)
        else:
            restore_media(db, mid)
    elif a in ("suspend_share", "restore_share"):
        s = need_share()
        if a == "suspend_share" and s.status in ("live", "review"):
            s.status = "suspended"
        if a == "restore_share" and s.status == "suspended":
            s.status = "live"
    elif a in ("warn_creator", "suspend_creator"):
        owner = (
            share.created_by if share else (db.get(MediaAsset, i.media_id).created_by if i.media_id else None)
        )
        u = db.get(User, owner) if owner else None
        if not u:
            raise HTTPException(422, "No creator to contact")
        target = u.id
        if a == "suspend_creator":
            u.share_banned_at = utcnow()
            for s in db.scalars(
                select(Share).where(Share.created_by == u.id, Share.status.in_(("live", "review")))
            ):
                s.status = "suspended"
            tell_creator(
                db,
                share,
                u.id,
                "Sharing is switched off for your account",
                [
                    "Our safety team has switched off sharing for your Trailbuddies account.",
                    "Your share codes stop working.",
                    f"The reason: {body.reason}",
                    "Copies people already made stay with them.",
                    "Reply to this email if you'd like us to look again.",
                ],
            )
        else:
            tell_creator(
                db,
                share,
                u.id,
                "A note from the Trailbuddies safety team",
                [
                    "Something you shared was reported, and our safety team looked at it.",
                    f"What we'd like you to know: {body.reason}",
                    "Please check what you share follows our rules: no children's faces, names or addresses.",
                ],
            )
    # dismiss: nothing to change

    log(db, i.id, a, target, user.email, body.reason)
    if a in CLOSES and i.status == "open":
        i.status, i.outcome, i.closed_at = "closed", CLOSES[a], utcnow()
        if i.kind == "report" and share:
            tell_reporters(db, share, "removed" if CLOSES[a] == "removed" else "kept")
    if a in ("hide_image", "restore_image") and i.kind == "upload" and i.status == "open":
        i.status, i.outcome, i.closed_at = "closed", "hidden" if a == "hide_image" else "restored", utcnow()
    db.commit()
    return item_out(db, i, utcnow())
