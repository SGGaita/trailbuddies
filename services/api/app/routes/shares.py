"""Share codes (SHR-01…05, P17 and P23).

- ``POST /families/{id}/shares`` (or ``/classes/{id}/shares`` for a teacher's class badges)
  makes a code after the safety checklist (SHR-03). The server builds the package from its
  own rows (SHR-04). A share with photos or voice clips waits for the safety team.
- ``GET /shares/{code}`` previews a live share; ``POST /shares/{code}/import`` makes the
  family's (or class's) own copy, with the files copied too, so later edits by the creator
  and a revoked code never change it (SHR-02).
- ``POST /shares/{share_id}/reports`` reports an imported copy (SHR-05).
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..ids import ulid
from ..models import (
    CustomBadge,
    CustomLesson,
    FamilyMember,
    Learner,
    MediaAsset,
    SchoolClass,
    Share,
    User,
)
from ..moderation import add_report, open_item
from ..schemas import ImportIn, ReportIn, ShareIn
from ..security import aware, current_user, membership
from ..shares import (
    badge_package,
    expiry,
    fmt,
    lesson_package,
    new_code,
    normalise,
    package_media,
    photos_of,
    portable_rule,
)
from ..storage import get_storage
from .families import require_consent
from .lessons import lesson_out
from .rewards import badge_out, iso
from .teach import own_class

router = APIRouter()

KIND_SIZES = {"lesson": (1, 1), "trail": (2, 6), "badges": (1, 6)}


def state(s: Share) -> str:
    if s.status == "live" and aware(s.expires_at) <= utcnow():
        return "expired"
    return s.status


def share_out(s: Share) -> dict:
    pkg = s.package or {}
    return {
        "id": s.id,
        "code": fmt(s.code),
        "kind": s.kind,
        "title": s.title,
        "status": state(s),
        "created_at": iso(s.created_at),
        "expires_at": iso(s.expires_at),
        "imports": s.imports,
        "lessons": len(pkg.get("lessons", [])),
        "badges": len(pkg.get("badges", [])),
        "cards": sum(len(lesson.get("cards", [])) for lesson in pkg.get("lessons", [])),
    }


def gone(s: Share | None) -> None:
    """Explain why a code can't be used (P23), or nothing when it's live."""
    if not s:
        raise HTTPException(404, {"code": "not_found", "message": "We couldn't find that code."})
    st = state(s)
    if st == "review":
        raise HTTPException(
            423,
            {"code": "review", "message": "This code is being checked by our safety team. Try again later."},
        )
    if st != "live":
        raise HTTPException(410, {"code": "gone", "message": "This code is no longer available."})


def by_code(db: DbSession, code: str) -> Share | None:
    return db.scalar(select(Share).where(Share.code == normalise(code)))


def build(db: DbSession, body: ShareIn, lessons_q, badges_q, owner_media) -> tuple[dict, list[str]]:
    lo, hi = KIND_SIZES[body.kind]
    ids = list(dict.fromkeys(body.ids))
    if not lo <= len(ids) <= hi:
        raise HTTPException(422, {"code": "size", "message": "Choose what to share."})
    removed = set(body.checklist.removed)
    if body.kind == "badges":
        rows = {b.id: b for b in db.scalars(badges_q.where(CustomBadge.id.in_(ids)))}
        if len(rows) != len(ids):
            raise HTTPException(404, "Badge not found")
        pkg = {"badges": [badge_package(rows[i], body.voice, removed) for i in ids], "lessons": []}
    else:
        rows = {c.id: c for c in db.scalars(lessons_q.where(CustomLesson.id.in_(ids)))}
        if len(rows) != len(ids):
            raise HTTPException(404, "Lesson not found")
        pkg = {"lessons": [lesson_package(rows[i], body.voice, removed) for i in ids], "badges": []}
    title = body.title or (pkg["lessons"] or pkg["badges"])[0].get("title") or pkg["badges"][0]["name"]
    pkg = {"kind": body.kind, "title": title, **pkg}
    media = package_media(pkg)
    if photos_of(pkg) and not body.checklist.faces_checked:
        raise HTTPException(422, {"code": "checklist", "message": "Check the photos for faces first."})
    if media:
        ok = set(
            db.scalars(
                select(MediaAsset.id).where(
                    MediaAsset.id.in_(media), MediaAsset.status == "ready", owner_media
                )
            )
        )
        if ok != set(media):
            raise HTTPException(
                409,
                {
                    "code": "media_not_ready",
                    "message": "Some photos or clips haven't finished uploading yet.",
                },
            )
    return pkg, media


def create(db: DbSession, user: User, body: ShareIn, pkg: dict, media: list[str], owner: dict) -> Share:
    now = utcnow()
    s = Share(
        id=ulid(),
        code=new_code(db),
        kind=body.kind,
        title=pkg["title"][:60],
        package=pkg,
        media=media,
        checklist={
            "no_names": True,
            "faces_checked": body.checklist.faces_checked,
            "not_child": sorted(set(body.checklist.not_child) & set(media)),
            "removed": sorted(set(body.checklist.removed)),
            "voice": body.voice,
            "by": user.id,
            "at": iso(now),
        },
        status="review" if media else "live",
        created_by=user.id,
        created_at=now,
        expires_at=expiry(now),
        **owner,
    )
    db.add(s)
    db.flush()
    if media:  # "Open models + your review": photos and clips wait for the safety team
        open_item(db, "share", "review", share_id=s.id)
    return s


def checked(user: User, body: ShareIn) -> None:
    if user.share_banned_at:
        raise HTTPException(403, {"code": "banned", "message": "Sharing is switched off for this account."})
    if not body.checklist.no_names:  # SHR-03 scenario 2
        raise HTTPException(422, {"code": "checklist", "message": "Confirm there are no names or addresses."})


# ---------- a family's shares ----------


@router.post("/families/{family_id}/shares", status_code=201)
def share_family(
    family_id: str, body: ShareIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    membership(db, user, family_id, write=True)
    require_consent(db, family_id)
    checked(user, body)
    pkg, media = build(
        db,
        body,
        select(CustomLesson).where(CustomLesson.family_id == family_id),
        select(CustomBadge).where(CustomBadge.family_id == family_id),
        MediaAsset.family_id == family_id,
    )
    s = create(db, user, body, pkg, media, {"family_id": family_id})
    db.commit()
    return share_out(s)


@router.get("/families/{family_id}/shares")
def family_shares(
    family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    membership(db, user, family_id)
    rows = db.scalars(select(Share).where(Share.family_id == family_id).order_by(Share.created_at.desc()))
    return {"shares": [share_out(s) for s in rows]}


@router.delete("/families/{family_id}/shares/{share_id}", status_code=204)
def revoke_family_share(
    family_id: str, share_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    """SHR-01 scenario 2: the code stops working; copies already made stay."""
    membership(db, user, family_id, write=True)
    s = db.get(Share, share_id)
    if not s or s.family_id != family_id:
        raise HTTPException(404, "Share not found")
    if s.status in ("live", "review"):
        s.status = "revoked"
    db.commit()


@router.get("/families/{family_id}/media-hidden")
def hidden_media(
    family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    """Photos the image check flagged or the safety team hid: shown as a placeholder."""
    membership(db, user, family_id)
    rows = db.scalars(
        select(MediaAsset.id).where(
            MediaAsset.family_id == family_id, MediaAsset.status.in_(("flagged", "hidden"))
        )
    )
    return {"hidden": list(rows)}


# ---------- a teacher's class badges ----------


@router.post("/classes/{class_id}/shares", status_code=201)
def share_class(
    class_id: str, body: ShareIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    c = own_class(db, user, class_id)
    checked(user, body)
    if body.kind != "badges":
        raise HTTPException(422, {"code": "kind", "message": "Classes share badges."})
    pkg, media = build(db, body, None, select(CustomBadge).where(CustomBadge.class_id == c.id), False)
    s = create(db, user, body, pkg, media, {"class_id": c.id})
    db.commit()
    return share_out(s)


@router.get("/classes/{class_id}/shares")
def class_shares(
    class_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    c = own_class(db, user, class_id)
    rows = db.scalars(select(Share).where(Share.class_id == c.id).order_by(Share.created_at.desc()))
    return {"shares": [share_out(s) for s in rows]}


@router.delete("/classes/{class_id}/shares/{share_id}", status_code=204)
def revoke_class_share(
    class_id: str, share_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    c = own_class(db, user, class_id)
    s = db.get(Share, share_id)
    if not s or s.class_id != c.id:
        raise HTTPException(404, "Share not found")
    if s.status in ("live", "review"):
        s.status = "revoked"
    db.commit()


# ---------- import by code (P23) ----------


def is_own(db: DbSession, user: User, s: Share) -> bool:
    if s.family_id:
        return bool(
            db.scalar(
                select(FamilyMember.user_id).where(
                    FamilyMember.family_id == s.family_id, FamilyMember.user_id == user.id
                )
            )
        )
    c = db.get(SchoolClass, s.class_id)
    return bool(c and c.teacher_id == user.id)


@router.get("/shares/{code}")
def preview(code: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)) -> dict:
    """SHR-02 scenario 1: the cards before importing. Signed-in grown-ups only."""
    s = by_code(db, code)
    gone(s)
    creator = db.get(User, s.created_by) if s.created_by else None
    return {
        **share_out(s),
        "by": (creator.name if creator and creator.name else "a Trailbuddies grown-up"),
        "own": is_own(db, user, s),
        "package": s.package,
    }


@router.get("/shares/{code}/media/{media_id}")
def preview_media(
    code: str,
    media_id: str,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
):
    s = by_code(db, code)
    gone(s)
    m = db.get(MediaAsset, media_id)
    if media_id not in (s.media or []) or not m or m.status != "ready":
        raise HTTPException(404, {"code": "hidden"})
    return RedirectResponse(
        storage.download_url(m.id), status_code=307, headers={"Cache-Control": "no-store"}
    )


def copy_media(db: DbSession, storage, ids: list[str], family_id: str, user: User) -> dict[str, str]:
    """Each file is copied into the importing family, remembering where it came from, so the
    safety team can hide it everywhere at once (MOD-02). Hidden files aren't copied."""
    out = {}
    for m in db.scalars(select(MediaAsset).where(MediaAsset.id.in_(ids), MediaAsset.status == "ready")):
        new = ulid()
        storage.copy(m.id, new)
        db.add(
            MediaAsset(
                id=new,
                family_id=family_id,
                kind=m.kind,
                content_type=m.content_type,
                bytes=m.bytes,
                status="ready",
                created_by=m.created_by,
                checked_at=m.checked_at,
                origin_id=m.origin_id or m.id,
            )
        )
        out[m.id] = new
    return out


def family_rule(rule: dict) -> dict:
    """Families have no assignments: those conditions are left out."""
    if rule.get("type") == "combo":
        keep = [r for r in rule["all"] if r["type"] != "assignment"]
        return portable_rule({**rule, "all": keep})
    return {"type": "manual"} if rule.get("type") == "assignment" else rule


@router.post("/shares/{code}/import", status_code=201)
def import_share(
    code: str,
    body: ImportIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
) -> dict:
    s = by_code(db, code)
    gone(s)
    pkg = s.package
    now = utcnow()
    lessons, badges = [], []
    if body.class_id:
        c = own_class(db, user, body.class_id)
        if pkg.get("lessons"):
            raise HTTPException(422, {"code": "kind", "message": "Lessons go into a family's library."})
        for b in pkg.get("badges", []):
            row = CustomBadge(
                id=ulid(),
                class_id=c.id,
                name=b["name"],
                design={k: b["design"][k] for k in ("shape", "colour", "icon")},  # class badges: icons only
                note=b.get("note"),
                voice=None,
                rule=b["rule"],
                treasures=b["treasures"],
                reward=b.get("reward"),
                audience="class",
                source_share=s.id,
                created_by=user.id,
                created_at=now,
                updated_at=now,
            )
            db.add(row)
            badges.append(row)
    else:
        membership(db, user, body.family_id, write=True)
        require_consent(db, body.family_id)
        moved = copy_media(db, storage, s.media or [], body.family_id, user)

        def m(mid):
            return moved.get(mid) if mid else None

        for lesson in pkg.get("lessons", []):
            cards = []
            for card in lesson["cards"]:
                card = {**card}
                for k in ("photo", "voice"):
                    if card.get(k):
                        card[k] = m(card[k])
                        if not card[k]:
                            card.pop(k)
                cards.append(card)
            row = CustomLesson(
                id=ulid(),
                family_id=body.family_id,
                title=lesson["title"],
                template=lesson["template"],
                question=lesson.get("question"),
                puzzle_card=lesson.get("puzzle_card"),
                cards=cards,
                assigned=[],
                version=1,
                options=lesson.get("options") or {},
                source_share=s.id,
                created_by=user.id,
                created_at=now,
                updated_at=now,
            )
            db.add(row)
            lessons.append(row)
        kids = list(db.scalars(select(Learner.id).where(Learner.family_id == body.family_id)))
        for b in pkg.get("badges", []):
            photo = m(b["design"].get("photo"))
            row = CustomBadge(
                id=ulid(),
                family_id=body.family_id,
                name=b["name"],
                design={
                    **{k: b["design"][k] for k in ("shape", "colour", "icon")},
                    **({"photo": photo} if photo else {}),
                },
                note=b.get("note"),
                voice=m(b.get("voice")),
                rule=family_rule(b["rule"]),
                treasures=b["treasures"],
                reward=b.get("reward"),
                audience=kids,
                source_share=s.id,
                created_by=user.id,
                created_at=now,
                updated_at=now,
            )
            db.add(row)
            badges.append(row)
    s.imports = (s.imports or 0) + 1
    db.commit()
    return {"lessons": [lesson_out(x) for x in lessons], "badges": [badge_out(x) for x in badges]}


# ---------- reports (SHR-05) ----------


@router.post("/shares/{share_id}/reports", status_code=201)
def report(
    share_id: str, body: ReportIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    """From an imported copy: the report goes to the queue; three families suspend the code."""
    membership(db, user, body.family_id)
    s = db.get(Share, share_id)
    has_copy = s and db.scalar(
        select(CustomLesson.id)
        .where(CustomLesson.family_id == body.family_id, CustomLesson.source_share == share_id)
        .union_all(
            select(CustomBadge.id).where(
                CustomBadge.family_id == body.family_id, CustomBadge.source_share == share_id
            )
        )
        .limit(1)
    )
    if not s or not has_copy or s.family_id == body.family_id:
        raise HTTPException(404, "Share not found")
    out = add_report(db, s, body.family_id, body.reason, body.note)
    db.commit()
    return out
