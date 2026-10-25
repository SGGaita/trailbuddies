"""Privacy jobs (SAF-03, SAF-04, SAF-05, FAM-03): the family data export, deleting a family or a
learner after the undo window, and the retention rules from concept report §12:

- media from deleted lessons: deleted 30 days after the lesson;
- removed learners: deleted 7 days after removal (undo window);
- deleted families: deleted 7 days after the grown-up confirmed (undo window);
- families nobody opened for 24 months: emailed at 23 months and a week before, then deleted;
- exports: deleted after 7 days; edit history, old sign-in links and invitations: see purge();
- our own error log: 30 days.

Backups (Supabase) expire on their own within 35 days, which the privacy policy says.
"""

import io
import json
import logging
import zipfile
from datetime import datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session as DbSession

from . import mailer
from .db import utcnow
from .models import (
    Consent,
    CustomLesson,
    DataExport,
    EditHistory,
    ErrorReport,
    Event,
    Family,
    FamilyDeletion,
    FamilyMember,
    Feedback,
    Invite,
    Learner,
    LoginToken,
    MediaAsset,
    Session,
    User,
)
from .security import aware
from .settings import get_settings

log = logging.getLogger("trailbuddies.privacy")

UNDO_DAYS = 7
EXPORT_DAYS = 7
MEDIA_DAYS = 30
ERROR_DAYS = 30
HISTORY_DAYS = 30
# Inactivity (SAF-05): warn at 23 months, again a week before 24 months, then delete.
WARN_FIRST_DAYS = 700
DELETE_DAYS = 730
WARN_FINAL_DAYS = DELETE_DAYS - 7
EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
}


def _x(db: DbSession, stmt):
    """Bulk delete/update without matching objects in memory (SQLite keeps naive datetimes)."""
    return db.execute(stmt, execution_options={"synchronize_session": False})


def media_ids(cards: list | None) -> set[str]:
    out = set()
    for c in cards or []:
        for k in ("photo", "voice"):
            if c.get(k):
                out.add(c[k])
    return out


def release_media(db: DbSession, family_id: str, ids: set[str], now: datetime | None = None) -> int:
    """A lesson was deleted: its photos and clips that no other lesson uses start their 30 days."""
    if not ids:
        return 0
    still = set()
    for cards in db.scalars(select(CustomLesson.cards).where(CustomLesson.family_id == family_id)):
        still |= media_ids(cards)
    gone = ids - still
    if not gone:
        return 0
    return _x(
        db,
        update(MediaAsset)
        .where(MediaAsset.family_id == family_id, MediaAsset.id.in_(gone), MediaAsset.released_at.is_(None))
        .values(released_at=now or utcnow()),
    ).rowcount


def claim_media(db: DbSession, family_id: str, ids: set[str]) -> None:
    """A lesson uses these again (a re-made lesson): stop their countdown."""
    if ids:
        _x(
            db,
            update(MediaAsset)
            .where(MediaAsset.family_id == family_id, MediaAsset.id.in_(ids))
            .values(released_at=None),
        )


# --- Export (SAF-03) -------------------------------------------------------------------


def _iso(v):
    return aware(v).isoformat() if isinstance(v, datetime) else v


def _row(obj, fields: list[str]) -> dict:
    return {f: _iso(getattr(obj, f)) for f in fields}


def family_record(db: DbSession, fam: Family) -> dict:
    """Everything we hold about a family, as plain JSON (media listed, files added separately)."""
    members = _x(
        db,
        select(FamilyMember.role, User)
        .join(User, User.id == FamilyMember.user_id)
        .where(FamilyMember.family_id == fam.id),
    ).all()
    fid = fam.id
    return {
        "family": _row(fam, ["id", "name", "country", "plan", "settings", "created_at", "updated_at"]),
        "grown_ups": [
            {"role": role, **_row(u, ["name", "email", "created_at"]), "google_linked": bool(u.google_sub)}
            for role, u in members
        ],
        "learners": [
            _row(
                lr,
                [
                    "id",
                    "name",
                    "birth_year",
                    "birth_month",
                    "avatar_color",
                    "buddy",
                    "outfit",
                    "interests",
                    "placement",
                    "difficulty",
                    "levels",
                    "wish",
                    "removing_at",
                    "created_at",
                    "updated_at",
                ],
            )
            for lr in db.scalars(select(Learner).where(Learner.family_id == fid).order_by(Learner.created_at))
        ],
        "consents": [
            _row(c, ["policy_version", "scopes", "method", "region", "status", "evidence", "given_at"])
            for c in db.scalars(select(Consent).where(Consent.family_id == fid).order_by(Consent.given_at))
        ],
        "custom_lessons": [
            _row(c, ["id", "title", "template", "question", "cards", "assigned", "options", "updated_at"])
            for c in db.scalars(select(CustomLesson).where(CustomLesson.family_id == fid))
        ],
        "media": [
            _row(m, ["id", "kind", "content_type", "bytes", "status", "created_at", "released_at"])
            for m in db.scalars(select(MediaAsset).where(MediaAsset.family_id == fid))
        ],
        "devices": [
            _row(s, ["device_name", "created_at", "last_seen_at"])
            for s in db.scalars(
                select(Session)
                .join(FamilyMember, FamilyMember.user_id == Session.user_id)
                .where(FamilyMember.family_id == fid)
            )
        ],
        "feedback": [
            _row(f, ["kind", "message", "screen", "created_at"])
            for f in db.scalars(select(Feedback).where(Feedback.family_id == fid))
        ],
    }


README = """Your Trailbuddies data
=====================

family.json   your family, grown-ups, learner profiles, consents, custom lessons and devices
progress.json every answer, star, treasure and badge each learner earned (one event per line)
media/        the photos and voice clips grown-ups added to custom lessons

Questions: privacy@trailbuddies.africa
"""


def build_export(db: DbSession, storage, fam: Family) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("README.txt", README)
        z.writestr("family.json", json.dumps(family_record(db, fam), indent=2, ensure_ascii=False))
        lines = []
        for e in db.scalars(select(Event).where(Event.family_id == fam.id).order_by(Event.seq)):
            lines.append(
                json.dumps(
                    {
                        "id": e.id,
                        "learner_id": e.learner_id,
                        "type": e.type,
                        "at": _iso(e.at),
                        "data": e.data,
                    },
                    ensure_ascii=False,
                )
            )
        z.writestr("progress.json", "\n".join(lines))
        for m in db.scalars(
            select(MediaAsset).where(MediaAsset.family_id == fam.id, MediaAsset.status == "ready")
        ):
            data = storage.get(m.id, 5_000_000)
            if data:
                z.writestr(f"media/{m.id}.{EXT.get(m.content_type, 'bin')}", data)
    return buf.getvalue()


def export_key(export_id: str) -> str:
    return f"exports/{export_id}.zip"


# --- Deleting -------------------------------------------------------------------------


def purge_learner(db: DbSession, learner_id: str) -> None:
    _x(db, delete(Event).where(Event.learner_id == learner_id))
    _x(db, delete(EditHistory).where(EditHistory.entity == "learner", EditHistory.entity_id == learner_id))
    _x(db, delete(Learner).where(Learner.id == learner_id))


def purge_family(db: DbSession, storage, family_id: str) -> None:
    """Delete a family and everything in it, including its files. Grown-ups who belong to no
    other family are deleted too. Explicit deletes, so it never relies on ON DELETE CASCADE."""
    for mid in db.scalars(select(MediaAsset.id).where(MediaAsset.family_id == family_id)):
        _quiet(storage.delete, mid)
    for eid in db.scalars(select(DataExport.id).where(DataExport.family_id == family_id)):
        _quiet(storage.delete_key, export_key(eid))
    users = set(db.scalars(select(FamilyMember.user_id).where(FamilyMember.family_id == family_id)))
    for model in (
        Event,
        Learner,
        CustomLesson,
        MediaAsset,
        Consent,
        EditHistory,
        Invite,
        DataExport,
        Feedback,
    ):
        _x(db, delete(model).where(model.family_id == family_id))
    _x(db, delete(FamilyDeletion).where(FamilyDeletion.family_id == family_id))
    _x(db, delete(FamilyMember).where(FamilyMember.family_id == family_id))
    _x(db, delete(Family).where(Family.id == family_id))
    for uid in users:
        if not db.scalar(select(func.count()).select_from(FamilyMember).where(FamilyMember.user_id == uid)):
            email = db.scalar(select(User.email).where(User.id == uid))
            _x(db, delete(Session).where(Session.user_id == uid))
            _x(db, delete(LoginToken).where(LoginToken.email == email))
            _x(db, delete(User).where(User.id == uid))


def _quiet(fn, *args) -> None:
    try:
        fn(*args)
    except Exception:  # noqa: BLE001 - a missing file must not stop the rest of the clean-up
        log.warning("Deleting a stored file failed; it will be retried tomorrow")


def grown_up_emails(db: DbSession, family_id: str) -> list[str]:
    return list(
        db.scalars(
            select(User.email)
            .join(FamilyMember, FamilyMember.user_id == User.id)
            .where(FamilyMember.family_id == family_id, FamilyMember.role.in_(("owner", "parent")))
        )
    )


def touch_family(db: DbSession, fam: Family, now: datetime | None = None) -> None:
    """A grown-up opened the app: reset the inactivity clock (at most once a day)."""
    now = now or utcnow()
    if fam.active_at is None or now - aware(fam.active_at) > timedelta(days=1) or fam.retention_notice:
        fam.active_at = now
        fam.retention_notice = None
        db.commit()


# --- The nightly job -------------------------------------------------------------------


def purge(db: DbSession, now: datetime) -> dict:
    """Edit history older than 30 days, used or expired sign-in links, and old invitations."""
    h = _x(db, delete(EditHistory).where(EditHistory.kept_at < now - timedelta(days=HISTORY_DAYS))).rowcount
    t = _x(db, delete(LoginToken).where(LoginToken.expires_at < now - timedelta(days=1))).rowcount
    i = _x(db, delete(Invite).where(Invite.expires_at < now - timedelta(days=30))).rowcount
    return {"history": h, "tokens": t, "invites": i}


def inactivity(db: DbSession, storage, now: datetime) -> dict:
    out = {"warned": 0, "inactive_deleted": 0}
    web = get_settings().web_url
    for fam in db.scalars(
        select(Family).where(Family.active_at < now - timedelta(days=WARN_FIRST_DAYS))
    ).all():
        idle = (now - aware(fam.active_at)).days
        if idle >= DELETE_DAYS and fam.retention_notice == "final":
            purge_family(db, storage, fam.id)
            out["inactive_deleted"] += 1
            continue
        due = "final" if idle >= WARN_FINAL_DAYS and fam.retention_notice == "first" else None
        if fam.retention_notice is None:
            due = "first"
        if not due:
            continue
        when = (aware(fam.active_at) + timedelta(days=DELETE_DAYS)).date().isoformat()
        for to in grown_up_emails(db, fam.id):
            mailer.send_notice(
                to,
                "Your Trailbuddies family will be deleted soon"
                if due == "final"
                else "We miss you at Trailbuddies",
                [
                    "Nobody has opened your family's Trailbuddies account for a long time.",
                    f"To keep children's data only as long as it's used, we'll delete the family on {when}.",
                    "To keep it, just open Trailbuddies and sign in before then.",
                ],
                web,
                "Open Trailbuddies",
            )
        fam.retention_notice = due
        out["warned"] += 1
    return out


def daily(db: DbSession, storage, now: datetime | None = None) -> dict:
    """Everything the nightly job does (Vercel Cron, or the arq worker in Docker)."""
    now = now or utcnow()
    out = purge(db, now)
    deletions = db.scalars(
        select(FamilyDeletion.family_id).where(
            FamilyDeletion.purge_after.is_not(None), FamilyDeletion.purge_after <= now
        )
    ).all()
    for fid in deletions:
        purge_family(db, storage, fid)
    out["families_deleted"] = len(deletions)
    # Unconfirmed deletion requests whose link expired.
    _x(
        db,
        delete(FamilyDeletion).where(
            FamilyDeletion.confirmed_at.is_(None), FamilyDeletion.token_expires_at < now
        ),
    )
    learners = db.scalars(
        select(Learner.id).where(
            Learner.removing_at.is_not(None), Learner.removing_at <= now - timedelta(days=UNDO_DAYS)
        )
    ).all()
    for lid in learners:
        purge_learner(db, lid)
    out["learners_deleted"] = len(learners)
    old_media = db.scalars(
        select(MediaAsset).where(
            MediaAsset.released_at.is_not(None), MediaAsset.released_at <= now - timedelta(days=MEDIA_DAYS)
        )
    ).all()
    for m in old_media:
        _quiet(storage.delete, m.id)
        db.delete(m)
    out["media_deleted"] = len(old_media)
    old_exports = db.scalars(select(DataExport).where(DataExport.expires_at <= now)).all()
    for e in old_exports:
        _quiet(storage.delete_key, export_key(e.id))
        db.delete(e)
    out["exports_deleted"] = len(old_exports)
    out["errors_deleted"] = _x(
        db, delete(ErrorReport).where(ErrorReport.at < now - timedelta(days=ERROR_DAYS))
    ).rowcount
    out.update(inactivity(db, storage, now))
    db.commit()
    return out
