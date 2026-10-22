"""Progress sync (ADR 0002). Devices push batches of events from their outbox and pull
everything after their cursor. Events are immutable and keyed by the device's ULID, so a
batch sent twice is stored once."""

import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..models import Event, Learner, User
from ..schemas import EventsIn
from ..security import aware, current_user, membership
from .families import require_consent

router = APIRouter()
MAX_DATA_BYTES = 2048


def event_out(e: Event) -> dict:
    return {
        "id": e.id,
        "type": e.type,
        "learnerId": e.learner_id,
        "at": aware(e.at).isoformat().replace("+00:00", "Z"),
        "data": e.data,
        "seq": e.seq,
    }


@router.post("/sync/events")
def push(body: EventsIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> dict:
    membership(db, user, body.family_id, write=True)
    require_consent(db, body.family_id)
    learners = set(db.scalars(select(Learner.id).where(Learner.family_id == body.family_id)))
    ids = [e.id for e in body.events]
    existing = set(db.scalars(select(Event.id).where(Event.id.in_(ids)))) if ids else set()
    accepted, rejected = [], []
    for e in body.events:
        if e.learnerId not in learners:
            rejected.append({"id": e.id, "reason": "unknown learner"})
            continue
        if len(json.dumps(e.data)) > MAX_DATA_BYTES:
            rejected.append({"id": e.id, "reason": "data too large"})
            continue
        if e.id not in existing:
            db.add(
                Event(
                    id=e.id,
                    family_id=body.family_id,
                    learner_id=e.learnerId,
                    type=e.type,
                    at=e.at,
                    data=e.data,
                    received_at=utcnow(),
                )
            )
            existing.add(e.id)
        accepted.append(e.id)
    db.commit()
    return {"accepted": accepted, "rejected": rejected}


@router.get("/sync/events")
def pull(
    family_id: str,
    after: int = Query(default=0, ge=0, description="the cursor from the last pull"),
    limit: int = Query(default=500, ge=1, le=1000),
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    membership(db, user, family_id)
    rows = list(
        db.scalars(
            select(Event)
            .where(Event.family_id == family_id, Event.seq > after)
            .order_by(Event.seq)
            .limit(limit + 1)
        )
    )
    more = len(rows) > limit
    rows = rows[:limit]
    return {"events": [event_out(e) for e in rows], "cursor": rows[-1].seq if rows else after, "more": more}
