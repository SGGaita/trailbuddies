"""Badge Studio and wishes (BST-01…07, BDG-07).

Family badges and wishes work like custom lessons: the id is made on the device, the newest
edit wins and replaced versions are kept for 30 days. Whether a badge was earned, and where a
wish stands, comes from the children's events, so a grown-up's award or answer made on a phone
reaches the child's tablet through sync.

Class badges belong to a class. The teacher awards them here, which records the award in the
class's history (separate from any family's) with a snapshot of the design.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..ids import is_ulid, ulid
from ..models import ClassEvent, ClassStudent, CustomBadge, CustomLesson, Learner, User, Wish
from ..privacy import claim_media, release_media
from ..schemas import AwardIn, BadgeIn, WishIn
from ..security import aware, current_user, membership
from .families import keep, require_consent
from .teach import may_sync, own_class

router = APIRouter()

FAMILY_RULES = {"manual", "lesson", "count", "streak", "mastery", "combo"}
CLASS_RULES = {"manual", "count", "streak", "assignment", "combo"}


def iso(dt) -> str:
    return aware(dt).isoformat().replace("+00:00", "Z")


def badge_out(b: CustomBadge) -> dict:
    return {
        "id": b.id,
        "name": b.name,
        **{k: b.design.get(k) for k in ("shape", "colour", "icon")},
        "photo": b.design.get("photo"),
        "note": b.note,
        "voice": b.voice,
        "rule": b.rule,
        "treasures": b.treasures,
        "reward": b.reward,
        "audience": b.audience,
        "source_share": b.source_share,
        "updated_at": iso(b.updated_at),
    }


def snapshot(b: CustomBadge) -> dict:
    """The design an award carries (packages/domain badgeSnapshot), so it outlives the badge."""
    out = {"name": b.name, **{k: b.design.get(k) for k in ("shape", "colour", "icon")}}
    for k, v in (
        ("photo", b.design.get("photo")),
        ("note", b.note),
        ("voice", b.voice),
        ("reward", b.reward),
    ):
        if v:
            out[k] = v
    return out


def badge_media(b: CustomBadge | None) -> set[str]:
    return {m for m in ((b.design or {}).get("photo"), b.voice) if m} if b else set()


def rule_types(rule: dict) -> set[str]:
    return {rule["type"], *(r["type"] for r in rule.get("all", []))}


def rule_lessons(rule: dict) -> set[str]:
    return {r["lesson"] for r in [rule, *rule.get("all", [])] if r.get("lesson")}


def check_badge(body: BadgeIn, allowed: set[str], audience_ok: bool) -> dict:
    if not body.name:
        raise HTTPException(422, "name")
    rule = body.rule.model_dump()
    if not rule_types(rule) <= allowed:
        raise HTTPException(422, "rule")
    if not audience_ok:
        raise HTTPException(422, "audience")
    return rule


def save_badge(
    db: DbSession, b: CustomBadge | None, badge_id: str, body: BadgeIn, rule: dict, owner: dict, user
):
    fields = {
        "name": body.name,
        "design": {
            "shape": body.shape,
            "colour": body.colour,
            "icon": body.icon,
            **({"photo": body.photo} if body.photo else {}),
        },
        "note": body.note or None,
        "voice": body.voice,
        "rule": rule,
        "treasures": body.treasures,
        "reward": body.reward or None,
        "audience": body.audience,
    }
    if not b:
        b = CustomBadge(
            id=badge_id,
            created_by=user.id,
            created_at=utcnow(),
            updated_at=body.updated_at,
            **owner,
            **fields,
        )
        db.add(b)
        return b, "new"
    if aware(body.updated_at) <= aware(b.updated_at):
        return b, "late"
    before = badge_out(b)
    for k, v in fields.items():
        setattr(b, k, v)
    b.updated_at = body.updated_at
    return b, before


# ---------- family badges ----------


@router.get("/families/{family_id}/badges")
def list_badges(family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    membership(db, user, family_id)
    rows = db.scalars(select(CustomBadge).where(CustomBadge.family_id == family_id).order_by(CustomBadge.id))
    return {"badges": [badge_out(b) for b in rows]}


@router.put("/families/{family_id}/badges/{badge_id}")
def put_badge(
    family_id: str,
    badge_id: str,
    body: BadgeIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    membership(db, user, family_id, write=True)
    require_consent(db, family_id)
    if not is_ulid(badge_id):
        raise HTTPException(422, "badge id must be a ULID")
    kids = set(db.scalars(select(Learner.id).where(Learner.family_id == family_id)))
    rule = check_badge(
        body, FAMILY_RULES, isinstance(body.audience, list) and all(a in kids for a in body.audience)
    )
    lessons = set(db.scalars(select(CustomLesson.id).where(CustomLesson.family_id == family_id)))
    if not rule_lessons(rule) <= lessons:
        raise HTTPException(422, "rule")
    b = db.get(CustomBadge, badge_id)
    if b and b.family_id != family_id:
        raise HTTPException(404, "Badge not found")
    had = badge_media(b)
    b, before = save_badge(db, b, badge_id, body, rule, {"family_id": family_id}, user)
    if before == "late":  # an older edit arrived after a newer one: keep it, don't apply
        keep(db, family_id, "badge", badge_id, body.model_dump(mode="json"), "lost")
    elif before != "new":
        keep(db, family_id, "badge", badge_id, before, "replaced")
    claim_media(db, family_id, badge_media(b))
    db.flush()
    release_media(db, family_id, had - badge_media(b))
    db.commit()
    return badge_out(b)


@router.delete("/families/{family_id}/badges/{badge_id}", status_code=204)
def delete_badge(
    family_id: str, badge_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    """Deletes the badge; children who earned it keep it (BDG-07)."""
    membership(db, user, family_id, write=True)
    b = db.get(CustomBadge, badge_id)
    if not b or b.family_id != family_id:
        raise HTTPException(404, "Badge not found")
    keep(db, family_id, "badge", badge_id, badge_out(b), "deleted")
    used = badge_media(b)
    db.delete(b)
    db.flush()
    release_media(db, family_id, used)
    db.commit()


# ---------- wishes ----------


def wish_out(w: Wish) -> dict:
    return {
        "id": w.id,
        "learner_id": w.learner_id,
        "title": w.title,
        "price": w.price,
        "emoji": w.emoji,
        "updated_at": iso(w.updated_at),
    }


@router.get("/families/{family_id}/wishes")
def list_wishes(family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)):
    membership(db, user, family_id)
    rows = db.scalars(select(Wish).where(Wish.family_id == family_id).order_by(Wish.id))
    return {"wishes": [wish_out(w) for w in rows]}


@router.put("/families/{family_id}/wishes/{wish_id}")
def put_wish(
    family_id: str,
    wish_id: str,
    body: WishIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    membership(db, user, family_id, write=True)
    require_consent(db, family_id)
    if not is_ulid(wish_id):
        raise HTTPException(422, "wish id must be a ULID")
    if not body.title:
        raise HTTPException(422, "title")
    lr = db.get(Learner, body.learner_id)
    if not lr or lr.family_id != family_id:
        raise HTTPException(422, "Wishes are for this family's learners")
    w = db.get(Wish, wish_id)
    if w and w.family_id != family_id:
        raise HTTPException(404, "Wish not found")
    fields = {"learner_id": body.learner_id, "title": body.title, "price": body.price, "emoji": body.emoji}
    if not w:
        w = Wish(
            id=wish_id,
            family_id=family_id,
            created_by=user.id,
            created_at=utcnow(),
            updated_at=body.updated_at,
            **fields,
        )
        db.add(w)
    elif aware(body.updated_at) <= aware(w.updated_at):
        keep(db, family_id, "wish", wish_id, body.model_dump(mode="json"), "lost")
    else:
        keep(db, family_id, "wish", wish_id, wish_out(w), "replaced")
        for k, v in fields.items():
            setattr(w, k, v)
        w.updated_at = body.updated_at
    db.commit()
    return wish_out(w)


@router.delete("/families/{family_id}/wishes/{wish_id}", status_code=204)
def delete_wish(
    family_id: str, wish_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    membership(db, user, family_id, write=True)
    w = db.get(Wish, wish_id)
    if not w or w.family_id != family_id:
        raise HTTPException(404, "Wish not found")
    keep(db, family_id, "wish", wish_id, wish_out(w), "deleted")
    db.delete(w)
    db.commit()


# ---------- class badges (T05) ----------


@router.get("/classes/{class_id}/badges")
def list_class_badges(
    class_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
):
    c = own_class(db, user, class_id)
    rows = db.scalars(select(CustomBadge).where(CustomBadge.class_id == c.id).order_by(CustomBadge.id))
    return {"badges": [badge_out(b) for b in rows]}


@router.put("/classes/{class_id}/badges/{badge_id}")
def put_class_badge(
    class_id: str,
    badge_id: str,
    body: BadgeIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    c = own_class(db, user, class_id)
    if not is_ulid(badge_id):
        raise HTTPException(422, "badge id must be a ULID")
    if body.photo or body.voice:  # class badges are drawn from the icons (photos come with sharing checks)
        raise HTTPException(422, "design")
    roster = set(db.scalars(select(ClassStudent.id).where(ClassStudent.class_id == c.id)))
    audience_ok = body.audience == "class" or all(a in roster for a in body.audience)
    rule = check_badge(body, CLASS_RULES, audience_ok)
    b = db.get(CustomBadge, badge_id)
    if b and b.class_id != c.id:
        raise HTTPException(404, "Badge not found")
    b, _ = save_badge(db, b, badge_id, body, rule, {"class_id": c.id}, user)
    db.commit()
    return badge_out(b)


@router.delete("/classes/{class_id}/badges/{badge_id}", status_code=204)
def delete_class_badge(
    class_id: str, badge_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    """Deletes the badge; children who earned it keep it in the class's history (BDG-07)."""
    c = own_class(db, user, class_id)
    b = db.get(CustomBadge, badge_id)
    if not b or b.class_id != c.id:
        raise HTTPException(404, "Badge not found")
    db.delete(b)
    db.commit()


@router.post("/classes/{class_id}/badges/{badge_id}/award")
def award_class_badge(
    class_id: str,
    badge_id: str,
    body: AwardIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
):
    """BST-05 for teachers: award to some children, a group or the whole class. A child who
    already has the badge keeps the one they have (a badge is earned once); a child whose play
    can't be saved yet (no school agreement, no linked parent) is skipped with the reason."""
    c = own_class(db, user, class_id)
    b = db.get(CustomBadge, badge_id)
    if not b or b.class_id != c.id:
        raise HTTPException(404, "Badge not found")
    students = {
        s.id: s
        for s in db.scalars(
            select(ClassStudent).where(ClassStudent.class_id == c.id, ClassStudent.id.in_(body.student_ids))
        )
    }
    # Who already has it. The badge id is inside the event's JSON, which databases filter
    # differently, so it's checked here.
    earned = {
        e.student_id
        for e in db.scalars(
            select(ClassEvent).where(
                ClassEvent.class_id == c.id,
                ClassEvent.type == "badge_awarded",
                ClassEvent.student_id.in_(list(students)),
            )
        )
        if (e.data or {}).get("badgeId") == b.id
    }
    awarded, skipped = [], []
    now = utcnow()
    for sid in dict.fromkeys(body.student_ids):
        s = students.get(sid)
        if not s:
            skipped.append({"id": sid, "reason": "not in this class"})
        elif b.audience != "class" and sid not in b.audience:
            skipped.append({"id": sid, "reason": "not for this child"})
        elif sid in earned:
            skipped.append({"id": sid, "reason": "already earned"})
        elif not may_sync(db, c, s):
            skipped.append({"id": sid, "reason": "school_consent"})
        else:
            ms = int(now.timestamp() * 1000)
            data = {"badgeId": b.id, "name": b.name, "custom": snapshot(b), "manual": True}
            db.add(
                ClassEvent(
                    id=ulid(ms), class_id=c.id, student_id=sid, type="badge_awarded", at=now, data=data
                )
            )
            if b.treasures:
                db.add(
                    ClassEvent(
                        id=ulid(ms),
                        class_id=c.id,
                        student_id=sid,
                        type="treasure_earned",
                        at=now,
                        data={"amount": b.treasures, "reason": "badge", "badgeId": b.id},
                    )
                )
            awarded.append(sid)
    db.commit()
    return {"awarded": awarded, "skipped": skipped}
