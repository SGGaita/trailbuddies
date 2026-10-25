"""Sprint 7: data export (SAF-03), family deletion (SAF-04), retention (SAF-05), scrubbed
errors (SAF-07), learner removal with undo (FAM-03), US signed consent (ONB-06b), feature
flags and cohorts (OPS-06), beta invite codes and feedback, and Vercel + Supabase hosting."""

import io
import json
import re
import zipfile
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app import admin
from app.db import create_db_engine, engine_options, utcnow
from app.models import (
    Consent,
    ErrorReport,
    Event,
    Family,
    FamilyDeletion,
    Feedback,
    Learner,
    MediaAsset,
    User,
)
from app.privacy import daily
from app.scrub import scrub_sentry_event, scrub_text
from app.settings import Settings, get_settings
from app.storage import LocalStorage, get_storage
from tests.conftest import LATER, LEARNER, NOW, POLICY, family_with_consent, learner_body, sign_in

L1 = "01JB0000000000000000000K01"
PHOTO = "01JB0000000000000000000M01"
FUTURE = "2031-01-01T00:00:00Z"


@pytest.fixture()
def storage(client, tmp_path):
    s = LocalStorage(Settings(media_dir=str(tmp_path / "media"), media_url_base=""))
    client.app.dependency_overrides[get_storage] = lambda: s
    return s


def add_photo(engine, storage, family_id, user_id, media_id=PHOTO):
    storage.put(media_id, b"\xff\xd8photo")
    with Session(engine) as db:
        db.add(
            MediaAsset(
                id=media_id,
                family_id=family_id,
                kind="photo",
                content_type="image/jpeg",
                bytes=7,
                status="ready",
                created_by=user_id,
            )
        )
        db.commit()


def lesson(photo=PHOTO, updated_at=NOW):
    return {
        "title": "Our garden",
        "template": "learn",
        "cards": [
            {"id": "c1", "label": "Daisy", "emoji": "🌼", "photo": photo},
            {"id": "c2", "label": "Rose", "emoji": "🌹"},
            {"id": "c3", "label": "Tulip", "emoji": "🌷"},
        ],
        "assigned": [],
        "updated_at": updated_at,
    }


def me_id(client):
    return client.get("/me").json()["user"]["id"]


def token_of(link):
    return re.search(r"token=([^&\s]+)", link).group(1)


# --- SAF-03 export --------------------------------------------------------------------


def test_a_parent_downloads_everything_as_a_zip_for_seven_days(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    add_photo(engine, storage, fam["id"], me_id(client))
    client.post(
        "/sync/events",
        json={
            "family_id": fam["id"],
            "events": [
                {
                    "id": "01JB0000000000000000000E01",
                    "learnerId": LEARNER,
                    "type": "lesson_completed",
                    "at": NOW,
                    "data": {"stars": 3},
                }
            ],
        },
    )
    r = client.post(f"/families/{fam['id']}/exports")
    assert r.status_code == 201, r.text
    assert r.json()["bytes"] > 0
    to, link, subject = outbox[-1]
    assert to == "grace@example.com" and "ready" in subject and "/api/exports/" in link
    path = link.split("/api", 1)[1]
    z = zipfile.ZipFile(io.BytesIO(client.get(path).content))
    assert {"README.txt", "family.json", "progress.json", f"media/{PHOTO}.jpg"} <= set(z.namelist())
    data = json.loads(z.read("family.json"))
    assert data["learners"][0]["name"] == "Zawadi"
    assert data["grown_ups"][0]["email"] == "grace@example.com"
    assert data["consents"][0]["method"] == "checkbox"
    assert "lesson_completed" in z.read("progress.json").decode()
    assert len(client.get(f"/families/{fam['id']}/exports").json()["exports"]) == 1
    # A wrong token, and after 7 days, the link is dead and the nightly job deletes the file.
    assert client.get(path.split("token=")[0] + "token=nope").status_code == 404
    with Session(engine) as db:
        assert daily(db, storage, utcnow() + timedelta(days=8))["exports_deleted"] == 1
    assert client.get(path).status_code == 404


def test_exports_are_limited_and_parent_only(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    for _ in range(3):
        assert client.post(f"/families/{fam['id']}/exports").status_code == 201
    assert client.post(f"/families/{fam['id']}/exports").status_code == 429


# --- SAF-04 delete the family ---------------------------------------------------------


def test_deleting_the_family_needs_the_email_link_and_can_be_undone(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    assert client.post(f"/families/{fam['id']}/deletion").status_code == 202
    to, link, subject = outbox[-1]
    assert "Confirm" in subject and "/delete?token=" in link
    assert client.get(f"/families/{fam['id']}").json()["deletion"] is None  # not until confirmed
    r = client.post("/families/deletion/confirm", json={"token": token_of(link)})
    assert r.status_code == 200
    assert client.get(f"/families/{fam['id']}").json()["deletion"]["purge_after"] == r.json()["purge_after"]
    assert client.post(f"/families/{fam['id']}/deletion").status_code == 409
    assert client.post(f"/families/{fam['id']}/deletion/undo").status_code == 204
    assert client.get(f"/families/{fam['id']}").json()["deletion"] is None
    with Session(engine) as db:
        assert daily(db, storage, utcnow() + timedelta(days=30))["families_deleted"] == 0
    assert client.post("/families/deletion/confirm", json={"token": "x" * 20}).status_code == 404


def test_after_seven_days_everything_is_deleted_including_files(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    add_photo(engine, storage, fam["id"], me_id(client))
    client.put(f"/families/{fam['id']}/lessons/{L1}", json=lesson())
    client.post(f"/families/{fam['id']}/deletion")
    client.post("/families/deletion/confirm", json={"token": token_of(outbox[-1][1])})
    with Session(engine) as db:
        assert daily(db, storage, utcnow() + timedelta(days=6))["families_deleted"] == 0
        assert daily(db, storage, utcnow() + timedelta(days=7, minutes=1))["families_deleted"] == 1
        for model in (Family, Learner, MediaAsset, Consent, FamilyDeletion, User):
            assert db.scalar(select(func.count()).select_from(model)) == 0, model
    assert not storage.path(PHOTO).exists()
    assert client.get("/me").status_code == 401  # the grown-up had no other family


def test_only_the_owner_can_ask_to_delete(client, outbox, engine):
    from app.models import FamilyMember

    fam = family_with_consent(client, outbox)
    with Session(engine) as db:
        db.execute(update(FamilyMember).values(role="parent"))
        db.commit()
    assert client.post(f"/families/{fam['id']}/deletion").status_code == 403


# --- FAM-03 remove a learner with a 7-day undo ------------------------------------------


def test_a_removed_learner_can_be_brought_back_for_seven_days(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    gone = learner_body(removing_at=LATER, updated_at=LATER)
    out = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=gone).json()
    assert out["removing_at"] and out["purge_after"]
    # Undo: a newer edit with no removal.
    back = client.put(
        f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body(removing_at=None, updated_at=FUTURE)
    ).json()
    assert back["removing_at"] is None
    # Remove again; after 7 days the nightly job deletes the profile and its progress.
    client.put(
        f"/families/{fam['id']}/learners/{LEARNER}",
        json=learner_body(removing_at=FUTURE, updated_at="2031-01-02T00:00:00Z"),
    )
    with Session(engine) as db:
        db.add(
            Event(
                id="01JB0000000000000000000E02",
                family_id=fam["id"],
                learner_id=LEARNER,
                type="x",
                at=utcnow(),
            )
        )
        db.commit()
        assert daily(db, storage, utcnow() + timedelta(days=3))["learners_deleted"] == 0
        assert daily(db, storage, utcnow() + timedelta(days=8))["learners_deleted"] == 1
        assert db.scalar(select(func.count()).select_from(Event)) == 0
    assert client.get(f"/families/{fam['id']}").json()["learners"] == []


def test_a_learner_being_removed_frees_their_place_on_the_plan(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    with Session(engine) as db:
        db.execute(update(Family).values(plan="free"))
        db.commit()
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    other = "01JB0000000000000000000002"
    assert client.put(f"/families/{fam['id']}/learners/{other}", json=learner_body()).status_code == 402
    client.put(
        f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body(removing_at=LATER, updated_at=LATER)
    )
    assert client.put(f"/families/{fam['id']}/learners/{other}", json=learner_body()).status_code == 200


# --- SAF-05 retention -------------------------------------------------------------------


def test_media_from_a_deleted_lesson_is_deleted_30_days_later(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    add_photo(engine, storage, fam["id"], me_id(client))
    client.put(f"/families/{fam['id']}/lessons/{L1}", json=lesson())
    assert client.delete(f"/families/{fam['id']}/lessons/{L1}").status_code == 204
    with Session(engine) as db:
        assert db.get(MediaAsset, PHOTO).released_at is not None
        assert daily(db, storage, utcnow() + timedelta(days=29))["media_deleted"] == 0
        assert daily(db, storage, utcnow() + timedelta(days=31))["media_deleted"] == 1
        assert db.get(MediaAsset, PHOTO) is None
    assert not storage.path(PHOTO).exists()


def test_media_another_lesson_still_uses_is_kept(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    add_photo(engine, storage, fam["id"], me_id(client))
    client.put(f"/families/{fam['id']}/lessons/{L1}", json=lesson())
    client.put(f"/families/{fam['id']}/lessons/01JB0000000000000000000K02", json=lesson())
    client.delete(f"/families/{fam['id']}/lessons/{L1}")
    with Session(engine) as db:
        assert db.get(MediaAsset, PHOTO).released_at is None


def test_inactive_families_are_warned_twice_then_deleted(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    start = utcnow()
    with Session(engine) as db:
        assert daily(db, storage, start + timedelta(days=699))["warned"] == 0
        assert daily(db, storage, start + timedelta(days=701))["warned"] == 1
        assert "miss you" in outbox[-1][2]
        assert daily(db, storage, start + timedelta(days=702))["warned"] == 0  # once only
        assert daily(db, storage, start + timedelta(days=724))["warned"] == 1
        assert "deleted soon" in outbox[-1][2]
        assert daily(db, storage, start + timedelta(days=731))["inactive_deleted"] == 1
        assert db.get(Family, fam["id"]) is None


def test_opening_the_app_resets_the_inactivity_clock(client, outbox, engine, storage):
    fam = family_with_consent(client, outbox)
    with Session(engine) as db:
        db.execute(update(Family).values(active_at=utcnow() - timedelta(days=705), retention_notice="first"))
        db.commit()
    client.get("/me")  # a grown-up opens the app
    with Session(engine) as db:
        f = db.get(Family, fam["id"])
        assert f.retention_notice is None
        assert daily(db, storage)["warned"] == 0


# --- ONB-06b signed consent (US) --------------------------------------------------------


def us_family(client, outbox):
    sign_in(client, outbox)
    return client.post("/families", json={"name": "Miller family", "country": "US"}).json()


FORM = {
    "parent_name": "Grace Miller",
    "signature": "grace  miller",
    "relationship": "parent",
    "signed_on": "2030-01-01",
}


def test_us_families_sign_a_form_and_nothing_syncs_until_it_is_approved(client, outbox, engine, monkeypatch):
    monkeypatch.setattr(get_settings(), "review_email", "steve@example.com")
    fam = us_family(client, outbox)
    consent = {"policy_version": POLICY, "scopes": {"progress": True}, "agreed": True}
    r = client.post(f"/families/{fam['id']}/consents", json=consent)
    assert r.status_code == 422 and r.json()["detail"]["code"] == "signed_form_needed"
    bad = {**consent, "form": {**FORM, "signature": "G M"}}
    assert client.post(f"/families/{fam['id']}/consents", json=bad).status_code == 422
    r = client.post(f"/families/{fam['id']}/consents", json={**consent, "form": FORM})
    assert r.status_code == 201 and r.json()["status"] == "pending" and r.json()["method"] == "signed_form"
    assert outbox[-1][0] == "steve@example.com" and "waiting for review" in outbox[-1][2]
    assert client.get(f"/families/{fam['id']}").json()["consent"]["status"] == "pending"
    blocked = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    assert blocked.status_code == 403 and "waiting for review" in blocked.json()["detail"]
    # Steve approves it with the admin CLI; the parent is told and syncing starts.
    monkeypatch.setattr(admin, "get_engine", lambda: engine)
    with Session(engine) as db:
        cid = db.scalar(select(Consent.id))
        assert db.get(Consent, cid).evidence["parent_name"] == "Grace Miller"
    admin.main(["consents", "--approve", str(cid)])
    assert "consent form" in outbox[-1][2]
    assert client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body()).status_code == 200
    assert client.get(f"/families/{fam['id']}").json()["consent"]["status"] == "approved"


def test_a_rejected_form_asks_the_parent_to_sign_again(client, outbox, engine, monkeypatch):
    fam = us_family(client, outbox)
    consent = {"policy_version": POLICY, "scopes": {"progress": True}, "agreed": True, "form": FORM}
    client.post(f"/families/{fam['id']}/consents", json=consent)
    monkeypatch.setattr(admin, "get_engine", lambda: engine)
    with Session(engine) as db:
        cid = db.scalar(select(Consent.id))
    admin.main(["consents", "--reject", str(cid)])
    r = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    assert r.status_code == 403 and "sign the consent form again" in r.json()["detail"]


# --- OPS-06 flags, cohorts and beta codes ----------------------------------------------


def test_a_flag_on_for_the_beta_cohort_shows_only_for_beta_families(client, outbox, engine, monkeypatch):
    monkeypatch.setattr(admin, "get_engine", lambda: engine)
    fam = family_with_consent(client, outbox)
    assert fam["flags"]["beta-feedback"] is False and fam["cohorts"] == []
    admin.main(["flags", "beta-feedback", "--cohort", "beta"])
    assert client.get(f"/families/{fam['id']}/flags").json()["flags"]["beta-feedback"] is False
    admin.main(["cohort", fam["id"], "beta"])
    r = client.get(f"/families/{fam['id']}").json()
    assert r["cohorts"] == ["beta"] and r["flags"]["beta-feedback"] is True
    admin.main(["flags", "brand-new", "--everyone", "on"])
    assert client.get(f"/families/{fam['id']}/flags").json()["flags"]["brand-new"] is True


def test_invite_codes_put_families_in_the_beta(client, outbox, engine, monkeypatch, capsys):
    monkeypatch.setattr(admin, "get_engine", lambda: engine)
    admin.main(["codes", "--new", "1", "--note", "Nairobi playtest"])
    code = capsys.readouterr().out.strip()
    assert re.fullmatch(r"TB-[A-HJ-NP-Z2-9]{6}", code)
    monkeypatch.setattr(get_settings(), "beta_code_required", True)
    sign_in(client, outbox)
    r = client.post("/families", json={"name": "Wanjiru family", "country": "KE"})
    assert r.status_code == 403 and r.json()["detail"]["code"] == "invite_needed"
    r = client.post("/families", json={"name": "Wanjiru family", "country": "KE", "invite_code": "TB-NOPE00"})
    assert r.json()["detail"]["code"] == "invite_invalid"
    r = client.post(
        "/families", json={"name": "Wanjiru family", "country": "KE", "invite_code": code.lower()}
    )
    assert r.status_code == 201 and r.json()["cohorts"] == ["beta"]
    # A one-use code is used up.
    other = TestClient(client.app)
    sign_in(other, outbox, "amina@example.com")
    r = other.post("/families", json={"name": "Otieno family", "country": "KE", "invite_code": code})
    assert r.status_code == 403
    monkeypatch.setattr(get_settings(), "beta_code_required", False)
    fid = other.post("/families", json={"name": "Otieno family", "country": "KE"}).json()["id"]
    assert other.post(f"/families/{fid}/beta", json={"code": code}).status_code == 404


def test_feedback_from_grown_ups_never_keeps_a_childs_name(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    r = client.post(
        f"/families/{fam['id']}/feedback",
        json={
            "kind": "idea",
            "message": "Zawadi loves the jigsaw! Email me at grace@example.com",
            "screen": "/family",
        },
    )
    assert r.status_code == 201
    with Session(engine) as db:
        msg = db.scalar(select(Feedback.message))
    assert "Zawadi" not in msg and "[child]" in msg and "[email]" in msg
    bad = {"kind": "rant", "message": "hello there"}
    assert client.post(f"/families/{fam['id']}/feedback", json=bad).status_code == 422


# --- SAF-07 errors --------------------------------------------------------------------


def test_scrubbing_removes_names_emails_and_media_links():
    text = (
        "TypeError at https://app.trailbuddies.africa/play/lesson/x?learner=1 loading "
        "https://abc.r2.cloudflarestorage.com/media/01J?X-Amz-Signature=9 for Amani (amani.mum@mail.com) "
        "blob:https://app/123 token=abcdef"
    )
    out = scrub_text(text, ["Amani"])
    assert "Amani" not in out and "mail.com" not in out and "abcdef" not in out
    assert "cloudflarestorage" not in out and "blob:" not in out
    assert "https://app.trailbuddies.africa/play/lesson/x" in out and "learner=1" not in out
    event = {
        "user": {"email": "x@y.z"},
        "request": {"url": "https://api/x?token=1", "cookies": "tb_session=1", "data": {"name": "Amani"}},
        "exception": {
            "values": [
                {"value": "bad /api/media/blob/1?sig=2", "stacktrace": {"frames": [{"vars": {"a": 1}}]}}
            ]
        },
        "extra": {"learner": "Amani"},
    }
    out = scrub_sentry_event(event)
    assert "user" not in out and "extra" not in out and "cookies" not in out["request"]
    assert out["request"]["url"] == "https://api/x"
    assert "sig=2" not in out["exception"]["values"][0]["value"]
    assert "vars" not in out["exception"]["values"][0]["stacktrace"]["frames"][0]


def test_our_own_error_log_keeps_scrubbed_reports_for_30_days(client, engine, storage, monkeypatch):
    monkeypatch.setattr(get_settings(), "sentry_dsn", "")
    body = {
        "release": "abc",
        "screen": "/play/lesson/counting-1-5?x=1",
        "message": "Oops for a@b.co",
        "stack": "at x",
    }
    assert client.post("/errors", json=body).status_code == 204
    with Session(engine) as db:
        row = db.scalar(select(ErrorReport))
        assert row.screen == "/play/lesson/counting-1-5" and "a@b.co" not in row.message
        assert daily(db, storage, utcnow() + timedelta(days=31))["errors_deleted"] == 1
    monkeypatch.setattr(get_settings(), "sentry_dsn", "https://k@o1.ingest.sentry.io/1")
    client.post("/errors", json=body)  # Sentry is in use: nothing stored here
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(ErrorReport)) == 0


# --- Hosting: Vercel Cron, Supabase pooler, inline email ----------------------------------


def test_the_nightly_job_runs_from_vercel_cron_with_the_secret(client, storage, monkeypatch):
    monkeypatch.setattr(get_settings(), "cron_secret", "")
    assert client.get("/cron/daily").status_code == 401  # no secret set: never open
    monkeypatch.setattr(get_settings(), "cron_secret", "s3cret")
    assert client.get("/cron/daily", headers={"Authorization": "Bearer nope"}).status_code == 401
    r = client.get("/api/cron/daily", headers={"Authorization": "Bearer s3cret"})
    assert r.status_code == 200 and "families_deleted" in r.json()


def test_supabase_transaction_pooler_gets_no_pool_and_no_prepared_statements():
    url = "postgresql+psycopg://postgres.abc:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
    opts = engine_options(url)
    assert opts["poolclass"] is NullPool and opts["connect_args"] == {"prepare_threshold": None}
    assert engine_options("postgresql+psycopg://u:p@localhost:5432/db") == {"pool_pre_ping": True}
    assert (
        engine_options("postgresql+psycopg://u:p@localhost:5432/db", serverless=True)["poolclass"] is NullPool
    )
    eng = create_db_engine("sqlite:///:memory:?pgbouncer=true", serverless=True)
    assert "pgbouncer" not in str(eng.url)


def test_on_vercel_emails_are_sent_inside_the_request(client, outbox, monkeypatch):
    monkeypatch.setattr(get_settings(), "serverless", True)
    calls = []
    from app.routes import auth

    monkeypatch.setattr(auth, "send_magic_link", lambda to, link: calls.append(to))
    client.post("/auth/magic-link", json={"email": "grace@example.com"})
    assert calls == ["grace@example.com"]


def test_vercel_config_routes_the_api_and_runs_the_cron_in_frankfurt():
    from pathlib import Path

    cfg = json.loads((Path(__file__).resolve().parents[3] / "vercel.json").read_text())
    assert cfg["services"]["api"]["root"] == "services/api"
    assert cfg["regions"] == ["fra1"]
    assert {"path": "/api/cron/daily", "schedule": "15 3 * * *"} in cfg["crons"]
