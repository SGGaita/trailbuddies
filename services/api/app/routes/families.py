"""Families, consent and learner profiles. Profile edits carry the device's edit time and
the newest edit wins, so two devices editing offline settle the same way everywhere."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..ids import is_ulid, ulid
from ..models import Consent, Event, Family, FamilyMember, Learner, User
from ..schemas import ConsentIn, FamilyIn, FamilyPatch, FamilySettings, LearnerIn
from ..security import aware, current_user, membership
from ..settings import get_settings

router = APIRouter()

# What the consent screen summarises; the full policy lives on the website.
POLICY = {
    "collect": [
        "Your name and email, to sign you in.",
        "Each learner's first name or nickname and birth month and year, to pick the right lessons.",
        "What each learner answers and earns, to show progress and choose what to practise.",
    ],
    "never": [
        "No ads and no tracking or analytics companies.",
        "No surname, school, address or exact birthday for children.",
        "Children can't chat or type messages to anyone.",
    ],
    "scopes": {
        "progress": {"label": "Save progress so it follows each child to every device", "required": True},
        "voice": {"label": "Let grown-ups record their own voice for lessons (later)", "required": False},
        "photos": {"label": "Let grown-ups add their own photos to lessons (later)", "required": False},
    },
}


def learner_out(lr: Learner) -> dict:
    return {
        "id": lr.id,
        "name": lr.name,
        "birth_year": lr.birth_year,
        "birth_month": lr.birth_month,
        "avatar_color": lr.avatar_color,
        "buddy": lr.buddy,
        "outfit": lr.outfit or {},
        "interests": lr.interests or [],
        "placement": lr.placement or {},
        "difficulty": lr.difficulty,
        "updated_at": aware(lr.updated_at).isoformat(),
    }


def latest_consent(db: DbSession, family_id: str) -> Consent | None:
    return db.scalar(
        select(Consent).where(Consent.family_id == family_id).order_by(Consent.given_at.desc()).limit(1)
    )


def family_out(db: DbSession, fam: Family, role: str) -> dict:
    c = latest_consent(db, fam.id)
    return {
        "id": fam.id,
        "name": fam.name,
        "country": fam.country,
        "plan": fam.plan,
        "role": role,
        "settings": FamilySettings(**(fam.settings or {})).model_dump(),
        "pin": fam.pin,
        "updated_at": aware(fam.updated_at).isoformat(),
        "consent": {
            "policy_version": c.policy_version,
            "scopes": c.scopes,
            "given_at": aware(c.given_at).isoformat(),
        }
        if c
        else None,
        "learners": [learner_out(lr) for lr in sorted(fam.learners, key=lambda x: x.created_at)],
    }


def families_for(db: DbSession, user: User) -> list[dict]:
    rows = db.execute(
        select(Family, FamilyMember.role)
        .join(FamilyMember, FamilyMember.family_id == Family.id)
        .where(FamilyMember.user_id == user.id)
        .order_by(Family.created_at)
    ).all()
    return [family_out(db, fam, role) for fam, role in rows]


@router.get("/policy")
def policy() -> dict:
    return {"version": get_settings().policy_version, **POLICY}


@router.post("/families", status_code=201)
def create_family(
    body: FamilyIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    fam = Family(
        id=ulid(),
        name=body.name.strip(),
        country=body.country,
        settings=FamilySettings().model_dump(),
        updated_at=utcnow(),
    )
    db.add(fam)
    db.add(FamilyMember(family_id=fam.id, user_id=user.id, role="owner"))
    db.commit()
    return family_out(db, fam, "owner")


@router.get("/families/{family_id}")
def get_family(
    family_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    m = membership(db, user, family_id)
    return family_out(db, db.get(Family, family_id), m.role)


@router.patch("/families/{family_id}")
def patch_family(
    family_id: str,
    body: FamilyPatch,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    m = membership(db, user, family_id, write=True)
    fam = db.get(Family, family_id)
    if aware(body.updated_at) > aware(fam.updated_at):  # last edit wins
        if body.name is not None:
            fam.name = body.name.strip()
        if body.country is not None:
            fam.country = FamilyIn(name=fam.name, country=body.country).country
        if body.settings is not None:
            fam.settings = body.settings.model_dump()
        if body.clear_pin:
            fam.pin = None
        elif body.pin is not None:
            fam.pin = body.pin.model_dump()
        fam.updated_at = body.updated_at
        db.commit()
    return family_out(db, fam, m.role)


@router.post("/families/{family_id}/consents", status_code=201)
def give_consent(
    family_id: str, body: ConsentIn, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> dict:
    membership(db, user, family_id, write=True)
    if body.policy_version != get_settings().policy_version:
        raise HTTPException(409, "The privacy policy has changed. Please read the new version.")
    missing = [k for k, v in POLICY["scopes"].items() if v["required"] and not body.scopes.get(k)]
    if missing:
        raise HTTPException(422, f"Required: {', '.join(missing)}")
    scopes = {k: bool(body.scopes.get(k)) for k in POLICY["scopes"]}
    db.add(Consent(family_id=family_id, user_id=user.id, policy_version=body.policy_version, scopes=scopes))
    db.commit()
    return {"policy_version": body.policy_version, "scopes": scopes}


def require_consent(db: DbSession, family_id: str) -> None:
    c = latest_consent(db, family_id)
    if not c or c.policy_version != get_settings().policy_version:
        raise HTTPException(403, "A grown-up needs to agree to the privacy summary first")


@router.put("/families/{family_id}/learners/{learner_id}")
def put_learner(
    family_id: str,
    learner_id: str,
    body: LearnerIn,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    """Create or update a learner. The id is made on the device (a ULID) so profiles made offline work."""
    membership(db, user, family_id, write=True)
    require_consent(db, family_id)
    if not is_ulid(learner_id):
        raise HTTPException(422, "learner id must be a ULID")
    lr = db.get(Learner, learner_id)
    if lr and lr.family_id != family_id:
        raise HTTPException(404, "Learner not found")
    fields = body.model_dump(exclude={"updated_at"})
    if not lr:
        lr = Learner(
            id=learner_id, family_id=family_id, created_at=utcnow(), updated_at=body.updated_at, **fields
        )
        db.add(lr)
        db.commit()
    elif aware(body.updated_at) > aware(lr.updated_at):  # last edit wins
        for k, v in fields.items():
            setattr(lr, k, v)
        lr.updated_at = body.updated_at
        db.commit()
    return learner_out(lr)


@router.delete("/families/{family_id}/learners/{learner_id}", status_code=204)
def delete_learner(
    family_id: str, learner_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    """Deletes the profile and, by cascade, all of its progress events."""
    membership(db, user, family_id, write=True)
    lr = db.get(Learner, learner_id)
    if not lr or lr.family_id != family_id:
        raise HTTPException(404, "Learner not found")
    # Explicit, so it never depends on the database enforcing ON DELETE CASCADE.
    db.execute(delete(Event).where(Event.learner_id == learner_id))
    db.delete(lr)
    db.commit()
