"""Sprint 10: groups within a class (CLS-07), assignments (ASN-01, MAP-06b), class progress
(ASN-02..04), and classroom devices with 'Ask my teacher' (CRM-01..05).

The rules for what counts as done, the heatmap, the hardest items and the export live in
packages/domain (assignments.js). The API checks who may see what and sends only the answers
that belong to an assignment: a linked child's home play shows here only for work the teacher
set, from the day it was set.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..ids import is_ulid, ulid
from ..models import (
    Assignment,
    ClassEvent,
    ClassGroup,
    ClassGroupMember,
    ClassroomDevice,
    ClassStudent,
    CustomLesson,
    Event,
    FamilyMember,
    Learner,
    MediaAsset,
    SchoolClass,
    Teacher,
    User,
)
from ..privacy import media_ids
from ..schemas import AssignmentIn, DeviceIn, GroupIn, GroupPatch
from ..security import aware, current_user, membership
from ..storage import get_storage
from .lessons import lesson_out
from .links import teacher_name
from .teach import own_class, own_student

router = APIRouter()

MAX_GROUPS = 12
MAX_OPEN_ASSIGNMENTS = 60
PLAY_TYPES = ("lesson_completed", "item_answered")
WHEN = lambda d: aware(d).isoformat().replace("+00:00", "Z")  # noqa: E731


# --- Groups (CLS-07) --------------------------------------------------------------------------


def groups_of(db: DbSession, class_id: str) -> list[dict]:
    groups = db.scalars(
        select(ClassGroup).where(ClassGroup.class_id == class_id).order_by(ClassGroup.created_at)
    ).all()
    members: dict[str, list[str]] = {g.id: [] for g in groups}
    if groups:
        for m in db.scalars(select(ClassGroupMember).where(ClassGroupMember.group_id.in_(members))):
            members[m.group_id].append(m.student_id)
    return [{"id": g.id, "name": g.name, "student_ids": sorted(members[g.id])} for g in groups]


def roster_ids(db: DbSession, class_id: str) -> set[str]:
    return set(db.scalars(select(ClassStudent.id).where(ClassStudent.class_id == class_id)))


def own_group(db: DbSession, c: SchoolClass, group_id: str) -> ClassGroup:
    g = db.get(ClassGroup, group_id)
    if not g or g.class_id != c.id:
        raise HTTPException(404, "Group not found")
    return g


def set_members(db: DbSession, c: SchoolClass, g: ClassGroup, student_ids: list[str]) -> None:
    ids = set(student_ids)
    if ids - roster_ids(db, c.id):
        raise HTTPException(422, "Only children in this class can be in its groups")
    db.execute(ClassGroupMember.__table__.delete().where(ClassGroupMember.group_id == g.id))
    db.add_all(ClassGroupMember(group_id=g.id, student_id=s) for s in sorted(ids))


@router.post("/classes/{class_id}/groups", status_code=201)
def create_group(
    class_id: str, body: GroupIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    c = own_class(db, user, class_id)
    existing = groups_of(db, c.id)
    if len(existing) >= MAX_GROUPS:
        raise HTTPException(422, f"A class can have up to {MAX_GROUPS} groups")
    if any(g["name"].lower() == body.name.lower() for g in existing):
        raise HTTPException(422, "There's already a group with that name")
    g = ClassGroup(id=ulid(), class_id=c.id, name=body.name)
    db.add(g)
    db.flush()
    set_members(db, c, g, body.student_ids)
    db.commit()
    return {"groups": groups_of(db, c.id)}


@router.patch("/classes/{class_id}/groups/{group_id}")
def edit_group(
    class_id: str,
    group_id: str,
    body: GroupPatch,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    c = own_class(db, user, class_id)
    g = own_group(db, c, group_id)
    if body.name is not None:
        if any(x["name"].lower() == body.name.lower() and x["id"] != g.id for x in groups_of(db, c.id)):
            raise HTTPException(422, "There's already a group with that name")
        g.name = body.name
    if body.student_ids is not None:
        set_members(db, c, g, body.student_ids)
    db.commit()
    return {"groups": groups_of(db, c.id)}


@router.delete("/classes/{class_id}/groups/{group_id}", status_code=204)
def delete_group(
    class_id: str, group_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    """An assignment for a deleted group would reach nobody, so the teacher removes that work
    first (409 lists it)."""
    c = own_class(db, user, class_id)
    g = own_group(db, c, group_id)
    open_for_group = [
        a
        for a in open_assignments(db, c.id)
        if (a.target or {}).get("type") == "group" and a.target.get("group_id") == g.id
    ]
    if open_for_group:
        raise HTTPException(
            409,
            {
                "code": "group_has_work",
                "titles": [a.title for a in open_for_group],
                "message": "Remove the work assigned to this group first.",
            },
        )
    db.delete(g)
    db.commit()


# --- Assignments (ASN-01) ---------------------------------------------------------------------


def open_assignments(db: DbSession, class_id: str) -> list[Assignment]:
    return list(
        db.scalars(
            select(Assignment)
            .where(Assignment.class_id == class_id, Assignment.removed_at.is_(None))
            .order_by(Assignment.created_at)
        )
    )


def targets(a: Assignment, roster: list[str], groups: list[dict]) -> list[str]:
    """Mirrors targetsOf() in packages/domain/src/assignments.js."""
    t = a.target or {"type": "class"}
    if t.get("type") == "group":
        ids = set(next((g["student_ids"] for g in groups if g["id"] == t.get("group_id")), []))
    elif t.get("type") == "students":
        ids = set(t.get("student_ids") or [])
    else:
        ids = set(roster)
    return [s for s in roster if s in ids]


def unit_of(a: Assignment) -> str:
    """The unitId its events carry (mirrors assignmentUnit())."""
    return f"custom-{(a.lesson or {}).get('id', '')}" if a.kind == "custom" else (a.unit_id or "")


def assignment_out(a: Assignment, to: list[str] | None = None) -> dict:
    out = {
        "id": a.id,
        "kind": a.kind,
        "unit_id": a.unit_id,
        "lesson": a.lesson,
        "title": a.title,
        "target": a.target,
        "due_on": a.due_on.isoformat() if a.due_on else None,
        "created_at": WHEN(a.created_at),
    }
    if to is not None:
        out["to"] = to
    return out


def class_roster(db: DbSession, c: SchoolClass) -> list[ClassStudent]:
    return list(
        db.scalars(
            select(ClassStudent).where(ClassStudent.class_id == c.id).order_by(ClassStudent.first_name)
        )
    )


def assignments_out(db: DbSession, c: SchoolClass) -> list[dict]:
    roster = [s.id for s in class_roster(db, c)]
    groups = groups_of(db, c.id)
    return [assignment_out(a, targets(a, roster, groups)) for a in open_assignments(db, c.id)]


@router.get("/classes/{class_id}/assignments")
def list_assignments(class_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    c = own_class(db, user, class_id)
    return {"assignments": assignments_out(db, c), "groups": groups_of(db, c.id)}


def custom_copy(db: DbSession, user: User, lesson_id: str) -> tuple[dict, str]:
    """A copy of one of the teacher's own lessons, from a family they can edit."""
    c = db.get(CustomLesson, lesson_id) if is_ulid(lesson_id) else None
    if not c:
        raise HTTPException(404, "Lesson not found")
    membership(db, user, c.family_id, write=True)  # 404 for someone else's lesson
    return lesson_out(c), c.family_id


@router.post("/classes/{class_id}/assignments", status_code=201)
def assign(
    class_id: str,
    body: AssignmentIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    c = own_class(db, user, class_id)
    if len(open_assignments(db, c.id)) >= MAX_OPEN_ASSIGNMENTS:
        raise HTTPException(422, "Remove some finished work first")
    t = body.target
    if t.type == "group" and t.group_id not in {g["id"] for g in groups_of(db, c.id)}:
        raise HTTPException(422, "That group isn't in this class")
    if t.type == "students" and set(t.student_ids or []) - roster_ids(db, c.id):
        raise HTTPException(422, "Only children in this class can be given work")
    a = Assignment(
        id=ulid(),
        class_id=c.id,
        kind=body.kind,
        target=t.model_dump(exclude_none=True),
        due_on=body.due_on,
        created_by=user.id,
    )
    if body.kind == "custom":
        a.lesson, a.lesson_family_id = custom_copy(db, user, body.lesson_id)
        a.title = a.lesson["title"][:80]
    else:
        a.unit_id, a.title = body.unit_id, body.title
    db.add(a)
    teacher = db.get(Teacher, user.id)
    if teacher and not (teacher.tips or {}).get("assigned"):
        teacher.tips = {**(teacher.tips or {}), "assigned": True}
    db.commit()
    roster = [s.id for s in class_roster(db, c)]
    return assignment_out(a, targets(a, roster, groups_of(db, c.id)))


@router.delete("/classes/{class_id}/assignments/{assignment_id}", status_code=204)
def unassign(
    class_id: str,
    assignment_id: str,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    c = own_class(db, user, class_id)
    a = db.get(Assignment, assignment_id)
    if not a or a.class_id != c.id or a.removed_at:
        raise HTTPException(404, "Assignment not found")
    a.removed_at = utcnow()
    db.commit()


# --- What counts towards an assignment --------------------------------------------------------


def assignment_events(
    db: DbSession,
    pairs: list[tuple[Assignment, ClassStudent]],
    student_key=lambda s: s.id,
    home: bool = True,
) -> list[dict]:
    """Class play and (for linked children, when `home`) home play that belongs to these
    assignments: the assignment's unit, from the day it was set. `student_key` names whose
    events they are."""
    if not pairs:
        return []
    since: dict[tuple[str, str], datetime] = {}
    for a, s in pairs:
        key = (s.id, unit_of(a))
        start = aware(a.created_at).replace(hour=0, minute=0, second=0, microsecond=0)
        since[key] = min(since.get(key, start), start)
    earliest = min(since.values())
    students = {s.id: s for _, s in pairs}
    out: list[dict] = []

    def keep(student: ClassStudent, e) -> None:
        unit = (e.data or {}).get("unitId")
        start = since.get((student.id, unit))
        if start and aware(e.at) >= start:
            out.append(
                {
                    "id": e.id,
                    "type": e.type,
                    "learnerId": student_key(student),
                    "at": WHEN(e.at),
                    "data": {
                        k: e.data.get(k)
                        for k in ("lessonId", "unitId", "subjectId", "kind", "stars", "itemId", "firstTry")
                        if k in e.data
                    },
                }
            )

    for e in db.scalars(
        select(ClassEvent).where(
            ClassEvent.student_id.in_(students), ClassEvent.type.in_(PLAY_TYPES), ClassEvent.at >= earliest
        )
    ):
        keep(students[e.student_id], e)
    by_learner = {s.learner_id: s for s in students.values() if s.learner_id} if home else {}
    if by_learner:
        for e in db.scalars(
            select(Event).where(
                Event.learner_id.in_(by_learner), Event.type.in_(PLAY_TYPES), Event.at >= earliest
            )
        ):
            keep(by_learner[e.learner_id], e)
    out.sort(key=lambda e: e["at"])
    return out


@router.get("/classes/{class_id}/assignments/progress")
def class_progress(class_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    """ASN-02..04: everything the dashboard needs. The heatmap, the hardest items and the CSV are
    worked out on the device with packages/domain."""
    c = own_class(db, user, class_id)
    roster = class_roster(db, c)
    groups = groups_of(db, c.id)
    ids = [s.id for s in roster]
    by_id = {s.id: s for s in roster}
    open_ = open_assignments(db, c.id)
    pairs = [(a, by_id[s]) for a in open_ for s in targets(a, ids, groups)]
    teacher = db.get(Teacher, user.id)
    if teacher and not (teacher.tips or {}).get("viewed"):
        teacher.tips = {**(teacher.tips or {}), "viewed": True}
        db.commit()
    return {
        "assignments": [assignment_out(a, targets(a, ids, groups)) for a in open_],
        "groups": groups,
        "events": assignment_events(db, pairs),
    }


@router.get("/families/{family_id}/assignments")
def family_assignments(
    family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    """MAP-06b: work from the children's teachers, for Class Island at home, with what each child
    did in class towards it (so it shows as done at home too)."""
    membership(db, user, family_id)
    learners = set(db.scalars(select(Learner.id).where(Learner.family_id == family_id)))
    if not learners:
        return {"assignments": [], "events": []}
    links = db.scalars(select(ClassStudent).where(ClassStudent.learner_id.in_(learners))).all()
    out, pairs = [], []
    for s in links:
        c = db.get(SchoolClass, s.class_id)
        if not c or c.archived_at:
            continue
        by = teacher_name(db, c)
        ids = [x.id for x in class_roster(db, c)]
        groups = groups_of(db, c.id)
        for a in open_assignments(db, c.id):
            if s.id in targets(a, ids, groups):
                out.append(
                    {
                        **assignment_out(a),
                        "learner_id": s.learner_id,
                        "class_name": c.name,
                        "teacher": by,
                    }
                )
                pairs.append((a, s))
    # Only the class side: the family already has its own home events.
    class_side = assignment_events(db, pairs, student_key=lambda st: st.learner_id, home=False)
    return {"assignments": out, "events": class_side}


@router.get("/assignments/{assignment_id}/media/{media_id}")
def assignment_media(
    assignment_id: str,
    media_id: str,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
):
    """A photo or clip in an assigned custom lesson, for the class's tablets and for linked
    families at home (who can't open the teacher's family's media otherwise)."""
    a = db.get(Assignment, assignment_id)
    if (
        not a
        or a.removed_at
        or a.kind != "custom"
        or media_id not in media_ids((a.lesson or {}).get("cards"))
    ):
        raise HTTPException(404, "Not found")
    c = db.get(SchoolClass, a.class_id)
    allowed = c and c.teacher_id == user.id
    if not allowed and c:
        ids = [s.id for s in class_roster(db, c)]
        mine = set(
            db.scalars(
                select(ClassStudent.id)
                .join(Learner, Learner.id == ClassStudent.learner_id)
                .join(FamilyMember, FamilyMember.family_id == Learner.family_id)
                .where(ClassStudent.class_id == c.id, FamilyMember.user_id == user.id)
            )
        )
        allowed = bool(mine & set(targets(a, ids, groups_of(db, c.id))))
    if not allowed:
        raise HTTPException(404, "Not found")
    m = db.get(MediaAsset, media_id)
    if not m or m.status != "ready":
        raise HTTPException(404, "Not ready")
    return RedirectResponse(
        storage.download_url(m.id), status_code=307, headers={"Cache-Control": "no-store"}
    )


# --- Classroom devices and 'Ask my teacher' (CRM-01, CRM-02) -----------------------------------


def own_class_or_none(db: DbSession, user: User, class_id: str) -> SchoolClass | None:
    try:
        return own_class(db, user, class_id)
    except HTTPException:
        return None


def device_out(d: ClassroomDevice) -> dict:
    return {
        "id": d.id,
        "label": d.label,
        "created_at": WHEN(d.created_at),
        "last_seen_at": WHEN(d.last_seen_at),
    }


def devices_of(db: DbSession, class_id: str) -> list[dict]:
    rows = db.scalars(
        select(ClassroomDevice)
        .where(ClassroomDevice.class_id == class_id, ClassroomDevice.removed_at.is_(None))
        .order_by(ClassroomDevice.created_at)
    )
    return [device_out(d) for d in rows]


@router.post("/classes/{class_id}/devices", status_code=201)
def add_device(
    class_id: str, body: DeviceIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    c = own_class(db, user, class_id)
    if not is_ulid(body.id):
        raise HTTPException(422, "device id must be a ULID")
    d = db.get(ClassroomDevice, body.id)
    if d and d.class_id != c.id and own_class_or_none(db, user, d.class_id) is None:
        raise HTTPException(409, "This device belongs to another teacher's class")
    if not d:
        d = ClassroomDevice(id=body.id, class_id=c.id)
        db.add(d)
    # Setting it to another of the teacher's classes moves it.
    d.class_id, d.label, d.removed_at, d.last_seen_at = c.id, body.label, None, utcnow()
    db.commit()
    return device_out(d)


@router.get("/classes/{class_id}/devices/{device_id}")
def device_check(
    class_id: str, device_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    """A class tablet asks at each sync whether it's still set to the class."""
    c = own_class(db, user, class_id)
    d = db.get(ClassroomDevice, device_id)
    active = bool(d and d.class_id == c.id and not d.removed_at)
    if active:
        d.last_seen_at = utcnow()
        db.commit()
    return {"active": active}


@router.delete("/classes/{class_id}/devices/{device_id}", status_code=204)
def remove_device(
    class_id: str, device_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    c = own_class(db, user, class_id)
    d = db.get(ClassroomDevice, device_id)
    if not d or d.class_id != c.id or d.removed_at:
        raise HTTPException(404, "Device not found")
    d.removed_at = utcnow()
    db.commit()


@router.post("/classes/{class_id}/students/{student_id}/help", status_code=204)
def ask_teacher(
    class_id: str, student_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    """CRM-02: a child forgot their pictures. The teacher's dashboard shows them."""
    c = own_class(db, user, class_id)
    own_student(db, c, student_id).help_at = utcnow()
    db.commit()
