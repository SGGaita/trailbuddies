"""The safety team's queue (MOD-01…03) and what its actions do. Every action is written to the
audit log with who, when and why. Reporters hear the general outcome, never anything about
other people; an uploader whose image is hidden is told why and how to appeal."""

from datetime import datetime, timedelta

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session as DbSession

from . import mailer
from .db import utcnow
from .ids import ulid
from .models import MediaAsset, ModerationAction, ModerationItem, Share, ShareReport, User
from .privacy import grown_up_emails
from .security import aware
from .settings import get_settings
from .shares import REASONS, REPORT_THRESHOLD, REVIEW_HOURS, fmt

OUTCOME_WORDS = {
    "removed": "We've taken it down, so nobody new can get it, and removed anything unsuitable.",
    "kept": "We checked it carefully and it follows our rules for content, so it stays available.",
}


def log(db: DbSession, item_id: str | None, action: str, target: str, who: str, why: str) -> None:
    db.add(ModerationAction(id=ulid(), item_id=item_id, action=action, target=target, who=who, why=why))


def open_item(db: DbSession, kind: str, reason: str, **ids) -> ModerationItem:
    """The queue entry for this share or upload, made once and reused while it's open."""
    q = select(ModerationItem).where(ModerationItem.kind == kind, ModerationItem.status == "open")
    for k, v in ids.items():
        q = q.where(getattr(ModerationItem, k) == v)
    item = db.scalar(q)
    if not item:
        item = ModerationItem(id=ulid(), kind=kind, reason=reason, status="open", created_at=utcnow(), **ids)
        db.add(item)
    return item


def report_count(db: DbSession, share_id: str) -> int:
    return len(db.scalars(select(ShareReport.family_id).where(ShareReport.share_id == share_id)).all())


def add_report(db: DbSession, share: Share, family_id: str, reason: str, note: str | None) -> dict:
    """SHR-05: the report joins the queue; reports from three families suspend the code."""
    if db.scalar(
        select(ShareReport.id).where(ShareReport.share_id == share.id, ShareReport.family_id == family_id)
    ):
        return {"reported": True, "already": True, "suspended": share.status == "suspended"}
    db.add(ShareReport(id=ulid(), share_id=share.id, family_id=family_id, reason=reason, note=note))
    db.flush()
    item = open_item(db, "report", reason, share_id=share.id)
    n = report_count(db, share.id)
    if n >= REPORT_THRESHOLD and share.status == "live":
        share.status = "suspended"
        log(db, item.id, "suspend_share", fmt(share.code), "automatic", f"{n} families reported it")
    return {"reported": True, "already": False, "suspended": share.status == "suspended"}


def _copies(db: DbSession, media_id: str):
    return or_(MediaAsset.id == media_id, MediaAsset.origin_id == media_id)


def hide_media(db: DbSession, media_id: str) -> int:
    """MOD-02: the image becomes a placeholder for its family and everyone who imported it."""
    return db.execute(
        update(MediaAsset).where(_copies(db, media_id)).values(status="hidden"),
        execution_options={"synchronize_session": False},
    ).rowcount


def restore_media(db: DbSession, media_id: str) -> int:
    return db.execute(
        update(MediaAsset)
        .where(_copies(db, media_id), MediaAsset.status.in_(("hidden", "flagged")))
        .values(status="ready"),
        execution_options={"synchronize_session": False},
    ).rowcount


def tell_uploader(db: DbSession, media: MediaAsset, why: str) -> None:
    """MOD-03 scenario 2: the reason and how to appeal."""
    user = db.get(User, media.created_by)
    if not user:
        return
    s = get_settings()
    appeal = s.support_email or "hello@trailbuddies.africa"
    mailer.send_notice(
        user.email,
        "We've hidden one of your Trailbuddies photos",
        [
            "Our safety team hid a photo you added, so it now shows as a placeholder everywhere it's used.",
            f"The reason: {why}",
            f"If you think this was a mistake, reply to {appeal} and a person will look at it again.",
        ],
        s.web_url + "/family/create",
        "Open the Lesson Builder",
    )


def tell_reporters(db: DbSession, share: Share, outcome: str) -> int:
    """MOD-03 scenario 1: that it was reviewed and the general outcome, nothing about others."""
    now = utcnow()
    n = 0
    for r in db.scalars(
        select(ShareReport).where(ShareReport.share_id == share.id, ShareReport.answered_at.is_(None))
    ).all():
        for to in grown_up_emails(db, r.family_id):
            mailer.send_notice(
                to,
                "We've reviewed the lesson you reported",
                [
                    f"Thank you for telling us about “{share.title}”. Our safety team has reviewed it.",
                    OUTCOME_WORDS[outcome],
                ],
            )
        r.answered_at = now
        n += 1
    return n


def tell_creator(
    db: DbSession, share: Share | None, user_id: str | None, subject: str, lines: list[str]
) -> None:
    user = db.get(User, user_id) if user_id else None
    if user:
        mailer.send_notice(user.email, subject, lines, get_settings().web_url + "/family/create/shares")


def overdue(item: ModerationItem, now: datetime) -> bool:
    return item.status == "open" and now - aware(item.created_at) > timedelta(hours=REVIEW_HOURS)


def remind(db: DbSession, now: datetime | None = None) -> int:
    """MOD-01 scenario 2: once a day, if anything has waited more than 24 hours."""
    now = now or utcnow()
    admins = sorted(get_settings().admins)
    late = [
        i
        for i in db.scalars(select(ModerationItem).where(ModerationItem.status == "open"))
        if overdue(i, now)
    ]
    due = [i for i in late if not i.reminded_at or now - aware(i.reminded_at) > timedelta(hours=20)]
    if not due or not admins:
        return 0
    for to in admins:
        mailer.send_notice(
            to,
            f"{len(late)} moderation item{'s' if len(late) != 1 else ''} waiting over 24 hours",
            [
                f"{len(late)} item{'s have' if len(late) != 1 else ' has'} waited more than a day in the "
                "Trailbuddies moderation queue.",
                "Shares with photos stay unavailable until they're reviewed.",
            ],
            get_settings().web_url + "/admin/moderation",
            "Open the moderation queue",
        )
    for i in late:
        i.reminded_at = now
    db.commit()
    return len(late)


def reason_text(code: str) -> str:
    return REASONS.get(code, code)
