"""Emails to parents (PAR-07, BDG-06). Children's names appear only in emails to their own
family's parents and are never logged. Every email says how to switch it off."""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from . import mailer
from .db import utcnow
from .models import Event, Family, Learner
from .privacy import grown_up_emails
from .schemas import FamilySettings
from .security import aware
from .settings import get_settings

BADGE_MAIL_EVERY = timedelta(hours=1)
OFF = "Switch these emails off in Trailbuddies: Settings, Emails."


def emails_for(fam: Family):
    return FamilySettings(**(fam.settings or {})).emails


def badge_name(data: dict) -> str:
    return data.get("name") or str(data.get("badgeId", "a badge")).replace("-", " ").capitalize()


def badges_earned(db: DbSession, family_id: str, events: list[Event]) -> None:
    """New badges arrived with a sync: one email for the batch, at most once an hour."""
    fam = db.get(Family, family_id)
    new = [e for e in events if e.type == "badge_awarded"]
    if not new or not emails_for(fam).badges:
        return
    now = utcnow()
    if fam.badge_mail_at and now - aware(fam.badge_mail_at) < BADGE_MAIL_EVERY:
        return
    names = {lr.id: lr.name for lr in db.scalars(select(Learner).where(Learner.family_id == family_id))}
    lines = [
        f"{names.get(e.learner_id, 'Your child')} earned the {badge_name(e.data or {})} badge!" for e in new
    ]
    fam.badge_mail_at = now
    db.commit()
    for to in grown_up_emails(db, family_id):
        mailer.send_notice(
            to, "A new Trailbuddies badge!", [*lines[:10], OFF], get_settings().web_url + "/family"
        )


def week_summary(db: DbSession, family_id: str, start: datetime, end: datetime) -> list[dict]:
    """Each learner's badges and minutes learnt between start and end."""
    learners = db.scalars(
        select(Learner)
        .where(Learner.family_id == family_id, Learner.removing_at.is_(None))
        .order_by(Learner.created_at)
    ).all()
    out = []
    for lr in learners:
        evs = db.scalars(
            select(Event).where(
                Event.learner_id == lr.id,
                Event.type.in_(("badge_awarded", "lesson_completed")),
                Event.at >= start,
                Event.at < end,
            )
        ).all()
        seconds = sum(
            int((e.data or {}).get("durationSec") or 0) for e in evs if e.type == "lesson_completed"
        )
        out.append(
            {
                "name": lr.name,
                "badges": [badge_name(e.data or {}) for e in evs if e.type == "badge_awarded"],
                "minutes": round(seconds / 60),
                "lessons": sum(1 for e in evs if e.type == "lesson_completed"),
            }
        )
    return out


def digest_lines(summary: list[dict]) -> list[str]:
    lines = []
    for s in summary:
        if s["lessons"] == 0 and not s["badges"]:
            lines.append(f"{s['name']} took a break this week.")
            continue
        badges = ", ".join(s["badges"]) if s["badges"] else "no new badges yet"
        lines.append(f"{s['name']}: {s['minutes']} minutes, {s['lessons']} lessons. Badges: {badges}.")
    return lines


def weekly_digest(db: DbSession, now: datetime | None = None) -> int:
    """BDG-06: Sunday evening (the weekly cron), one email per parent, skipping families that
    switched it off, have nobody learning, or already got this week's email."""
    now = now or utcnow()
    start = now - timedelta(days=7)
    sent = 0
    web = get_settings().web_url
    for fam in db.scalars(select(Family)).all():
        if not emails_for(fam).digest:
            continue
        if fam.digest_at and now - aware(fam.digest_at) < timedelta(days=6):
            continue
        summary = week_summary(db, fam.id, start, now)
        if not summary or all(s["lessons"] == 0 and not s["badges"] for s in summary):
            continue
        fam.digest_at = now
        db.commit()
        for to in grown_up_emails(db, fam.id):
            mailer.send_notice(
                to,
                "Your Trailbuddies week",
                ["Here's what your children did this week:", *digest_lines(summary), OFF],
                web + "/family/progress",
                "See their progress",
            )
            sent += 1
    return sent
