"""Background worker for Docker and a VPS (arq on Redis): a heartbeat and the nightly privacy
job. On Vercel there is no worker: Vercel Cron calls GET /cron/daily instead (routes/ops.py).

Run: arq app.worker.WorkerSettings
"""

from arq.connections import RedisSettings
from arq.cron import cron
from sqlalchemy.orm import Session

from .db import get_engine, utcnow
from .privacy import daily
from .settings import get_settings
from .storage import get_storage


async def heartbeat(ctx) -> str:
    return "ok"


def purge(engine=None, now=None) -> dict:
    """The nightly job: retention rules, deletions after their undo window, old links."""
    with Session(engine or get_engine()) as db:
        return daily(db, get_storage(), now or utcnow())


async def purge_job(ctx) -> dict:
    return purge()


class WorkerSettings:
    functions = [heartbeat, purge_job]
    cron_jobs = [cron(heartbeat, minute={0, 30}), cron(purge_job, hour={3}, minute={15})]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    # Refresh the Redis health key often so `arq --check` (the compose healthcheck)
    # recovers within 30 s of a Redis restart instead of arq's default hour.
    health_check_interval = 30
