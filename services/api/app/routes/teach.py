"""Teachers, schools, classes and rosters (ONB-13, CLS-01..03, CLS-05, CLS-06, HLP-03).

A teacher is any signed-in grown-up with a Teacher row; the same person can also be in a
family. Roster children have a first name and an initial only. Their class play is kept in
class_events, apart from any family's history.
"""

import json
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..ids import ulid
from ..models import ClassEvent, ClassGroupMember, ClassStudent, Event, School, SchoolClass, Teacher, User
from ..schemas import ClassEventsIn, ClassIn, SchoolConsentIn, StudentPatch, StudentsIn, TeacherIn
from ..security import aware, current_user

router = APIRouter()

JOIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # mirrors packages/domain/src/classes.js
PICTURES = ["apple", "banana", "cat", "dog", "fish", "star", "sun", "moon", "flower"]
COLOURS = ["coral", "sky", "leaf", "berry", "sun", "night"]
# Email providers: no school is made for these domains.
PUBLIC_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.uk",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "icloud.com",
    "me.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "ymail.com",
    "gmx.com",
}
SCHOOL_TERMS = "2026-11"
MAX_STUDENTS = 60


def domain_of(email: str) -> str | None:
    d = email.rsplit("@", 1)[-1].lower()
    return None if d in PUBLIC_DOMAINS else d


def teacher_for(db: DbSession, user: User) -> Teacher:
    t = db.get(Teacher, user.id)
    if not t:
        raise HTTPException(403, "Set up your teacher account first")
    return t


def own_class(db: DbSession, user: User, class_id: str) -> SchoolClass:
    c = db.get(SchoolClass, class_id)
    if not c or c.teacher_id != user.id or c.archived_at:
        raise HTTPException(404, "Class not found")
    return c


def new_code(db: DbSession) -> str:
    while True:
        code = "".join(secrets.choice(JOIN_ALPHABET) for _ in range(6))
        if not db.scalar(select(SchoolClass.id).where(SchoolClass.join_code == code)):
            return code


def school_out(s: School | None) -> dict | None:
    if not s:
        return None
    return {
        "id": s.id,
        "name": s.name,
        "domain": s.domain,
        "consent": {"at": aware(s.consent_at).isoformat(), **(s.consent_evidence or {})}
        if s.consent_at
        else None,
    }


def student_out(s: ClassStudent) -> dict:
    return {
        "id": s.id,
        "first_name": s.first_name,
        "initial": s.initial,
        "avatar_color": s.avatar_color,
        "pictures": s.pictures or [],
        "linked": bool(s.learner_id),
        "scope": s.scope,
        "help": bool(s.help_at),
    }


def class_out(db: DbSession, c: SchoolClass, students: bool = False) -> dict:
    out = {
        "id": c.id,
        "name": c.name,
        "year_group": c.year_group,
        "band": c.band,
        "join_code": c.join_code,
        "students": db.scalar(
            select(func.count()).select_from(ClassStudent).where(ClassStudent.class_id == c.id)
        ),
    }
    if students:
        rows = db.scalars(
            select(ClassStudent).where(ClassStudent.class_id == c.id).order_by(ClassStudent.first_name)
        )
        out["roster"] = [student_out(s) for s in rows]
        # Sprint 10 (imported here to avoid a circular import at load time).
        from .classwork import devices_of, groups_of

        out["groups"] = groups_of(db, c.id)
        out["devices"] = devices_of(db, c.id)
    return out


def teacher_out(db: DbSession, t: Teacher) -> dict:
    classes = db.scalars(
        select(SchoolClass)
        .where(SchoolClass.teacher_id == t.user_id, SchoolClass.archived_at.is_(None))
        .order_by(SchoolClass.created_at)
    ).all()
    return {
        "school": school_out(db.get(School, t.school_id) if t.school_id else None),
        "classes": [class_out(db, c) for c in classes],
        "tips": t.tips or {},
    }


@router.post("/teacher", status_code=201)
def become_teacher(body: TeacherIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    """Teacher sign-up (ONB-13). With a school email, the first teacher creates the school and
    later ones are offered to join it (`offer`), unless they chose to join with `join_school`."""
    t = db.get(Teacher, user.id) or Teacher(user_id=user.id, tips={})
    domain = domain_of(user.email)
    existing = db.scalar(select(School).where(School.domain == domain)) if domain else None
    if body.join_school:
        if not existing or existing.id != body.join_school:
            raise HTTPException(403, "You can join a school that uses your email domain")
        t.school_id = existing.id
    elif existing and not t.school_id and not body.separate:
        db.add(t)
        db.commit()
        return {**teacher_out(db, t), "offer": school_out(existing)}
    elif not t.school_id:
        s = School(
            id=ulid(),
            name=" ".join(body.school_name.split()),
            domain=None if existing else domain,
            created_by=user.id,
        )
        db.add(s)
        t.school_id = s.id
    db.add(t)
    db.commit()
    return teacher_out(db, t)


@router.get("/teacher")
def get_teacher(user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    return teacher_out(db, teacher_for(db, user))


@router.patch("/teacher/tips")
def tick_tips(
    tips: dict[str, bool], user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    """HLP-03: steps of the first-week checklist that only the app knows about (printed letters)."""
    t = teacher_for(db, user)
    allowed = {k: bool(v) for k, v in tips.items() if k in {"printed", "played", "viewed", "dismissed"}}
    t.tips = {**(t.tips or {}), **allowed}
    db.commit()
    return {"tips": t.tips}


@router.post("/schools/{school_id}/consent")
def school_consent(
    school_id: str,
    body: SchoolConsentIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    """CLS-06: someone at the school confirms it authorises use for pupils whose parents haven't
    signed up. Recorded with who, their role, when and which terms."""
    t = teacher_for(db, user)
    if t.school_id != school_id:
        raise HTTPException(404, "School not found")
    s = db.get(School, school_id)
    s.consent_at = utcnow()
    s.consent_by = user.id
    s.consent_evidence = {
        "name": body.name.strip(),
        "role": body.role.strip(),
        "terms": SCHOOL_TERMS,
        "user": user.id,
    }
    db.commit()
    return school_out(s)


@router.post("/classes", status_code=201)
def create_class(body: ClassIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    t = teacher_for(db, user)
    c = SchoolClass(
        id=ulid(),
        teacher_id=user.id,
        school_id=t.school_id,
        name=body.name,
        year_group=body.year_group,
        band=body.band,
        join_code=new_code(db),
    )
    db.add(c)
    db.commit()
    return class_out(db, c, students=True)


@router.get("/classes/{class_id}")
def get_class(class_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    return class_out(db, own_class(db, user, class_id), students=True)


@router.patch("/classes/{class_id}")
def edit_class(
    class_id: str, body: ClassIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    c = own_class(db, user, class_id)
    c.name, c.year_group, c.band = body.name, body.year_group, body.band
    db.commit()
    return class_out(db, c, students=True)


@router.post("/classes/{class_id}/code")
def new_join_code(class_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    """A new code: the old one stops working (CLS-04 'expired code')."""
    c = own_class(db, user, class_id)
    c.join_code = new_code(db)
    db.commit()
    return class_out(db, c, students=True)


@router.delete("/classes/{class_id}", status_code=204)
def archive_class(class_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    own_class(db, user, class_id).archived_at = utcnow()
    db.commit()


@router.post("/classes/{class_id}/students", status_code=201)
def add_students(
    class_id: str, body: StudentsIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    """CLS-02: one or many first names. Avatars and picture passwords are handed out. Two children
    with the same name need an initial each (422 lists the clashes)."""
    c = own_class(db, user, class_id)
    existing = db.scalars(select(ClassStudent).where(ClassStudent.class_id == c.id)).all()
    if len(existing) + len(body.students) > MAX_STUDENTS:
        raise HTTPException(422, f"A class can have up to {MAX_STUDENTS} children")
    name = lambda s: f"{s.first_name} {s.initial or ''}".strip().lower()  # noqa: E731
    seen: dict[str, int] = {}
    for s in [*existing, *body.students]:
        seen[name(s)] = seen.get(name(s), 0) + 1
    clashes = sorted({name(s) for s in body.students if seen[name(s)] > 1})
    if clashes:
        raise HTTPException(
            422,
            {
                "code": "same_name",
                "names": clashes,
                "message": "Add an initial to tell these children apart.",
            },
        )
    made = []
    for i, s in enumerate(body.students):
        st = ClassStudent(
            id=ulid(),
            class_id=c.id,
            first_name=s.first_name,
            initial=s.initial,
            avatar_color=COLOURS[(len(existing) + i) % len(COLOURS)],
            pictures=[secrets.choice(PICTURES) for _ in range(3)],
        )
        db.add(st)
        made.append(st)
    db.commit()
    return {"added": [student_out(s) for s in made], **class_out(db, c, students=True)}


def own_student(db: DbSession, c: SchoolClass, student_id: str) -> ClassStudent:
    s = db.get(ClassStudent, student_id)
    if not s or s.class_id != c.id:
        raise HTTPException(404, "Not in this class")
    return s


@router.patch("/classes/{class_id}/students/{student_id}")
def edit_student(
    class_id: str,
    student_id: str,
    body: StudentPatch,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    c = own_class(db, user, class_id)
    s = own_student(db, c, student_id)
    if body.first_name is not None:
        s.first_name = " ".join(body.first_name.split()).split(" ")[0]
    if body.initial is not None:
        s.initial = body.initial.upper() or None
    if body.new_pictures:
        s.pictures = [secrets.choice(PICTURES) for _ in range(3)]
        s.help_at = None
    if body.help is False:
        s.help_at = None
    db.commit()
    return student_out(s)


@router.delete("/classes/{class_id}/students/{student_id}", status_code=204)
def remove_student(
    class_id: str, student_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    """Takes a child off the roster and deletes their class play. A linked family keeps its own."""
    c = own_class(db, user, class_id)
    s = own_student(db, c, student_id)
    db.execute(ClassEvent.__table__.delete().where(ClassEvent.student_id == s.id))
    db.execute(ClassGroupMember.__table__.delete().where(ClassGroupMember.student_id == s.id))
    db.delete(s)
    db.commit()


# --- Class play sync (same shapes as /sync/events) -----------------------------------------


def may_sync(db: DbSession, c: SchoolClass, s: ClassStudent) -> bool:
    """CLS-06: an unlinked child's play is saved only once the school has agreed to the terms;
    a linked child is covered by their parent's consent."""
    if s.learner_id:
        return True
    school = db.get(School, c.school_id) if c.school_id else None
    return bool(school and school.consent_at)


def class_event_out(e: ClassEvent) -> dict:
    return {
        "id": e.id,
        "type": e.type,
        "learnerId": e.student_id,
        "at": aware(e.at).isoformat().replace("+00:00", "Z"),
        "data": e.data,
        "seq": e.seq,
    }


@router.post("/classes/{class_id}/events")
def push_class_events(
    class_id: str,
    body: ClassEventsIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    c = own_class(db, user, class_id)
    students = {s.id: s for s in db.scalars(select(ClassStudent).where(ClassStudent.class_id == c.id))}
    ids = [e.id for e in body.events]
    existing = set(db.scalars(select(ClassEvent.id).where(ClassEvent.id.in_(ids)))) if ids else set()
    accepted, rejected = [], []
    for e in body.events:
        s = students.get(e.learnerId)
        if not s:
            rejected.append({"id": e.id, "reason": "not in this class"})
            continue
        if not may_sync(db, c, s):
            rejected.append({"id": e.id, "reason": "school_consent"})
            continue
        if len(json.dumps(e.data)) > 4000:
            rejected.append({"id": e.id, "reason": "data too large"})
            continue
        if e.id not in existing:
            db.add(
                ClassEvent(
                    id=e.id,
                    class_id=c.id,
                    student_id=s.id,
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


@router.get("/classes/{class_id}/events")
def pull_class_events(
    class_id: str,
    after: int = Query(default=0, ge=0),
    limit: int = Query(default=500, ge=1, le=1000),
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    c = own_class(db, user, class_id)
    rows = db.scalars(
        select(ClassEvent)
        .where(ClassEvent.class_id == c.id, ClassEvent.seq > after)
        .order_by(ClassEvent.seq)
        .limit(limit + 1)
    ).all()
    more = len(rows) > limit
    rows = rows[:limit]
    return {
        "events": [class_event_out(e) for e in rows],
        "cursor": rows[-1].seq if rows else after,
        "more": more,
    }


# --- What the teacher sees of a child (CLS-05) ---------------------------------------------


def summary(rows: list[tuple[str, dict]]) -> dict:
    """Stars and lessons in total and per subject from (type, data) rows. Family Island
    (custom lessons, subject 'family') is never included."""
    lessons = [d for t, d in rows if t == "lesson_completed" and (d or {}).get("subjectId") != "family"]
    subjects: dict[str, dict] = {}
    for d in lessons:
        s = subjects.setdefault(d.get("subjectId") or "other", {"lessons": 0, "stars": 0})
        s["lessons"] += 1
        s["stars"] += int(d.get("stars") or 0)
    return {
        "lessons": len(lessons),
        "stars": sum(int(d.get("stars") or 0) for d in lessons),
        "badges": sum(1 for t, _ in rows if t == "badge_awarded"),
        "subjects": subjects,
    }


@router.get("/classes/{class_id}/students/{student_id}/progress")
def student_progress(
    class_id: str, student_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    c = own_class(db, user, class_id)
    s = own_student(db, c, student_id)
    cls_rows = db.execute(select(ClassEvent.type, ClassEvent.data).where(ClassEvent.student_id == s.id)).all()
    out = {"student": student_out(s), "class": summary([tuple(r) for r in cls_rows]), "home": None}
    if s.learner_id:
        home_rows = [
            tuple(r)
            for r in db.execute(select(Event.type, Event.data).where(Event.learner_id == s.learner_id))
        ]
        home = summary(home_rows)
        if s.scope != "all":
            home = {"lessons": home["lessons"], "stars": home["stars"], "badges": home["badges"]}
        out["home"] = home
    t = db.get(Teacher, user.id)
    if t and not (t.tips or {}).get("viewed"):
        t.tips = {**(t.tips or {}), "viewed": True}
        db.commit()
    return out
