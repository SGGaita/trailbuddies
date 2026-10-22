"""Background worker (arq on Redis): a heartbeat and clean-up jobs. Media processing and
weekly digests arrive in Sprint 5; account retention (24 months inactive) in Sprint 7.

Run: arq app.worker.WorkerSettings
"""

from datetime import timedelta

from arq.connections import RedisSettings
from arq.cron import cron
from sqlalchemy import delete
from sqlalchemy.orm import Session

from .db import get_engine, utcnow
from .models import EditHistory, Invite, LoginToken
from .routes.families import HISTORY_DAYS
from .settings import get_settings


async def heartbeat(ctx) -> str:
    return "ok"


def purge(engine=None, now=None) -> dict:
    """Delete edit history older than 30 days, used or expired sign-in links, and old invitations."""
    now = now or utcnow()
    with Session(engine or get_engine()) as db:
        h = db.execute(
            delete(EditHistory).where(EditHistory.kept_at < now - timedelta(days=HISTORY_DAYS))
        ).rowcount
        t = db.execute(delete(LoginToken).where(LoginToken.expires_at < now - timedelta(days=1))).rowcount
        i = db.execute(delete(Invite).where(Invite.expires_at < now - timedelta(days=30))).rowcount
        db.commit()
    return {"history": h, "tokens": t, "invites": i}


async def purge_job(ctx) -> dict:
    return purge()


class WorkerSettings:
    functions = [heartbeat, purge_job]
    cron_jobs = [cron(heartbeat, minute={0, 30}), cron(purge_job, hour={3}, minute={15})]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    # Refresh the Redis health key often so `arq --check` (the compose healthcheck)
    # recovers within 30 s of a Redis restart instead of arq's default hour.
    health_check_interval = 30
