"""OPS-07: first-party product metrics from our own tables. Only counts and ratios are stored:
no ids, names or emails. Weeks run Monday to Sunday (UTC)."""

from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from .db import utcnow
from .models import Event, Family, WeeklyMetric


def week_bounds(week_start: date) -> tuple[datetime, datetime]:
    start = datetime.combine(week_start, time(), tzinfo=UTC)
    return start, start + timedelta(days=7)


def last_full_week(now: datetime) -> date:
    """The Monday of the most recent week that has fully ended."""
    today = now.date()
    this_monday = today - timedelta(days=today.weekday())
    return this_monday - timedelta(days=7)


def active_learners(db: DbSession, start: datetime, end: datetime) -> set[str]:
    return set(
        db.scalars(
            select(Event.learner_id)
            .where(Event.type == "lesson_completed", Event.at >= start, Event.at < end)
            .distinct()
        )
    )


def compute_week(db: DbSession, week_start: date) -> dict:
    start, end = week_bounds(week_start)
    new_fams = db.scalars(select(Family.id).where(Family.created_at >= start, Family.created_at < end)).all()
    activated = 0
    for fid in new_fams:
        created = db.scalar(select(Family.created_at).where(Family.id == fid))
        first = db.scalar(
            select(func.min(Event.at)).where(Event.family_id == fid, Event.type == "lesson_completed")
        )
        if first and first.replace(tzinfo=UTC) - created.replace(tzinfo=UTC) <= timedelta(days=7):
            activated += 1
    active = active_learners(db, start, end)
    before = active_learners(db, start - timedelta(days=7), start)
    lessons = db.scalars(
        select(Event.data).where(Event.type == "lesson_completed", Event.at >= start, Event.at < end)
    ).all()
    families = set(
        db.scalars(
            select(Event.family_id)
            .where(Event.type == "lesson_completed", Event.at >= start, Event.at < end)
            .distinct()
        )
    )
    minutes = round(sum(int((d or {}).get("durationSec") or 0) for d in lessons) / 60)
    return {
        "families_new": len(new_fams),
        "families_activated": activated,
        "activation_rate": round(activated / len(new_fams), 3) if new_fams else None,
        "active_families": len(families),
        "active_learners": len(active),
        "lessons": len(lessons),
        "lessons_per_learner": round(len(lessons) / len(active), 2) if active else 0,
        "minutes": minutes,
        "retained_from_last_week": len(active & before),
        "retention_rate": round(len(active & before) / len(before), 3) if before else None,
    }


def store_weeks(db: DbSession, now: datetime | None = None, back: int = 12) -> list[date]:
    """Compute the last full week, and any missing ones in the `back` weeks before it."""
    last = last_full_week(now or utcnow())
    done = []
    for i in range(back):
        wk = last - timedelta(days=7 * i)
        row = db.get(WeeklyMetric, wk)
        if row and i > 0:
            continue
        data = compute_week(db, wk)
        if row:
            row.data, row.computed_at = data, utcnow()
        else:
            db.add(WeeklyMetric(week_start=wk, data=data, computed_at=utcnow()))
        done.append(wk)
    db.commit()
    return done
