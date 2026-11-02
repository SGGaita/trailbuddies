"""Sprint 8: second parent and view-only carer (FAM-05, FAM-06), picture passwords (FAM-02),
letter sounds (LES-19), badge emails and the weekly digest (PAR-07, BDG-06), contact support
(HLP-02) and first-party product metrics (OPS-07)."""

import re
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app import admin
from app.metrics import compute_week, last_full_week, store_weeks
from app.models import Event, Family, Invite, MediaAsset, SupportTicket, WeeklyMetric
from app.notify import weekly_digest
from app.settings import get_settings
from tests.conftest import LATER, LEARNER, NOW, family_with_consent, learner_body

CLIP = "01JB0000000000000000000V01"
CLIP2 = "01JB0000000000000000000V02"


def invite_token(outbox):
    return re.search(r"token=([^&\s]+)", outbox[-1][1]).group(1)


def add_clip(engine, family_id, user_id, media_id=CLIP):
    with Session(engine) as db:
        db.add(
            MediaAsset(
                id=media_id,
                family_id=family_id,
                kind="voice",
                content_type="audio/wav",
                bytes=10,
                status="ready",
                created_by=user_id,
            )
        )
        db.commit()


def event(eid, type_, at, data, learner=LEARNER):
    return {"id": eid, "learnerId": learner, "type": type_, "at": at, "data": data}


# --- FAM-05 / FAM-06 --------------------------------------------------------------------


def test_invites_are_logged_and_an_expired_one_can_be_resent(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    client.patch("/me", json={"name": "Grace"})
    r = client.post(f"/families/{fam['id']}/invites", json={"email": "tom@example.com", "role": "parent"})
    inv_id = r.json()["id"]
    first = invite_token(outbox)
    with Session(engine) as db:  # 8 days later, nobody accepted
        db.execute(update(Invite).values(expires_at=datetime.now(UTC) - timedelta(days=1)))
        db.commit()
    tom = TestClient(client.app)
    assert tom.post("/invites/accept", json={"token": first}).status_code == 400
    log = client.get(f"/families/{fam['id']}/members").json()
    assert log["invites"] == []
    assert log["history"][0] | {"created_at": None, "expires_at": None} == {
        "id": inv_id,
        "email": "tom@example.com",
        "role": "parent",
        "invited_by": "Grace",
        "status": "expired",
        "created_at": None,
        "resent_at": None,
        "accepted_at": None,
        "expires_at": None,
    }
    r = client.post(f"/families/{fam['id']}/invites/{inv_id}/resend")
    assert r.status_code == 200 and r.json()["status"] == "pending" and r.json()["resent_at"]
    fresh = invite_token(outbox)
    assert fresh != first
    assert tom.post("/invites/accept", json={"token": first}).status_code == 400  # the old link is dead
    assert tom.post("/invites/accept", json={"token": fresh}).status_code == 200
    log = client.get(f"/families/{fam['id']}/members").json()
    assert log["history"][0]["status"] == "accepted" and log["history"][0]["accepted_at"]
    # Tom has equal access.
    assert tom.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body()).status_code == 200
    assert client.post(f"/families/{fam['id']}/invites/{inv_id}/resend").status_code == 409


def test_a_cancelled_invite_stays_in_the_log_and_its_link_stops_working(client, outbox):
    fam = family_with_consent(client, outbox)
    inv_id = client.post(
        f"/families/{fam['id']}/invites", json={"email": "gran@example.com", "role": "viewer"}
    ).json()["id"]
    token = invite_token(outbox)
    assert client.delete(f"/families/{fam['id']}/invites/{inv_id}").status_code == 204
    assert client.get(f"/families/{fam['id']}/members").json()["history"][0]["status"] == "cancelled"
    assert TestClient(client.app).post("/invites/accept", json={"token": token}).status_code == 400


def test_a_viewer_sees_progress_but_can_change_nothing(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    fid = fam["id"]
    client.put(f"/families/{fid}/learners/{LEARNER}", json=learner_body())
    client.post(f"/families/{fid}/invites", json={"email": "gran@example.com", "role": "viewer"})
    gran = TestClient(client.app)
    assert gran.post("/invites/accept", json={"token": invite_token(outbox)}).json()["role"] == "viewer"
    assert gran.get(f"/families/{fid}").json()["learners"][0]["name"] == "Zawadi"
    assert gran.get(f"/sync/events?family_id={fid}").status_code == 200
    cards = [{"id": f"c{i}", "label": f"Card {i}"} for i in range(3)]
    lesson = {"title": "x", "template": "learn", "cards": cards, "updated_at": NOW}
    writes = [
        ("put", f"/families/{fid}/learners/{LEARNER}", learner_body(updated_at=LATER)),
        ("delete", f"/families/{fid}/learners/{LEARNER}", None),
        ("patch", f"/families/{fid}", {"settings": fam["settings"], "updated_at": LATER}),
        ("put", f"/families/{fid}/lessons/01JB0000000000000000000K01", lesson),
        ("post", "/sync/events", {"family_id": fid, "events": []}),  # treasures spent in the shop
        ("post", f"/families/{fid}/invites", {"email": "x@example.com", "role": "parent"}),
        ("put", f"/families/{fid}/sounds/s", {"media_id": None}),
        (
            "post",
            f"/families/{fid}/media",
            {"id": CLIP, "kind": "voice", "content_type": "audio/wav", "bytes": 9},
        ),
        ("post", f"/families/{fid}/exports", None),
        ("post", f"/families/{fid}/deletion", None),
        ("post", f"/families/{fid}/beta", {"code": "TB-AAAAAA"}),
    ]
    for method, url, body in writes:
        r = getattr(gran, method)(url, **({"json": body} if body is not None else {}))
        assert r.status_code == 403, (method, url, r.status_code, r.text)


# --- FAM-02 picture password ---------------------------------------------------------------


def test_a_picture_password_is_stored_hashed_with_its_hint_and_can_be_reset(client, outbox):
    fam = family_with_consent(client, outbox)
    lock = {"salt": "c2FsdA==", "hash": "aGFzaA==", "iterations": 20000, "hint": "cat"}
    r = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body(picture_lock=lock))
    assert r.status_code == 200, r.text
    assert r.json()["picture_lock"] == lock
    bad = learner_body(picture_lock={**lock, "hint": "car"}, updated_at=LATER)
    assert client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=bad).status_code == 422
    reset = learner_body(picture_lock=None, updated_at=LATER)
    assert client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=reset).json()["picture_lock"] is None


# --- LES-19 letter sounds ---------------------------------------------------------------------


def test_letter_sounds_are_kept_per_family_and_replaced_clips_are_released(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    me = client.get("/me").json()["user"]["id"]
    add_clip(engine, fam["id"], me)
    add_clip(engine, fam["id"], me, CLIP2)
    r = client.get(f"/families/{fam['id']}/sounds").json()
    assert r["sounds"] == {} and len(r["all"]) == 36 and "sh" in r["all"]
    assert client.put(f"/families/{fam['id']}/sounds/sh", json={"media_id": CLIP}).json()["sounds"] == {
        "sh": CLIP
    }
    assert client.get(f"/families/{fam['id']}").json()["sounds"] == {"sh": CLIP}  # every device gets it
    client.put(f"/families/{fam['id']}/sounds/sh", json={"media_id": CLIP2})
    with Session(engine) as db:
        assert db.get(MediaAsset, CLIP).released_at is not None  # deleted 30 days later
        assert db.get(MediaAsset, CLIP2).released_at is None
    assert client.put(f"/families/{fam['id']}/sounds/sh", json={"media_id": None}).json()["sounds"] == {}
    assert client.put(f"/families/{fam['id']}/sounds/qu", json={"media_id": None}).status_code == 404
    other = "01JB0000000000000000000V09"
    assert client.put(f"/families/{fam['id']}/sounds/s", json={"media_id": other}).status_code == 422


# --- PAR-07 / BDG-06 emails -------------------------------------------------------------------


def test_badge_emails_are_off_by_default_then_at_most_hourly(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    fid = fam["id"]
    client.put(f"/families/{fid}/learners/{LEARNER}", json=learner_body())
    assert fam["settings"]["emails"] == {"digest": True, "badges": False, "wishes": False}

    def badge(i):
        return event(
            f"01JB0000000000000000000B0{i}",
            "badge_awarded",
            NOW,
            {"badgeId": "first-steps", "name": "First Steps"},
        )

    client.post("/sync/events", json={"family_id": fid, "events": [badge(1)]})
    assert not any("badge" in str(x[2]).lower() for x in outbox if len(x) > 2)
    settings = {**fam["settings"], "emails": {"digest": True, "badges": True, "wishes": False}}
    client.patch(f"/families/{fid}", json={"settings": settings, "updated_at": LATER})
    client.post("/sync/events", json={"family_id": fid, "events": [badge(2)]})
    mails = [x for x in outbox if len(x) > 2 and x[2] == "A new Trailbuddies badge!"]
    assert len(mails) == 1 and mails[0][0] == "grace@example.com"
    client.post("/sync/events", json={"family_id": fid, "events": [badge(3)]})
    assert len([x for x in outbox if len(x) > 2 and x[2] == "A new Trailbuddies badge!"]) == 1


def test_the_weekly_digest_lists_each_childs_badges_and_time(client, outbox, engine, monkeypatch):
    fam = family_with_consent(client, outbox)
    fid = fam["id"]
    client.put(f"/families/{fid}/learners/{LEARNER}", json=learner_body())
    lines = []
    from app import mailer

    monkeypatch.setattr(
        mailer, "send_notice", lambda to, subject, ls, link="", label="": lines.append((to, subject, ls))
    )
    now = datetime.now(UTC)
    at = (now - timedelta(days=2)).isoformat()
    client.post(
        "/sync/events",
        json={
            "family_id": fid,
            "events": [
                event("01JB0000000000000000000E11", "lesson_completed", at, {"durationSec": 600, "stars": 3}),
                event(
                    "01JB0000000000000000000E12",
                    "badge_awarded",
                    at,
                    {"badgeId": "counting-champ", "name": "Counting Champ"},
                ),
            ],
        },
    )
    with Session(engine) as db:
        assert weekly_digest(db, now) == 1
        assert weekly_digest(db, now + timedelta(hours=1)) == 0  # once a week
    to, subject, body = lines[-1]
    assert to == "grace@example.com" and subject == "Your Trailbuddies week"
    assert "Zawadi: 10 minutes, 1 lessons. Badges: Counting Champ." in body
    assert any("Settings, Emails" in x for x in body)
    # Switched off: nothing next week.
    settings = {**fam["settings"], "emails": {"digest": False, "badges": False, "wishes": False}}
    client.patch(f"/families/{fid}", json={"settings": settings, "updated_at": LATER})
    with Session(engine) as db:
        assert weekly_digest(db, now + timedelta(days=7)) == 0


def test_the_weekly_cron_needs_the_secret(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "cron_secret", "s3cret")
    assert client.get("/cron/weekly").status_code == 401
    r = client.get("/api/cron/weekly", headers={"Authorization": "Bearer s3cret"})
    assert r.status_code == 200 and "digests" in r.json() and len(r.json()["metrics_weeks"]) == 12


# --- HLP-02 contact support -------------------------------------------------------------------


def test_contact_support_gives_a_reference_and_keeps_no_child_data(client, outbox, engine, monkeypatch):
    monkeypatch.setattr(get_settings(), "support_email", "help@trailbuddies.africa")
    fam = family_with_consent(client, outbox)
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    body = {
        "topic": "lessons",
        "subject": "Sound stops",
        "message": "Zawadi's lesson goes quiet after the second step.",
        "diagnostics": {
            "app_version": "0.8.0",
            "device": "Chrome on Android",
            "errors": ["TypeError at /play/lesson/x for Zawadi"],
            "secret": "nope",
        },
    }
    r = client.post("/support", json=body)
    assert r.status_code == 201 and re.fullmatch(r"TB-[A-HJ-NP-Z2-9]{5}", r.json()["ref"])
    ref = r.json()["ref"]
    with Session(engine) as db:
        t = db.scalar(select(SupportTicket))
        assert "Zawadi" not in t.message and "Zawadi" not in str(t.diagnostics)
        assert "secret" not in t.diagnostics and t.diagnostics["device"] == "Chrome on Android"
    subjects = [x[2] for x in outbox if len(x) > 2]
    assert f"We got your message ({ref})" in subjects
    assert any(s.startswith(f"[{ref}]") for s in subjects)
    for _ in range(4):
        client.post("/support", json={**body, "diagnostics": None})
    assert client.post("/support", json=body).status_code == 429


# --- OPS-07 metrics ---------------------------------------------------------------------------


def test_weekly_metrics_are_aggregates_only(client, outbox, engine, capsys, monkeypatch):
    fam = family_with_consent(client, outbox)
    fid = fam["id"]
    client.put(f"/families/{fid}/learners/{LEARNER}", json=learner_body())
    now = datetime(2030, 3, 13, 12, tzinfo=UTC)  # a Wednesday
    week = last_full_week(now)
    assert week.isoformat() == "2030-03-04"
    with Session(engine) as db:
        db.execute(update(Family).values(created_at=datetime(2030, 3, 4, 9, tzinfo=UTC)))
        for i, (day, learner) in enumerate([(5, LEARNER), (6, LEARNER), (12, LEARNER)]):
            db.add(
                Event(
                    id=f"01JB0000000000000000000M{i:02d}",
                    family_id=fid,
                    learner_id=learner,
                    type="lesson_completed",
                    at=datetime(2030, 3, day, 10, tzinfo=UTC),
                    data={"durationSec": 300},
                )
            )
        db.commit()
        data = compute_week(db, week)
        assert data == {
            "families_new": 1,
            "families_activated": 1,
            "activation_rate": 1.0,
            "active_families": 1,
            "active_learners": 1,
            "lessons": 2,
            "lessons_per_learner": 2.0,
            "minutes": 10,
            "retained_from_last_week": 0,
            "retention_rate": None,
        }
        store_weeks(db, now, back=2)
        assert db.scalar(select(func.count()).select_from(WeeklyMetric)) == 2
        stored = str([r.data for r in db.scalars(select(WeeklyMetric))])
        assert fid not in stored and LEARNER not in stored and "Zawadi" not in stored
    monkeypatch.setattr(admin, "get_engine", lambda: engine)
    admin.main(["metrics", "--weeks", "2"])
    out = capsys.readouterr().out
    assert "2030-03-04" in out and "learners" in out
    admin.main(["metrics", "--json"])
    assert '"week": "2030-03-04"' in capsys.readouterr().out


def test_vercel_runs_the_weekly_job_on_sunday_evening():
    import json
    from pathlib import Path

    cfg = json.loads((Path(__file__).resolve().parents[3] / "vercel.json").read_text())
    assert {"path": "/api/cron/weekly", "schedule": "0 17 * * 0"} in cfg["crons"]
