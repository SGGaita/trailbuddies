import re

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401 - register tables
from app.db import Base, get_session
from app.main import create_app
from app.routes import auth as auth_routes
from app.routes import members as member_routes


@pytest.fixture()
def engine(tmp_path):
    """A throwaway SQLite database (CI also runs the migrations on Postgres)."""
    eng = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture()
def outbox(monkeypatch):
    """Captures sign-in emails instead of sending them."""
    sent = []
    monkeypatch.setattr(auth_routes, "send_magic_link", lambda to, link: sent.append((to, link)))
    monkeypatch.setattr(member_routes, "send_invite", lambda to, link, *_: sent.append((to, link)))
    return sent


@pytest.fixture()
def client(engine, outbox):
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def session_override():
        with factory() as s:
            yield s

    app = create_app()
    app.dependency_overrides[get_session] = session_override
    return TestClient(app)


def sign_in(client, outbox, email="grace@example.com"):
    """Magic-link sign-in; the client keeps the session cookie."""
    assert client.post("/auth/magic-link", json={"email": email}).status_code == 202
    token = re.search(r"token=([^&\s]+)", outbox[-1][1]).group(1)
    r = client.post("/auth/verify", json={"token": token})
    assert r.status_code == 200, r.text
    return r.json()


POLICY = "2026-10"
NOW = "2030-01-01T10:00:00Z"
LATER = "2030-01-01T11:00:00Z"
LEARNER = "01JB0000000000000000000001"


def family_with_consent(client, outbox):
    sign_in(client, outbox)
    fam = client.post("/families", json={"name": "Wanjiru family", "country": "ke"}).json()
    r = client.post(
        f"/families/{fam['id']}/consents",
        json={"policy_version": POLICY, "scopes": {"progress": True}, "agreed": True},
    )
    assert r.status_code == 201, r.text
    return fam


def learner_body(**over):
    body = {
        "name": "Zawadi",
        "birth_year": 2020,
        "birth_month": 6,
        "avatar_color": "coral",
        "updated_at": NOW,
    }
    body.update(over)
    return body
