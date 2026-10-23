"""Custom lessons from the Lesson Builder (BLD-01..09). The lesson id is made on the device,
the newest edit wins (like learner profiles), and card ids never change, so editing a
lesson that children have played keeps their progress."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..ids import is_ulid
from ..models import CustomLesson, Learner, User
from ..schemas import CustomLessonIn
from ..security import aware, current_user, membership
from .families import keep, require_consent

router = APIRouter()


def lesson_out(c: CustomLesson) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "template": c.template,
        "question": c.question,
        "puzzle_card": c.puzzle_card,
        "cards": c.cards,
        "assigned": c.assigned,
        "version": c.version,
        "updated_at": aware(c.updated_at).isoformat(),
    }


@router.get("/families/{family_id}/lessons")
def list_lessons(
    family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    membership(db, user, family_id)
    rows = db.scalars(
        select(CustomLesson).where(CustomLesson.family_id == family_id).order_by(CustomLesson.id)
    )
    return {"lessons": [lesson_out(c) for c in rows]}


@router.put("/families/{family_id}/lessons/{lesson_id}")
def put_lesson(
    family_id: str,
    lesson_id: str,
    body: CustomLessonIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    membership(db, user, family_id, write=True)
    require_consent(db, family_id)
    if not is_ulid(lesson_id):
        raise HTTPException(422, "lesson id must be a ULID")
    kids = set(db.scalars(select(Learner.id).where(Learner.family_id == family_id)))
    if any(a not in kids for a in body.assigned):
        raise HTTPException(422, "Lessons can only be assigned to this family's learners")
    ids = [c.id for c in body.cards]
    if len(ids) != len(set(ids)):
        raise HTTPException(422, "Card ids must be unique")
    fields = {
        "title": body.title,
        "template": body.template,
        "question": body.question if body.template == "puzzle" else None,
        "puzzle_card": body.puzzle_card if body.template == "puzzle" else None,
        "cards": [c.model_dump(exclude_none=True) for c in body.cards],
        "assigned": list(dict.fromkeys(body.assigned)),
        "version": body.version,
    }
    c = db.get(CustomLesson, lesson_id)
    if c and c.family_id != family_id:
        raise HTTPException(404, "Lesson not found")
    if not c:
        c = CustomLesson(
            id=lesson_id,
            family_id=family_id,
            created_by=user.id,
            created_at=utcnow(),
            updated_at=body.updated_at,
            **fields,
        )
        db.add(c)
    elif aware(body.updated_at) <= aware(c.updated_at):  # a late, older edit: keep it, don't apply
        keep(db, family_id, "lesson", lesson_id, body.model_dump(mode="json"), "lost")
    else:
        keep(db, family_id, "lesson", lesson_id, lesson_out(c), "replaced")
        for k, v in fields.items():
            setattr(c, k, v)
        c.updated_at = body.updated_at
    db.commit()
    return lesson_out(c)


@router.delete("/families/{family_id}/lessons/{lesson_id}", status_code=204)
def delete_lesson(
    family_id: str, lesson_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    """Deletes the lesson. Children's stars from it stay (stars never go down)."""
    membership(db, user, family_id, write=True)
    c = db.get(CustomLesson, lesson_id)
    if not c or c.family_id != family_id:
        raise HTTPException(404, "Lesson not found")
    keep(db, family_id, "lesson", lesson_id, lesson_out(c), "deleted")
    db.delete(c)
    db.commit()
