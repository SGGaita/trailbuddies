"""Admin CLI for Steve (no admin web screens yet). Runs on your PC against any database:

    set TB_DATABASE_URL=...   (Supabase: the session pooler, port 5432; see docs/vercel-supabase.md)
    python -m app.admin flags                       list feature flags
    python -m app.admin flags beta-feedback --cohort beta    on for the beta cohort
    python -m app.admin flags beta-feedback --everyone on|off
    python -m app.admin flags beta-feedback --family 01J... (repeat to add more)
    python -m app.admin cohort 01J... beta          put a family in a cohort (--remove to take out)
    python -m app.admin codes                       list invite codes
    python -m app.admin codes --new 10 --note "Nairobi playtest" [--uses 1] [--days 30]
    python -m app.admin consents                    US consent forms waiting for review
    python -m app.admin consents --approve 12 | --reject 12
    python -m app.admin feedback [--days 7]         grown-ups' feedback
    python -m app.admin errors [--days 1]           our own error log (when not using Sentry)
    python -m app.admin daily                       run the nightly privacy job now
    python -m app.admin weekly                      send the weekly badge emails and compute metrics now
    python -m app.admin metrics [--weeks 8] [--json] product metrics (OPS-07), newest week first
    python -m app.admin support [--days 7]          messages sent with Contact support

Prints no children's data: families are shown by id, feedback has names replaced already.
"""

import argparse
import json
import sys
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import mailer
from .db import get_engine, utcnow
from .flags import KNOWN, new_code, set_flag
from .metrics import store_weeks
from .models import (
    BetaCode,
    Consent,
    ErrorReport,
    Family,
    FeatureFlag,
    Feedback,
    SupportTicket,
    User,
    WeeklyMetric,
)
from .notify import weekly_digest
from .privacy import daily
from .settings import get_settings
from .storage import get_storage


def _flags(db: Session, a) -> None:
    if a.key:
        set_flag(
            db,
            a.key,
            everyone=None if a.everyone is None else a.everyone == "on",
            cohorts=a.cohort if a.cohort else None,
            families=a.family if a.family else None,
        )
    rows = {f.key: f for f in db.scalars(select(FeatureFlag))}
    for key in sorted(set(KNOWN) | set(rows)):
        f = rows.get(key)
        who = "off"
        if f:
            parts = (["everyone"] if f.everyone else []) + [f"cohort {c}" for c in f.cohorts or []]
            parts += [f"{len(f.families)} families"] if f.families else []
            who = ", ".join(parts) or "off"
        print(f"{key:24} {who:30} {KNOWN.get(key) or (f and f.description) or ''}")


def _cohort(db: Session, a) -> None:
    fam = db.get(Family, a.family_id)
    if not fam:
        sys.exit("No family with that id")
    now = set(fam.cohorts or [])
    fam.cohorts = sorted(now - {a.name} if a.remove else now | {a.name})
    db.commit()
    print(f"{fam.id}: {', '.join(fam.cohorts) or 'no cohorts'}")


def _codes(db: Session, a) -> None:
    if a.new:
        exp = utcnow() + timedelta(days=a.days) if a.days else None
        for _ in range(a.new):
            print(new_code(db, a.cohort, a.uses, a.note, exp))
        return
    for c in db.scalars(select(BetaCode).order_by(BetaCode.created_at.desc())):
        print(f"{c.code}  {c.cohort:8} used {c.uses}/{c.max_uses}  {c.note}")


def _consents(db: Session, a) -> None:
    if a.approve or a.reject:
        c = db.get(Consent, a.approve or a.reject)
        if not c or c.status != "pending":
            sys.exit("No pending consent with that id")
        c.status = "approved" if a.approve else "rejected"
        c.reviewed_at = utcnow()
        db.commit()
        who = db.get(User, c.user_id)
        if who:
            web = get_settings().web_url
            lines = (
                ["Thank you: we checked your signed consent form.", "Progress now saves to your account."]
                if a.approve
                else [
                    "We couldn't accept your signed consent form.",
                    "Please open Trailbuddies and sign it again, using your full name in both boxes.",
                ]
            )
            mailer.send_notice(who.email, "Your Trailbuddies consent form", lines, web, "Open Trailbuddies")
        print(f"Consent {c.id}: {c.status}")
        return
    for c in db.scalars(select(Consent).where(Consent.status == "pending").order_by(Consent.given_at)):
        ev = c.evidence or {}
        print(
            f"#{c.id} family {c.family_id} {c.given_at:%Y-%m-%d} {ev.get('relationship', '?')}: "
            f"name '{ev.get('parent_name', '')}', signed '{ev.get('signature', '')}' "
            f"on {ev.get('signed_on', '')}"
        )


def _feedback(db: Session, a) -> None:
    since = utcnow() - timedelta(days=a.days)
    for f in db.scalars(select(Feedback).where(Feedback.created_at > since).order_by(Feedback.created_at)):
        print(f"{f.created_at:%Y-%m-%d %H:%M} {f.kind:8} {f.screen or '-':24} {f.message}")


def _errors(db: Session, a) -> None:
    since = utcnow() - timedelta(days=a.days)
    rows = db.execute(
        select(ErrorReport.message, ErrorReport.screen, func.count(), func.max(ErrorReport.at))
        .where(ErrorReport.at > since)
        .group_by(ErrorReport.message, ErrorReport.screen)
        .order_by(func.count().desc())
    ).all()
    for message, screen, n, last in rows:
        print(f"{n:5}x  last {last:%m-%d %H:%M}  {screen or '-':24} {message}")


METRIC_COLUMNS = [
    ("families_new", "new fam"),
    ("activation_rate", "activated"),
    ("active_families", "act fam"),
    ("active_learners", "learners"),
    ("lessons", "lessons"),
    ("lessons_per_learner", "per lrn"),
    ("minutes", "minutes"),
    ("retention_rate", "kept"),
]


def _metrics(db: Session, a) -> None:
    if not db.scalar(select(func.count()).select_from(WeeklyMetric)):
        store_weeks(db)
    rows = db.scalars(select(WeeklyMetric).order_by(WeeklyMetric.week_start.desc()).limit(a.weeks)).all()
    if a.json:
        print(json.dumps([{"week": r.week_start.isoformat(), **r.data} for r in rows], indent=2))
        return
    print("week        " + " ".join(f"{label:>9}" for _, label in METRIC_COLUMNS))
    for r in rows:
        cells = []
        for key, _ in METRIC_COLUMNS:
            v = r.data.get(key)
            cells.append(f"{'-' if v is None else (f'{v:.0%}' if key.endswith('rate') else v):>9}")
        print(f"{r.week_start}  " + " ".join(cells))


def _support(db: Session, a) -> None:
    since = utcnow() - timedelta(days=a.days)
    for t in db.scalars(
        select(SupportTicket).where(SupportTicket.created_at > since).order_by(SupportTicket.created_at)
    ):
        print(f"{t.ref} {t.created_at:%Y-%m-%d %H:%M} {t.topic:8} {t.subject}")
        print(f"    {t.message[:300]}")
        if t.diagnostics:
            print(f"    diagnostics: {t.diagnostics}")


def main(argv=None) -> None:
    p = argparse.ArgumentParser(prog="python -m app.admin", description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("flags")
    f.add_argument("key", nargs="?")
    f.add_argument("--everyone", choices=["on", "off"])
    f.add_argument("--cohort", action="append")
    f.add_argument("--family", action="append")
    c = sub.add_parser("cohort")
    c.add_argument("family_id")
    c.add_argument("name")
    c.add_argument("--remove", action="store_true")
    k = sub.add_parser("codes")
    k.add_argument("--new", type=int, default=0)
    k.add_argument("--cohort", default="beta")
    k.add_argument("--uses", type=int, default=1)
    k.add_argument("--note", default="")
    k.add_argument("--days", type=int, default=0)
    s = sub.add_parser("consents")
    s.add_argument("--approve", type=int)
    s.add_argument("--reject", type=int)
    fb = sub.add_parser("feedback")
    fb.add_argument("--days", type=int, default=7)
    e = sub.add_parser("errors")
    e.add_argument("--days", type=int, default=1)
    sub.add_parser("daily")
    sub.add_parser("weekly")
    mt = sub.add_parser("metrics")
    mt.add_argument("--weeks", type=int, default=8)
    mt.add_argument("--json", action="store_true")
    sp = sub.add_parser("support")
    sp.add_argument("--days", type=int, default=7)
    a = p.parse_args(argv)
    with Session(get_engine()) as db:
        if a.cmd == "daily":
            print(daily(db, get_storage()))
            return
        if a.cmd == "weekly":
            print({"digests": weekly_digest(db), "metrics": [str(w) for w in store_weeks(db)]})
            return
        {
            "flags": _flags,
            "cohort": _cohort,
            "codes": _codes,
            "consents": _consents,
            "feedback": _feedback,
            "errors": _errors,
            "metrics": _metrics,
            "support": _support,
        }[a.cmd](db, a)


if __name__ == "__main__":
    main()
