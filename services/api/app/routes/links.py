"""Parents link a child to a class (CLS-04) and stay in control of what the teacher sees
(CLS-05, PAR-08). Home and class histories stay separate; the teacher sees class play and,
by default, home totals only."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..models import ClassStudent, Learner, School, SchoolClass, User
from ..schemas import LinkIn, ScopeIn
from ..security import aware, current_user, membership
from .families import require_consent

router = APIRouter()


def norm(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def class_by_code(db: DbSession, code: str) -> SchoolClass:
    c = db.scalar(
        select(SchoolClass).where(SchoolClass.join_code == norm(code), SchoolClass.archived_at.is_(None))
    )
    if not c:
        raise HTTPException(
            404, {"code": "bad_code", "message": "We couldn't find that class code. Check it and try again."}
        )
    return c


def teacher_name(db: DbSession, c: SchoolClass) -> str:
    u = db.get(User, c.teacher_id)
    return (u.name or "Your child's teacher") if u else "Your child's teacher"


def display(s: ClassStudent) -> str:
    return f"{s.first_name} {s.initial}." if s.initial else s.first_name


@router.get("/join/{code}")
def preview(code: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> dict:
    """What a parent sees after typing the code: the class and the children not yet linked."""
    c = class_by_code(db, code)
    school = db.get(School, c.school_id) if c.school_id else None
    free = db.scalars(
        select(ClassStudent)
        .where(ClassStudent.class_id == c.id, ClassStudent.learner_id.is_(None))
        .order_by(ClassStudent.first_name)
    )
    return {
        "class": {
            "name": c.name,
            "year_group": c.year_group,
            "teacher": teacher_name(db, c),
            "school": school.name if school else None,
        },
        "students": [{"id": s.id, "name": display(s)} for s in free],
    }


def link_out(db: DbSession, s: ClassStudent) -> dict:
    c = db.get(SchoolClass, s.class_id)
    school = db.get(School, c.school_id) if c.school_id else None
    return {
        "student_id": s.id,
        "learner_id": s.learner_id,
        "roster_name": display(s),
        "class": c.name,
        "year_group": c.year_group,
        "teacher": teacher_name(db, c),
        "school": school.name if school else None,
        "scope": s.scope,
        "linked_at": aware(s.linked_at).isoformat() if s.linked_at else None,
    }


@router.get("/families/{family_id}/links")
def links(family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> dict:
    membership(db, user, family_id)
    rows = db.scalars(
        select(ClassStudent)
        .join(Learner, Learner.id == ClassStudent.learner_id)
        .where(Learner.family_id == family_id)
        .order_by(ClassStudent.linked_at)
    )
    return {"links": [link_out(db, s) for s in rows]}


def family_student(db: DbSession, family_id: str, student_id: str) -> ClassStudent:
    s = db.get(ClassStudent, student_id)
    lr = s and s.learner_id and db.get(Learner, s.learner_id)
    if not lr or lr.family_id != family_id:
        raise HTTPException(404, "Link not found")
    return s


@router.post("/families/{family_id}/links", status_code=201)
def link(
    family_id: str, body: LinkIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    membership(db, user, family_id, write=True)
    require_consent(db, family_id)
    c = class_by_code(db, body.code)
    lr = db.get(Learner, body.learner_id)
    if not lr or lr.family_id != family_id or lr.removing_at:
        raise HTTPException(404, "Learner not found")
    s = db.get(ClassStudent, body.student_id)
    if not s or s.class_id != c.id:
        raise HTTPException(404, "That child isn't on this class's list")
    if s.learner_id and s.learner_id != lr.id:
        raise HTTPException(409, "That child is already linked. Ask the teacher if this looks wrong.")
    twice = db.scalar(
        select(ClassStudent.id).where(
            ClassStudent.class_id == c.id, ClassStudent.learner_id == lr.id, ClassStudent.id != s.id
        )
    )
    if twice:
        raise HTTPException(409, f"{lr.name} is already linked to this class")
    s.learner_id, s.scope, s.linked_at, s.linked_by = lr.id, body.scope, utcnow(), user.id
    db.commit()
    return link_out(db, s)


@router.patch("/families/{family_id}/links/{student_id}")
def set_scope(
    family_id: str,
    student_id: str,
    body: ScopeIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    membership(db, user, family_id, write=True)
    s = family_student(db, family_id, student_id)
    s.scope = body.scope
    db.commit()
    return link_out(db, s)


@router.delete("/families/{family_id}/links/{student_id}", status_code=204)
def unlink(
    family_id: str, student_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    """PAR-08: unlink at any time. The roster entry stays for class play; home data is no longer shown."""
    membership(db, user, family_id, write=True)
    s = family_student(db, family_id, student_id)
    s.learner_id, s.scope, s.linked_at, s.linked_by = None, "class", None, None
    db.commit()
