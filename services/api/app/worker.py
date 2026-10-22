"""Background worker (arq on Redis). Sprint 0 has a heartbeat job only; media processing,
weekly digests and retention clean-up arrive in Sprints 5 and 7.

Run: arq app.worker.WorkerSettings
"""

from arq.connections import RedisSettings
from arq.cron import cron

from .settings import get_settings


async def heartbeat(ctx) -> str:
    return "ok"


class WorkerSettings:
    functions = [heartbeat]
    cron_jobs = [cron(heartbeat, minute={0, 30})]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    # Refresh the Redis health key often so `arq --check` (the compose healthcheck)
    # recovers within 30 s of a Redis restart instead of arq's default hour.
    health_check_interval = 30
