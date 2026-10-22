from arq.worker import get_kwargs

from app.worker import WorkerSettings, heartbeat


def test_worker_refreshes_health_key_often():
    # The compose healthcheck runs `arq --check`, which reads a Redis key the worker refreshes
    # every health_check_interval. arq's default (1 hour) would leave the worker "unhealthy"
    # for up to an hour after a Redis restart.
    assert get_kwargs(WorkerSettings)["health_check_interval"] <= 60


def test_heartbeat_job_is_registered():
    assert heartbeat in WorkerSettings.functions
