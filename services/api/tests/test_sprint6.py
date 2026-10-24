"""Sprint 6: level locks (ADP-02), lesson settings and card extras (BLD-03/06), Google linking
(ONB-03), country and consent region (ONB-05), devices (FAM-08), break and access settings
(PAR-04, ACC-02/03) and content packs (CNT-02)."""

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import update

from app.devices import device_name
from app.models import Consent, Family
from app.packs import publish
from app.regions import region_for
from app.settings import Settings
from app.storage import LocalStorage, get_storage
from tests.conftest import LATER, LEARNER, NOW, family_with_consent, learner_body, sign_in

L1 = "01JB0000000000000000000P01"
ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36"
IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1"


@pytest.fixture()
def storage(client, tmp_path):
    s = LocalStorage(Settings(media_dir=str(tmp_path / "media"), media_url_base=""))
    client.app.dependency_overrides[get_storage] = lambda: s
    return s


def test_a_learner_keeps_a_level_lock_per_subject(client, outbox):
    fam = family_with_consent(client, outbox)
    body = learner_body(levels={"numbers": "1"})
    r = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=body)
    assert r.status_code == 200, r.text
    assert r.json()["levels"] == {"numbers": "1"}
    bad = learner_body(levels={"numbers": "9"}, updated_at=LATER)
    assert client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=bad).status_code == 422


def test_lesson_settings_and_card_extras_are_kept(client, outbox):
    fam = family_with_consent(client, outbox)
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    lesson = {
        "title": "Farm count",
        "template": "learn",
        "cards": [
            {"id": "c1", "label": "Three cows", "emoji": "🐄", "number": 3, "fact": "Cows give milk."},
            {"id": "c2", "label": "Two ducks", "emoji": "🦆", "number": 2, "group": "water"},
            {"id": "c3", "label": "Hen", "emoji": "🐔"},
        ],
        "assigned": [LEARNER],
        "options": {"band": "seedling", "activities": 5, "hints": "light", "games": ["memory"]},
        "updated_at": NOW,
    }
    r = client.put(f"/families/{fam['id']}/lessons/{L1}", json=lesson)
    assert r.status_code == 200, r.text
    out = client.get(f"/families/{fam['id']}/lessons").json()["lessons"][0]
    assert out["options"] == {"band": "seedling", "activities": 5, "hints": "light", "games": ["memory"]}
    assert out["cards"][0]["number"] == 3 and out["cards"][0]["fact"] == "Cows give milk."
    for bad in ({"activities": 12}, {"hints": "lots"}, {"band": "baby"}):
        r = client.put(
            f"/families/{fam['id']}/lessons/{L1}", json={**lesson, "options": bad, "updated_at": LATER}
        )
        assert r.status_code == 422
    big = {**lesson, "cards": [{**lesson["cards"][0], "number": 99}], "updated_at": LATER}
    assert client.put(f"/families/{fam['id']}/lessons/{L1}", json=big).status_code == 422


def test_break_caption_and_calm_settings(client, outbox):
    fam = family_with_consent(client, outbox)
    assert fam["settings"]["breaks"] == 0
    assert fam["settings"]["captions"] is True and fam["settings"]["calm"] == "device"
    settings = {**fam["settings"], "breaks": 15, "captions": False, "calm": "on"}
    r = client.patch(f"/families/{fam['id']}", json={"settings": settings, "updated_at": LATER})
    assert r.json()["settings"]["breaks"] == 15 and r.json()["settings"]["calm"] == "on"
    r = client.patch(
        f"/families/{fam['id']}",
        json={"settings": {**settings, "breaks": 7}, "updated_at": "2031-01-01T00:00:00Z"},
    )
    assert r.status_code == 422


def test_moving_to_a_country_with_different_rules_asks_for_consent_again(client, outbox):
    fam = family_with_consent(client, outbox)  # Kenya
    assert fam["region"] == "kenya-dpa"
    assert client.get(f"/families/{fam['id']}").json()["consent"]["region"] == "kenya-dpa"
    assert client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body()).status_code == 200
    # Same rules: nothing to do. Different rules: writes wait for consent again.
    r = client.patch(f"/families/{fam['id']}", json={"country": "GB", "updated_at": LATER})
    assert r.json()["region"] == "uk-gdpr"
    blocked = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body(updated_at=LATER))
    assert blocked.status_code == 403 and "agree again" in blocked.json()["detail"]
    client.post(
        f"/families/{fam['id']}/consents",
        json={"policy_version": "2026-10", "scopes": {"progress": True}, "agreed": True},
    )
    again = client.put(
        f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body(updated_at="2031-01-01T00:00:00Z")
    )
    assert again.status_code == 200
    assert region_for("FR") == "strict"


def test_devices_are_listed_named_and_can_be_signed_out(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    with engine.begin() as db:  # a Free family: 2 devices at once
        db.execute(update(Family).where(Family.id == fam["id"]).values(plan="free"))
    # Two more devices for the same grown-up (Free plan: 2 allowed).
    others = []
    for ua in (ANDROID, IPAD):
        c = TestClient(client.app, headers={"user-agent": ua})
        sign_in(c, outbox)
        others.append(c)
    r = client.get(f"/families/{fam['id']}/devices").json()
    assert r["limit"] == 2 and r["over"] == 1
    names = {d["name"] for d in r["devices"]}
    assert {"Chrome on Android", "Safari on iPad"} <= names
    assert sum(d["this_device"] for d in r["devices"]) == 1
    # Sign out the iPad from this device; the iPad is signed out.
    ipad = next(d for d in r["devices"] if d["name"] == "Safari on iPad")
    assert client.delete(f"/families/{fam['id']}/devices/{ipad['id']}").status_code == 204
    assert others[1].get("/me").status_code == 401
    assert client.get(f"/families/{fam['id']}/devices").json()["over"] == 0
    assert client.delete(f"/families/{fam['id']}/devices/nope").status_code == 404


def test_device_names_keep_only_browser_and_system():
    assert device_name(ANDROID) == "Chrome on Android"
    assert device_name(IPAD) == "Safari on iPad"
    assert device_name(None) == "Browser on a device"


def test_google_links_to_an_existing_email_account(client, outbox, monkeypatch):
    from app.routes import auth
    from app.settings import get_settings

    sign_in(client, outbox, "grace@example.com")
    first = client.get("/me").json()["user"]
    assert first["google"] is False
    client.post("/auth/logout")
    s = get_settings()
    monkeypatch.setattr(s, "google_client_id", "cid")
    monkeypatch.setattr(s, "google_client_secret", "secret")
    ident = {"aud": "cid", "sub": "g-123", "email": "Grace@Example.com", "email_verified": "true"}
    monkeypatch.setattr(auth, "google_identity", lambda code: ident)
    state = client.get("/auth/google/start", follow_redirects=False).cookies["tb_oauth_state"]
    client.get(f"/auth/google/callback?code=x&state={state}", follow_redirects=False)
    me = client.get("/me").json()["user"]
    assert me["id"] == first["id"] and me["google"] is True
    # Once linked, the Google account finds the same grown-up even if its email changes.
    client.post("/auth/logout")
    ident["email"] = "grace.new@example.com"
    state = client.get("/auth/google/start", follow_redirects=False).cookies["tb_oauth_state"]
    client.get(f"/auth/google/callback?code=x&state={state}", follow_redirects=False)
    assert client.get("/me").json()["user"]["id"] == first["id"]


def test_published_packs_are_served_without_sign_in(client, storage, tmp_path):
    folder = tmp_path / "packs"
    folder.mkdir()
    pack = {
        "schema": "pack/1",
        "subject": {"id": "numbers", "units": []},
        "units": [],
        "hash": "0123456789abcdef",
    }
    (folder / "numbers.0123456789abcdef.json").write_text(json.dumps(pack))
    manifest = {
        "schema": "packs/1",
        "release": "2027.03.1",
        "channel": "production",
        "packs": [
            {
                "subject": "numbers",
                "hash": "0123456789abcdef",
                "bytes": 99,
                "file": "numbers.0123456789abcdef.json",
            }
        ],
    }
    (folder / "manifest-production.json").write_text(json.dumps(manifest))
    assert client.get("/content/manifest").json() == {
        "schema": "packs/1",
        "release": None,
        "channel": "production",
        "packs": [],
    }
    assert publish(folder, storage) == ["numbers.0123456789abcdef.json", "manifest-production.json"]
    r = client.get("/content/manifest?channel=production")
    assert r.status_code == 200 and r.json()["release"] == "2027.03.1"
    r = client.get("/content/packs/numbers.0123456789abcdef.json")
    assert r.status_code == 200 and "immutable" in r.headers["cache-control"]
    assert client.get("/content/packs/..%2Fsecret.json").status_code == 404
    assert client.get("/content/manifest?channel=staging").status_code == 422


def test_a_consent_saved_before_regions_still_asks_again_after_a_move(client, outbox, engine):
    fam = family_with_consent(client, outbox)  # Kenya
    with engine.begin() as db:
        db.execute(update(Consent).values(region=None))
    client.patch(f"/families/{fam['id']}", json={"country": "US", "updated_at": LATER})
    r = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    assert r.status_code == 403
