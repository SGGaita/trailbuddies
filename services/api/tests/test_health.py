from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app import __version__
from app.db import get_session
from app.main import create_app


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "version": __version__, "database": "ok"}


def test_health_reports_database_down_without_crashing():
    class Broken:
        def execute(self, *_):
            raise OperationalError("SELECT 1", {}, Exception("down"))

    app = create_app()
    app.dependency_overrides[get_session] = lambda: Broken()
    r = TestClient(app).get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "degraded"
    assert r.json()["database"] == "unavailable"


def test_version(client):
    assert client.get("/version").json()["version"] == __version__


def test_cors_allows_the_web_app(client):
    r = client.options(
        "/health", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"}
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"
