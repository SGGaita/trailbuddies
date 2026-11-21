"""Sharing by code (SHR-01…05). Mirrors packages/domain/src/shares.js.

The server builds every package itself from the family's (or class's) own rows, keeping only
cards, media, templates, lesson settings and badge designs (SHR-04). Nothing about children
travels: no learner or student ids, who a lesson is assigned to, progress, names or
recordings children made.
"""

import secrets
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from .models import Share

JOIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # packages/domain/src/classes.js
SHARE_DAYS = 30
REPORT_THRESHOLD = 3
REVIEW_HOURS = 24
LESSON_FIELDS = ("title", "template", "question", "puzzle_card")
CARD_FIELDS = ("id", "label", "emoji", "photo", "voice", "group", "fact", "number")
OPTION_FIELDS = ("band", "activities", "hints", "games")
PORTABLE = {"count", "streak", "assignment"}
REASONS = {
    "child-photo": "a photo of a child",
    "personal-details": "names or personal details",
    "unkind": "unkind or upsetting content",
    "not-for-children": "not suitable for children",
    "other": "something else",
    "nudity": "the image check flagged it",
    "review": "new share with photos or voice clips",
}


def normalise(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def fmt(code: str) -> str:
    return f"{code[:3]}-{code[3:]}"


def new_code(db: DbSession) -> str:
    while True:
        code = "".join(secrets.choice(JOIN_ALPHABET) for _ in range(6))
        if not db.scalar(select(Share.id).where(Share.code == code)):
            return code


def expiry(now):
    return now + timedelta(days=SHARE_DAYS)


def _pick(obj: dict, keys) -> dict:
    return {k: obj[k] for k in keys if obj.get(k) is not None}


def portable_rule(rule: dict) -> dict:
    """A badge set's lesson and mastery conditions belong to the sender's lessons: dropped."""
    if rule.get("type") == "combo":
        keep = [r for r in rule.get("all", []) if r.get("type") in PORTABLE]
        if len(keep) >= 2:
            return {"type": "combo", "op": rule["op"], "all": keep}
        return keep[0] if keep else {"type": "manual"}
    return rule if rule.get("type") in PORTABLE else {"type": "manual"}


def lesson_package(lesson, voice: bool, removed: set[str]) -> dict:
    cards = []
    for c in lesson.cards or []:
        card = _pick(c, CARD_FIELDS)
        if card.get("photo") in removed:
            card.pop("photo")
        if not voice or card.get("voice") in removed:
            card.pop("voice", None)
        cards.append(card)
    out = _pick({k: getattr(lesson, k) for k in LESSON_FIELDS}, LESSON_FIELDS)
    return {**out, "cards": cards, "options": _pick(lesson.options or {}, OPTION_FIELDS)}


def badge_package(b, voice: bool, removed: set[str]) -> dict:
    design = {k: (b.design or {}).get(k) for k in ("shape", "colour", "icon")}
    photo = (b.design or {}).get("photo")
    if photo and photo not in removed:
        design["photo"] = photo
    out = {"name": b.name, "design": design, "rule": portable_rule(b.rule or {}), "treasures": b.treasures}
    if b.note:
        out["note"] = b.note
    if b.reward:
        out["reward"] = b.reward
    if voice and b.voice and b.voice not in removed:
        out["voice"] = b.voice
    return out


def package_media(pkg: dict) -> list[str]:
    out: list[str] = []
    for lesson in pkg.get("lessons", []):
        for c in lesson.get("cards", []):
            out += [c[k] for k in ("photo", "voice") if c.get(k)]
    for b in pkg.get("badges", []):
        out += [m for m in ((b.get("design") or {}).get("photo"), b.get("voice")) if m]
    return list(dict.fromkeys(out))


def photos_of(pkg: dict) -> set[str]:
    out = {c["photo"] for lesson in pkg.get("lessons", []) for c in lesson.get("cards", []) if c.get("photo")}
    return out | {b["design"]["photo"] for b in pkg.get("badges", []) if b.get("design", {}).get("photo")}
