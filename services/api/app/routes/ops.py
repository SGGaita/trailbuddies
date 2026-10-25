"""Operations: the nightly job for Vercel Cron, and our own error log (SAF-07 option 2)."""

import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from ..db import get_session, utcnow
from ..models import ErrorReport
from ..privacy import daily
from ..schemas import ErrorIn
from ..scrub import scrub_text
from ..settings import get_settings
from ..storage import get_storage

router = APIRouter()
ERRORS_PER_HOUR = 300


@router.get("/cron/daily")
def cron_daily(
    authorization: str = Header(default=""),
    db: DbSession = Depends(get_session),
    storage=Depends(get_storage),
) -> dict:
    """Vercel Cron calls this once a day with "Authorization: Bearer $CRON_SECRET"."""
    secret = get_settings().cron_secret
    if not secret or not secrets.compare_digest(authorization, f"Bearer {secret}"):
        raise HTTPException(401, "Not allowed")
    return daily(db, storage)


@router.post("/errors", status_code=204)
def report_error(body: ErrorIn, db: DbSession = Depends(get_session)) -> Response:
    """Scrubbed error reports from the web app when we aren't using Sentry. No sign-in needed
    (errors happen on signed-out screens too), so the volume is capped."""
    if get_settings().error_backend != "own":
        return Response(status_code=204)
    recent = db.scalar(
        select(func.count()).select_from(ErrorReport).where(ErrorReport.at > utcnow() - timedelta(hours=1))
    )
    if recent < ERRORS_PER_HOUR:
        db.add(
            ErrorReport(
                source=body.source,
                release=body.release,
                screen=scrub_text(body.screen.split("?")[0], limit=80),
                message=scrub_text(body.message, limit=500),
                stack=scrub_text(body.stack, limit=4000),
            )
        )
        db.commit()
    return Response(status_code=204)
