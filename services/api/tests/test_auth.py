from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import LoginToken
from tests.conftest import sign_in


def test_magic_link_signs_in_and_creates_the_account(client, outbox):
    r = client.post("/auth/magic-link", json={"email": "Grace@Example.com "})
    assert r.status_code == 202 and r.json() == {"sent": True}
    assert outbox[0][0] == "grace@example.com"
    assert outbox[0][1].startswith("http://localhost:3000/auth/verify?token=")
    assert client.get("/me").status_code == 401
    token = outbox[0][1].split("token=")[1]
    r = client.post("/auth/verify", json={"token": token})
    assert r.status_code == 200 and r.json()["new"] is True
    assert "tb_session" in r.cookies
    me = client.get("/me").json()
    assert me["user"]["email"] == "grace@example.com" and me["families"] == []


def test_links_work_once(client, outbox):
    sign_in(client, outbox)
    token = outbox[-1][1].split("token=")[1]
    assert client.post("/auth/verify", json={"token": token}).status_code == 400


def test_expired_links_fail(client, outbox, engine):
    client.post("/auth/magic-link", json={"email": "a@example.com"})
    with Session(engine) as db:
        row = db.scalar(select(LoginToken))
        row.expires_at = row.created_at - timedelta(minutes=1)
        db.commit()
    token = outbox[-1][1].split("token=")[1]
    assert client.post("/auth/verify", json={"token": token}).status_code == 400


def test_rate_limit_is_silent(client, outbox):
    for _ in range(7):
        assert client.post("/auth/magic-link", json={"email": "a@example.com"}).status_code == 202
    assert len(outbox) == 5  # the rest are quietly not sent


def test_bad_email_is_rejected(client):
    assert client.post("/auth/magic-link", json={"email": "not-an-email"}).status_code == 422


def test_second_sign_in_reuses_the_account(client, outbox):
    first = sign_in(client, outbox)
    client.post("/auth/logout")
    assert client.get("/me").status_code == 401
    again = sign_in(client, outbox)
    assert again["new"] is False and again["user"]["id"] == first["user"]["id"]


def test_name_update(client, outbox):
    sign_in(client, outbox)
    assert client.patch("/me", json={"name": "Grace"}).json()["user"]["name"] == "Grace"


def test_google_is_off_until_configured(client):
    assert client.get("/auth/config").json()["google"] is False
    assert client.get("/auth/google/start", follow_redirects=False).status_code == 404


def test_google_sign_in(client, monkeypatch):
    from app.routes import auth
    from app.settings import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "google_client_id", "cid")
    monkeypatch.setattr(s, "google_client_secret", "secret")
    r = client.get("/auth/google/start", follow_redirects=False)
    assert r.status_code == 302 and "accounts.google.com" in r.headers["location"]
    state = r.cookies["tb_oauth_state"]
    monkeypatch.setattr(
        auth,
        "google_identity",
        lambda code: {
            "aud": "cid",
            "email": "g@example.com",
            "email_verified": "true",
            "given_name": "Grace",
        },
    )
    r = client.get(f"/auth/google/callback?code=x&state={state}", follow_redirects=False)
    assert r.status_code == 302 and r.headers["location"].endswith("/auth/done")
    assert client.get("/me").json()["user"] == {**client.get("/me").json()["user"], "name": "Grace"}


def test_google_rejects_a_wrong_state_or_audience(client, monkeypatch):
    from app.routes import auth
    from app.settings import get_settings

    s = get_settings()
    monkeypatch.setattr(s, "google_client_id", "cid")
    monkeypatch.setattr(s, "google_client_secret", "secret")
    client.get("/auth/google/start", follow_redirects=False)
    r = client.get("/auth/google/callback?code=x&state=wrong", follow_redirects=False)
    assert "error=google" in r.headers["location"]
    state = client.cookies.get("tb_oauth_state")
    monkeypatch.setattr(
        auth,
        "google_identity",
        lambda code: {"aud": "other", "email": "g@example.com", "email_verified": "true"},
    )
    r = client.get(f"/auth/google/callback?code=x&state={state}", follow_redirects=False)
    assert "error=google" in r.headers["location"]
    assert client.get("/me").status_code == 401
