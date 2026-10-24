"""Families, consent and learner profiles. Profile edits carry the device's edit time and
the newest edit wins, so two devices editing offline settle the same way everywhere."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..devices import device_limit
from ..ids import is_ulid, ulid
from ..models import Consent, EditHistory, Event, Family, FamilyMember, Learner, Session, User
from ..regions import region_for
from ..schemas import ConsentIn, FamilyIn, FamilyPatch, FamilySettings, LearnerIn
from ..security import aware, current_user, membership
from ..settings import get_settings

router = APIRouter()

# Learner profiles per plan (concept report §13.1). Children and adults both count.
PLAN_LIMITS = {"free": 1, "family": 6}
HISTORY_DAYS = 30


def keep(db: DbSession, family_id: str, entity: str, entity_id: str, data: dict, reason: str) -> None:
    """Keep the version an edit replaced, or a late edit that lost, for 30 days (OFF-05)."""
    db.add(
        EditHistory(
            family_id=family_id,
            entity=entity,
            entity_id=entity_id,
            data={k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in data.items()},
            reason=reason,
            kept_at=utcnow(),
        )
    )


def family_state(fam: Family) -> dict:
    return {
        "name": fam.name,
        "country": fam.country,
        "settings": fam.settings,
        "pin": fam.pin,
        "updated_at": fam.updated_at,
    }


# What the consent screen summarises; the full policy lives on the website.
POLICY = {
    "collect": [
        "Your name and email, to sign you in.",
        "Each learner's first name or nickname and birth month and year, to pick the right lessons.",
        "What each learner answers and earns, to show progress and choose what to practise.",
    ],
    "why": [
        "Progress and answers choose what each child practises next and show grown-ups how they're doing.",
        "Birth month and year set the age band, which changes how lessons look and sound.",
    ],
    "kept": [
        "Progress is kept while your account is in use.",
        "If nobody signs in for 24 months, we email you twice (at 23 months and a week before), "
        "then delete the family.",
        "Grown-up voice recordings and photos are deleted 30 days after the lesson that uses them.",
        "Deleting a learner deletes all of their progress straight away.",
    ],
    "rights": [
        "See, download or correct everything we keep about your family.",
        "Delete a learner or the whole family at any time.",
        "Withdraw consent: we stop saving progress to your account.",
        "Ask us anything at privacy@trailbuddies.africa.",
    ],
    "never": [
        "No ads and no tracking or analytics companies.",
        "No surname, school, address or exact birthday for children.",
        "Children can't chat or type messages to anyone.",
    ],
    "scopes": {
        "progress": {"label": "Save progress so it follows each child to every device", "required": True},
        "voice": {"label": "Let grown-ups record their own voice for lessons", "required": False},
        "photos": {"label": "Let grown-ups add their own photos to lessons", "required": False},
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
        "levels": lr.levels or {},
        "wish": lr.wish,
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
        "learner_limit": PLAN_LIMITS.get(fam.plan, 1),
        "device_limit": device_limit(fam.plan),
        "region": region_for(fam.country),
        "role": role,
        "settings": FamilySettings(**(fam.settings or {})).model_dump(),
        "pin": fam.pin,
        "updated_at": aware(fam.updated_at).isoformat(),
        "consent": {
            "policy_version": c.policy_version,
            "scopes": c.scopes,
            "method": c.method,
            "region": c.region or region_for(fam.country),
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
        plan=get_settings().default_plan,
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
    if aware(body.updated_at) <= aware(fam.updated_at):  # last edit wins; keep the loser
        keep(db, family_id, "family", family_id, body.model_dump(exclude_none=True), "lost")
        db.commit()
    else:
        keep(db, family_id, "family", family_id, family_state(fam), "replaced")
        if body.name is not None:
            fam.name = body.name.strip()
        if body.country is not None:
            # Consents given before regions were recorded were under the old country's rules.
            c = latest_consent(db, family_id)
            if c and not c.region:
                c.region = region_for(fam.country)
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
    region = region_for(db.get(Family, family_id).country)
    db.add(
        Consent(
            family_id=family_id,
            user_id=user.id,
            policy_version=body.policy_version,
            scopes=scopes,
            method="checkbox",
            region=region,
        )
    )
    db.commit()
    return {"policy_version": body.policy_version, "scopes": scopes, "method": "checkbox", "region": region}


def require_consent(db: DbSession, family_id: str) -> None:
    c = latest_consent(db, family_id)
    if not c or c.policy_version != get_settings().policy_version:
        raise HTTPException(403, "A grown-up needs to agree to the privacy summary first")
    # ONB-05: after moving to a country with different privacy rules, consent is asked again.
    if c.region and c.region != region_for(db.get(Family, family_id).country):
        raise HTTPException(403, "Your country's privacy rules changed. Please agree again.")


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
        fam = db.get(Family, family_id)
        count = len(db.scalars(select(Learner.id).where(Learner.family_id == family_id)).all())
        limit = PLAN_LIMITS.get(fam.plan, 1)
        if count >= limit:
            raise HTTPException(
                402, {"code": "plan_limit", "limit": limit, "message": f"Your plan allows {limit} learners."}
            )
        lr = Learner(
            id=learner_id, family_id=family_id, created_at=utcnow(), updated_at=body.updated_at, **fields
        )
        db.add(lr)
        db.commit()
    elif aware(body.updated_at) <= aware(lr.updated_at):  # an older edit arrived late: keep it
        keep(db, family_id, "learner", learner_id, body.model_dump(), "lost")
        db.commit()
    else:  # last edit wins; keep what it replaced
        keep(db, family_id, "learner", learner_id, learner_out(lr), "replaced")
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


def device_out(row: Session, owner: User, current: str | None) -> dict:
    return {
        "id": row.id,
        "name": row.device_name or "A device",
        "who": owner.name or owner.email.split("@")[0],
        "last_seen_at": aware(row.last_seen_at).isoformat(),
        "this_device": row.id == current,
    }


@router.get("/families/{family_id}/devices")
def list_devices(
    family_id: str,
    request: Request,
    user: User = Depends(current_user),
    db: DbSession = Depends(get_session),
) -> dict:
    """Every signed-in device of every grown-up in the family (FAM-08), newest first."""
    membership(db, user, family_id)
    fam = db.get(Family, family_id)
    rows = db.execute(
        select(Session, User)
        .join(User, User.id == Session.user_id)
        .join(FamilyMember, FamilyMember.user_id == User.id)
        .where(FamilyMember.family_id == family_id, Session.expires_at > utcnow())
        .order_by(Session.last_seen_at.desc())
    ).all()
    current = getattr(request.state, "session_id", None)
    devices = [device_out(s, u, current) for s, u in rows]
    return {
        "devices": devices,
        "limit": device_limit(fam.plan),
        "over": max(0, len(devices) - device_limit(fam.plan)),
    }


@router.delete("/families/{family_id}/devices/{session_id}", status_code=204)
def sign_out_device(
    family_id: str, session_id: str, user: User = Depends(current_user), db: DbSession = Depends(get_session)
) -> None:
    """Sign out one device. Parents can sign out any family device; others only their own."""
    m = membership(db, user, family_id)
    row = db.get(Session, session_id)
    member = row and db.scalar(
        select(FamilyMember).where(FamilyMember.family_id == family_id, FamilyMember.user_id == row.user_id)
    )
    if not row or not member:
        raise HTTPException(404, "Device not found")
    if row.user_id != user.id and m.role not in {"owner", "parent"}:
        raise HTTPException(403, "Only a parent can sign out someone else's device")
    db.delete(row)
    db.commit()
