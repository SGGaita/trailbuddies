"""Feature flags (OPS-06), kept in our own database: no third-party SDK. A flag is on for
everyone, for some cohorts (e.g. "beta") or for named families. Unknown flags are off.
Change them with the admin CLI: python -m app.admin flags --help"""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from .db import utcnow
from .models import BetaCode, Family, FeatureFlag
from .security import aware

# Flags the apps know about, with what they switch. New ones start off.
KNOWN = {
    "beta-feedback": "Feedback button in the grown-up zone",
    "beta-faq": "Beta questions and answers in the grown-up zone",
}


def is_on(flag: FeatureFlag, fam: Family) -> bool:
    return bool(
        flag.everyone or fam.id in (flag.families or []) or set(flag.cohorts or []) & set(fam.cohorts or [])
    )


def flags_for(db: DbSession, fam: Family) -> dict[str, bool]:
    out = dict.fromkeys(KNOWN, False)
    for flag in db.scalars(select(FeatureFlag)):
        out[flag.key] = is_on(flag, fam)
    return out


def set_flag(
    db: DbSession,
    key: str,
    *,
    everyone: bool | None = None,
    cohorts: list[str] | None = None,
    families: list[str] | None = None,
    description: str | None = None,
) -> FeatureFlag:
    flag = db.get(FeatureFlag, key) or FeatureFlag(
        key=key, description=KNOWN.get(key, ""), cohorts=[], families=[]
    )
    if everyone is not None:
        flag.everyone = everyone
    if cohorts is not None:
        flag.cohorts = sorted(set(cohorts))
    if families is not None:
        flag.families = sorted(set(families))
    if description is not None:
        flag.description = description
    flag.updated_at = utcnow()
    db.add(flag)
    db.commit()
    return flag


ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I: easy to read aloud


def new_code(db: DbSession, cohort: str = "beta", max_uses: int = 1, note: str = "", expires_at=None) -> str:
    code = "TB-" + "".join(secrets.choice(ALPHABET) for _ in range(6))
    db.add(BetaCode(code=code, cohort=cohort, max_uses=max_uses, note=note, expires_at=expires_at))
    db.commit()
    return code


def redeem(db: DbSession, fam: Family, code: str) -> str | None:
    """Put the family in the code's cohort. Returns the cohort, or None if the code can't be used."""
    row = db.get(BetaCode, code.strip().upper())
    if not row or row.uses >= row.max_uses or (row.expires_at and aware(row.expires_at) < utcnow()):
        return None
    row.uses += 1
    fam.cohorts = sorted(set(fam.cohorts or []) | {row.cohort})
    return row.cohort


def code_usable(db: DbSession, code: str | None) -> bool:
    row = code and db.get(BetaCode, code.strip().upper())
    return bool(row and row.uses < row.max_uses and not (row.expires_at and aware(row.expires_at) < utcnow()))
