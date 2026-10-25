from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app import __version__
from app.db import get_session
from app.main import create_app


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "version": __version__, "database": "ok", "media": "ok"}


def test_health_reports_database_down_without_crashing():
    class Broken:
        def execute(self, *_):
            raise OperationalError("SELECT 1", {}, Exception("down"))

    app = create_app()
    app.dependency_overrides[get_session] = lambda: Broken()
    r = TestClient(app).get("/health")
    assert r.status_code == 503  # uptime monitors alert on it (OPS-05)
    assert r.json()["status"] == "degraded"
    assert r.json()["database"] == "unavailable"


def test_version(client):
    assert client.get("/version").json()["version"] == __version__


def test_cors_allows_the_web_app(client):
    r = client.options(
        "/health", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"}
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_the_api_answers_under_api_too(client):
    """On Vercel the API is a service at /api/* and sees the prefix (ADR 0006)."""
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/api/version").status_code == 200
    assert client.get("/apis").status_code == 404


def test_on_vercel_local_media_is_reported(monkeypatch):
    from app.settings import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "serverless", True)
    monkeypatch.setattr(s, "media_backend", "local")
    app = create_app()
    r = TestClient(app).get("/health")
    assert r.status_code == 503 and r.json()["media"] == "misconfigured"
