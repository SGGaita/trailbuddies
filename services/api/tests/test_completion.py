"""Sprint 1-2 completion: sessions, consent text, plan limits, edit history, invites."""

from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import utcnow
from app.models import EditHistory, Family, Invite
from app.models import Session as SessionRow
from app.worker import purge
from tests.conftest import LATER, LEARNER, NOW, family_with_consent, learner_body, sign_in

ULID = "01JB00000000000000000000{:02d}"


def other_device(client):
    return TestClient(client.app)


def test_sessions_last_60_days(client, outbox, engine):
    sign_in(client, outbox)
    with Session(engine) as db:
        row = db.scalar(select(SessionRow))
        assert (row.expires_at - row.created_at).days == 60


def test_sign_out_of_all_devices(client, outbox):
    sign_in(client, outbox)
    phone = other_device(client)
    sign_in(phone, outbox)
    assert phone.get("/me").status_code == 200
    assert client.post("/auth/logout-all").json() == {"ok": True}
    assert phone.get("/me").status_code == 401
    assert client.get("/me").status_code == 401


def test_policy_says_why_how_long_and_rights_and_consent_records_method(client, outbox):
    p = client.get("/policy").json()
    assert any("24 months" in x for x in p["kept"])
    assert p["rights"] and p["why"]
    fam = family_with_consent(client, outbox)
    assert client.get(f"/families/{fam['id']}").json()["consent"]["method"] == "checkbox"


def test_beta_families_get_six_learners_and_free_gets_one(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    assert fam["plan"] == "family" and fam["learner_limit"] == 6
    for i in range(6):
        url = f"/families/{fam['id']}/learners/{ULID.format(i + 1)}"
        assert client.put(url, json=learner_body(name=f"K{i}")).status_code == 200
    r = client.put(f"/families/{fam['id']}/learners/{ULID.format(7)}", json=learner_body())
    assert r.status_code == 402 and r.json()["detail"]["code"] == "plan_limit"
    # updating an existing learner is never blocked
    assert (
        client.put(
            f"/families/{fam['id']}/learners/{ULID.format(1)}", json=learner_body(updated_at=LATER)
        ).status_code
        == 200
    )
    with Session(engine) as db:
        db.get(Family, fam["id"]).plan = "free"
        db.commit()
    assert client.get(f"/families/{fam['id']}").json()["learner_limit"] == 1


def test_edit_history_keeps_both_sides_for_30_days(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    url = f"/families/{fam['id']}/learners/{LEARNER}"
    client.put(url, json=learner_body())
    client.put(url, json=learner_body(name="Newer", updated_at=LATER))  # replaces Zawadi
    client.put(url, json=learner_body(name="Late", updated_at=NOW))  # older edit arrives late
    client.patch(f"/families/{fam['id']}", json={"settings": {"goal": 3}, "updated_at": LATER})
    with Session(engine) as db:
        rows = db.scalars(select(EditHistory).order_by(EditHistory.id)).all()
        assert [(r.entity, r.reason, r.data.get("name")) for r in rows] == [
            ("learner", "replaced", "Zawadi"),
            ("learner", "lost", "Late"),
            ("family", "replaced", "Wanjiru family"),
        ]
        rows[0].kept_at = utcnow() - timedelta(days=31)
        db.commit()
    assert purge(engine)["history"] == 1
    assert client.get(f"/families/{fam['id']}").json()["learners"][0]["name"] == "Newer"


def test_invite_a_second_parent_who_gets_equal_access(client, outbox):
    fam = family_with_consent(client, outbox)
    r = client.post(f"/families/{fam['id']}/invites", json={"email": "Baraka@Example.com", "role": "parent"})
    assert r.status_code == 201 and r.json()["email"] == "baraka@example.com"
    to, link = outbox[-1]
    assert to == "baraka@example.com" and "/invite?token=" in link
    baraka = other_device(client)
    r = baraka.post("/invites/accept", json={"token": link.split("token=")[1]})
    assert r.status_code == 200 and r.json()["role"] == "parent"
    me = baraka.get("/me").json()
    assert me["families"][0]["id"] == fam["id"] and me["families"][0]["role"] == "parent"
    assert baraka.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body()).status_code == 200
    # used links don't work twice
    assert baraka.post("/invites/accept", json={"token": link.split("token=")[1]}).status_code == 400
    people = client.get(f"/families/{fam['id']}/members").json()
    assert sorted(m["role"] for m in people["members"]) == ["owner", "parent"] and people["invites"] == []


def test_a_carer_can_view_but_not_change(client, outbox):
    fam = family_with_consent(client, outbox)
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    client.post(f"/families/{fam['id']}/invites", json={"email": "nana@example.com", "role": "viewer"})
    nana = other_device(client)
    nana.post("/invites/accept", json={"token": outbox[-1][1].split("token=")[1]})
    assert nana.get(f"/families/{fam['id']}").json()["learners"][0]["name"] == "Zawadi"
    assert nana.get(f"/sync/events?family_id={fam['id']}").status_code == 200
    assert (
        nana.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body(updated_at=LATER)).status_code
        == 403
    )
    assert (
        nana.patch(f"/families/{fam['id']}", json={"settings": {"goal": 1}, "updated_at": LATER}).status_code
        == 403
    )
    assert (
        nana.post(
            f"/families/{fam['id']}/invites", json={"email": "x@example.com", "role": "viewer"}
        ).status_code
        == 403
    )


def test_invite_rules(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    url = f"/families/{fam['id']}/invites"
    assert client.post(url, json={"email": "grace@example.com", "role": "parent"}).status_code == 409
    assert client.post(url, json={"email": "a@example.com", "role": "owner"}).status_code == 422
    inv = client.post(url, json={"email": "late@example.com", "role": "parent"}).json()
    with Session(engine) as db:
        db.get(Invite, inv["id"]).expires_at = utcnow() - timedelta(minutes=1)
        db.commit()
    assert (
        other_device(client)
        .post("/invites/accept", json={"token": outbox[-1][1].split("token=")[1]})
        .status_code
        == 400
    )
    inv2 = client.post(url, json={"email": "b@example.com", "role": "viewer"}).json()
    assert client.delete(f"{url}/{inv2['id']}").status_code == 204


def test_remove_and_leave(client, outbox):
    fam = family_with_consent(client, outbox)
    me = client.get("/me").json()["user"]["id"]
    client.post(f"/families/{fam['id']}/invites", json={"email": "b@example.com", "role": "parent"})
    b = other_device(client)
    b.post("/invites/accept", json={"token": outbox[-1][1].split("token=")[1]})
    b_id = b.get("/me").json()["user"]["id"]
    assert b.delete(f"/families/{fam['id']}/members/{me}").status_code == 403  # the owner stays
    assert client.delete(f"/families/{fam['id']}/members/{b_id}").status_code == 204
    assert b.get(f"/families/{fam['id']}").status_code == 404


def test_invite_email_escapes_names(monkeypatch):
    from app import mailer
    from app.settings import get_settings

    sent = []
    monkeypatch.setattr(get_settings(), "smtp_host", "smtp.example.com")
    monkeypatch.setattr(mailer, "_send", lambda to, subject, text, html: sent.append(html))
    mailer.send_invite(
        "a@example.com", "https://x/invite?token=t", "<b>Eve</b>", "<script>x</script>", "parent"
    )
    assert "<script>" not in sent[0] and "&lt;script&gt;" in sent[0]
