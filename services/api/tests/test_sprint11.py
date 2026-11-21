"""Sprint 11, part 1: Badge Studio (BST-01…06, BDG-07), wishes (BST-07), real-world rewards
(BST-04), class badges (T05) and wish emails (PAR-07)."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import mailer
from app.models import CustomBadge, EditHistory, MediaAsset, Wish
from tests.conftest import LATER, LEARNER, NOW, POLICY, family_with_consent, learner_body, sign_in
from tests.test_lessons_media import (
    M1,
    jpeg,
    storage,  # noqa: F401  (fixture)
    upload,
)
from tests.test_lessons_media import lesson as custom_lesson
from tests.test_sprint9 import a_class, teacher
from tests.test_sprint10 import class_with_children

B1 = "01JB0000000000000000000B01"
B2 = "01JB0000000000000000000B02"
W1 = "01JB0000000000000000000W01"
L1 = "01JB0000000000000000000P01"
LEO = "01JB0000000000000000000002"
OLDER = "2029-12-31T10:00:00Z"


def badge(**over):
    body = {
        "name": " Garden   Helper ",
        "shape": "circle",
        "colour": "green",
        "icon": "plant",
        "rule": {"type": "manual"},
        "treasures": 20,
        "reward": "Pick Friday's movie",
        "note": "Thank you for helping!",
        "audience": [LEARNER],
        "updated_at": NOW,
    }
    body.update(over)
    return body


def family_with_kids(client, outbox):
    fam = family_with_consent(client, outbox)
    fid = fam["id"]
    client.put(f"/families/{fid}/learners/{LEARNER}", json=learner_body())
    client.put(f"/families/{fid}/learners/{LEO}", json=learner_body(name="Leo", birth_year=2018))
    return fam, fid


def test_family_badges_save_with_their_rule_reward_and_who_can_earn_them(client, outbox, engine):
    _, fid = family_with_kids(client, outbox)
    r = client.put(f"/families/{fid}/badges/{B1}", json=badge())
    assert r.status_code == 200, r.text
    saved = r.json()
    assert saved["name"] == "Garden Helper"  # tidied to one line
    assert saved | {"updated_at": None} == {
        "id": B1,
        "name": "Garden Helper",
        "shape": "circle",
        "colour": "green",
        "icon": "plant",
        "photo": None,
        "note": "Thank you for helping!",
        "voice": None,
        "rule": {"type": "manual"},
        "treasures": 20,
        "reward": "Pick Friday's movie",
        "audience": [LEARNER],
        "source_share": None,
        "updated_at": None,
    }
    # Automatic rules: a custom lesson, a count, a streak, and up to 3 combined.
    client.put(f"/families/{fid}/lessons/{L1}", json=custom_lesson(updated_at=NOW))
    combo = {
        "type": "combo",
        "op": "and",
        "all": [{"type": "lesson", "lesson": L1}, {"type": "count", "metric": "stars", "n": 50}],
    }
    assert (
        client.put(
            f"/families/{fid}/badges/{B2}", json=badge(rule=combo, audience=[LEARNER, LEO])
        ).status_code
        == 200
    )
    assert [b["id"] for b in client.get(f"/families/{fid}/badges").json()["badges"]] == [B1, B2]


def test_badge_rules_and_limits_are_checked(client, outbox):
    _, fid = family_with_kids(client, outbox)
    put = lambda **over: client.put(f"/families/{fid}/badges/{B1}", json=badge(**over)).status_code  # noqa: E731
    assert put(treasures=50) == 200
    assert put(treasures=51, updated_at=LATER) == 422  # BST-03: capped to keep the economy fair
    assert put(name="   ", updated_at=LATER) == 422
    assert put(icon="unicorn", updated_at=LATER) == 422
    assert put(audience=[], updated_at=LATER) == 422
    assert put(audience=["01JB0000000000000000000099"], updated_at=LATER) == 422  # not this family's
    assert put(audience="class", updated_at=LATER) == 422  # classes are for teachers
    assert put(rule={"type": "assignment"}, updated_at=LATER) == 422  # teachers only
    assert put(rule={"type": "lesson", "lesson": L1}, updated_at=LATER) == 422  # no such lesson
    four = [{"type": "count", "metric": "stars", "n": n} for n in (1, 2, 3, 4)]
    assert put(rule={"type": "combo", "op": "or", "all": four}, updated_at=LATER) == 422
    assert put(rule={"type": "combo", "op": "or", "all": four[:1]}, updated_at=LATER) == 422
    manual_inside = [four[0], {"type": "manual"}]
    assert put(rule={"type": "combo", "op": "or", "all": manual_inside}, updated_at=LATER) == 422
    assert put(rule={"type": "count", "metric": "hugs", "n": 3}, updated_at=LATER) == 422


def test_newest_edit_wins_and_deleting_a_badge_keeps_it_for_children_who_earned_it(client, outbox, engine):
    _, fid = family_with_kids(client, outbox)
    client.put(f"/families/{fid}/badges/{B1}", json=badge())
    client.put(f"/families/{fid}/badges/{B1}", json=badge(name="Kind Helper", updated_at=LATER))
    assert client.put(f"/families/{fid}/badges/{B1}", json=badge(name="Old", updated_at=OLDER)).json()[
        "name"
    ] == ("Kind Helper")
    # A child earned it (the event carries the design), then a grown-up deletes the badge.
    award = {
        "id": "01JB00000000000000000E0001",
        "type": "badge_awarded",
        "learnerId": LEARNER,
        "at": NOW,
        "data": {
            "badgeId": B1,
            "name": "Kind Helper",
            "manual": True,
            "custom": {"name": "Kind Helper", "icon": "plant"},
        },
    }
    assert client.post("/sync/events", json={"family_id": fid, "events": [award]}).json()["accepted"] == [
        award["id"]
    ]
    assert client.delete(f"/families/{fid}/badges/{B1}").status_code == 204
    assert client.get(f"/families/{fid}/badges").json()["badges"] == []
    events = client.get("/sync/events", params={"family_id": fid}).json()["events"]
    assert [e["data"]["custom"]["name"] for e in events if e["type"] == "badge_awarded"] == ["Kind Helper"]
    with Session(engine) as db:
        kept = db.scalars(select(EditHistory.reason).where(EditHistory.entity == "badge")).all()
        assert sorted(kept) == ["deleted", "lost", "replaced"]


def test_badge_photos_and_voice_clips_are_kept_while_a_badge_uses_them(client, outbox, engine, storage):  # noqa: F811
    _, fid = family_with_kids(client, outbox)
    scopes = {"progress": True, "photos": True, "voice": True}
    client.post(
        f"/families/{fid}/consents", json={"policy_version": POLICY, "scopes": scopes, "agreed": True}
    )
    upload(client, fid, M1, jpeg())
    client.put(f"/families/{fid}/badges/{B1}", json=badge(photo=M1))
    client.put(f"/families/{fid}/badges/{B2}", json=badge(photo=M1, name="Second"))

    def released():
        with Session(engine) as db:
            return db.get(MediaAsset, M1).released_at is not None

    assert not released()
    client.delete(f"/families/{fid}/badges/{B1}")
    assert not released()  # B2 still uses the photo
    client.put(
        f"/families/{fid}/badges/{B2}", json=badge(name="Second", updated_at=LATER)
    )  # back to the icon
    assert released()  # its 30 days start (SAF-05)


def test_wishes_belong_to_one_child_and_the_newest_edit_wins(client, outbox):
    _, fid = family_with_kids(client, outbox)
    body = {"learner_id": LEARNER, "title": " Bedtime  story of my choice ", "price": 100, "updated_at": NOW}
    r = client.put(f"/families/{fid}/wishes/{W1}", json=body)
    assert r.status_code == 200 and r.json()["title"] == "Bedtime story of my choice"
    assert (
        client.put(f"/families/{fid}/wishes/{W1}", json=body | {"price": 150, "updated_at": LATER}).json()[
            "price"
        ]
        == 150
    )
    assert (
        client.put(f"/families/{fid}/wishes/{W1}", json=body | {"price": 5, "updated_at": OLDER}).json()[
            "price"
        ]
        == 150
    )
    assert (
        client.put(
            f"/families/{fid}/wishes/{W1}", json=body | {"price": 0, "updated_at": "2031-01-01T00:00:00Z"}
        ).status_code
        == 422
    )
    stranger = body | {"learner_id": "01JB0000000000000000000099", "updated_at": "2031-01-01T00:00:00Z"}
    assert client.put(f"/families/{fid}/wishes/{W1}", json=stranger).status_code == 422
    assert [w["id"] for w in client.get(f"/families/{fid}/wishes").json()["wishes"]] == [W1]
    assert client.delete(f"/families/{fid}/wishes/{W1}").status_code == 204
    assert client.get(f"/families/{fid}/wishes").json()["wishes"] == []
    # Another family can't see or touch them.
    other = TestClient(client.app)
    sign_in(other, outbox, "tom@example.com")
    other_fam = other.post("/families", json={"name": "Otieno family", "country": "ke"}).json()
    other.post(
        f"/families/{other_fam['id']}/consents",
        json={"policy_version": POLICY, "scopes": {"progress": True}, "agreed": True},
    )
    assert other.get(f"/families/{fid}/wishes").status_code in (403, 404)
    assert other.put(f"/families/{other_fam['id']}/wishes/{W1}", json=body).status_code == 422


def test_wish_requests_and_rewards_to_deliver_are_emailed_with_a_link_into_the_app(
    client, outbox, monkeypatch
):
    fam, fid = family_with_kids(client, outbox)
    client.put(
        f"/families/{fid}/wishes/{W1}",
        json={"learner_id": LEARNER, "title": "Bedtime story", "price": 50, "updated_at": NOW},
    )
    sent = []
    monkeypatch.setattr(
        mailer,
        "send_notice",
        lambda to, subject, lines, link="", label="": sent.append((to, subject, lines, link)),
    )

    def push(n, kind, **data):
        e = {
            "id": f"01JB00000000000000000E{n:04d}",
            "type": kind,
            "learnerId": LEARNER,
            "at": NOW,
            "data": data,
        }
        assert client.post("/sync/events", json={"family_id": fid, "events": [e]}).json()["accepted"] == [
            e["id"]
        ]

    push(1, "wish_requested", wishId=W1, amount=50)
    assert sent == []  # wish emails are off until a grown-up turns them on
    settings = {**fam["settings"], "emails": {"digest": True, "badges": False, "wishes": True}}
    client.patch(f"/families/{fid}", json={"settings": settings, "updated_at": LATER})
    push(2, "wish_requested", wishId=W1, amount=50)
    push(3, "badge_awarded", badgeId=B1, custom={"name": "Garden Helper", "reward": "Pick Friday's movie"})
    push(4, "wish_approved", wishId=W1)  # answers aren't emailed
    assert [(s[0], s[1], s[3]) for s in sent] == [
        ("grace@example.com", "A wish is waiting for you", "http://localhost:3000/family/rewards"),
        ("grace@example.com", "A reward to deliver", "http://localhost:3000/family/rewards"),
    ]
    assert (
        sent[0][2][0]
        == "Zawadi asked for “Bedtime story”. Their 50 treasures are kept safe until you answer."
    )
    assert (
        sent[1][2][0]
        == "Zawadi earned the Garden Helper badge: “Pick Friday's movie” is waiting for you to deliver."
    )
    # Every new kind of event is accepted by sync.
    for n, kind in enumerate(
        ["wish_declined", "wish_delivered", "reward_delivered", "badge_hidden"], start=5
    ):
        push(n, kind, wishId=W1, badgeId=B1)


def test_teachers_make_class_badges_and_award_them_in_class(client, outbox):
    c, ids = class_with_children(client, outbox)
    cid = c["id"]
    body = badge(audience="class", rule={"type": "manual"}, reward=None, note=None, treasures=15)
    assert client.put(f"/classes/{cid}/badges/{B1}", json=body).status_code == 200
    assert (
        client.put(f"/classes/{cid}/badges/{B2}", json=body | {"photo": M1}).status_code == 422
    )  # icons only
    assert (
        client.put(
            f"/classes/{cid}/badges/{B2}", json=body | {"rule": {"type": "lesson", "lesson": L1}}
        ).status_code
        == 422
    )
    assigned = body | {"rule": {"type": "assignment"}, "audience": [ids["Zawadi"]]}
    assert client.put(f"/classes/{cid}/badges/{B2}", json=assigned).status_code == 200
    assert [b["id"] for b in client.get(f"/classes/{cid}/badges").json()["badges"]] == [B1, B2]

    r = client.post(f"/classes/{cid}/badges/{B1}/award", json={"student_ids": [ids["Zawadi"], ids["Amani"]]})
    assert r.json() == {"awarded": [ids["Zawadi"], ids["Amani"]], "skipped": []}
    events = client.get(f"/classes/{cid}/events").json()["events"]
    zawadi = [e for e in events if e["learnerId"] == ids["Zawadi"]]
    assert [e["type"] for e in zawadi] == ["badge_awarded", "treasure_earned"]
    assert zawadi[0]["data"] == {
        "badgeId": B1,
        "name": "Garden Helper",
        "manual": True,
        "custom": {"name": "Garden Helper", "shape": "circle", "colour": "green", "icon": "plant"},
    }
    assert zawadi[1]["data"] == {"amount": 15, "reason": "badge", "badgeId": B1}
    # Earned once; only children the badge is for; only this class's children.
    again = client.post(
        f"/classes/{cid}/badges/{B1}/award",
        json={"student_ids": [ids["Zawadi"], "01JB0000000000000000000099"]},
    )
    assert again.json()["skipped"] == [
        {"id": ids["Zawadi"], "reason": "already earned"},
        {"id": "01JB0000000000000000000099", "reason": "not in this class"},
    ]
    only = client.post(f"/classes/{cid}/badges/{B2}/award", json={"student_ids": [ids["Baraka"]]})
    assert only.json()["skipped"] == [{"id": ids["Baraka"], "reason": "not for this child"}]
    # Deleting the badge keeps what was earned.
    assert client.delete(f"/classes/{cid}/badges/{B1}").status_code == 204
    assert (
        len(
            [e for e in client.get(f"/classes/{cid}/events").json()["events"] if e["type"] == "badge_awarded"]
        )
        == 2
    )


def test_class_badges_wait_for_the_schools_agreement_and_linked_parents_see_them(client, outbox):
    teacher(client, outbox)
    c = a_class(client)
    sid = client.post(f"/classes/{c['id']}/students", json={"students": [{"first_name": "Zawadi"}]}).json()[
        "added"
    ][0]["id"]
    client.put(f"/classes/{c['id']}/badges/{B1}", json=badge(audience="class", reward=None, note=None))
    r = client.post(f"/classes/{c['id']}/badges/{B1}/award", json={"student_ids": [sid]})
    assert r.json()["skipped"] == [{"id": sid, "reason": "school_consent"}]  # CLS-06
    # A linked parent's consent covers it, and the parent sees the badge on their Classes page.
    grace = TestClient(client.app)
    fam = family_with_consent(grace, outbox)
    grace.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    grace.post(
        f"/families/{fam['id']}/links",
        json={"code": c["join_code"], "student_id": sid, "learner_id": LEARNER},
    )
    assert client.post(f"/classes/{c['id']}/badges/{B1}/award", json={"student_ids": [sid]}).json()[
        "awarded"
    ] == [sid]
    links = grace.get(f"/families/{fam['id']}/links").json()["links"]
    assert [(b["id"], b["name"], b["icon"]) for b in links[0]["badges"]] == [(B1, "Garden Helper", "plant")]
    # Other teachers can't see or change the class's badges.
    other = TestClient(client.app)
    teacher(other, outbox, "james@hill.sc.ke", "Hill School")
    assert other.get(f"/classes/{c['id']}/badges").status_code == 404
    assert other.post(f"/classes/{c['id']}/badges/{B1}/award", json={"student_ids": [sid]}).status_code == 404


def test_badges_and_wishes_are_exported_and_deleted_with_the_family_and_the_child(
    client,
    outbox,
    engine,
    storage,  # noqa: F811
):
    import io
    import json
    import zipfile

    from app.models import Family
    from app.privacy import build_export, purge_family, purge_learner
    from app.storage import get_storage

    _, fid = family_with_kids(client, outbox)
    client.put(f"/families/{fid}/badges/{B1}", json=badge())
    client.put(
        f"/families/{fid}/wishes/{W1}",
        json={"learner_id": LEO, "title": "Pancakes", "price": 20, "updated_at": NOW},
    )
    with Session(engine) as db:
        data = build_export(db, get_storage(), db.get(Family, fid))
        record = json.loads(zipfile.ZipFile(io.BytesIO(data)).read("family.json"))
        assert [b["name"] for b in record["custom_badges"]] == ["Garden Helper"]
        assert [w["title"] for w in record["wishes"]] == ["Pancakes"]
        purge_learner(db, LEO)
        db.commit()
        assert db.scalars(select(Wish)).all() == []
        purge_family(db, get_storage(), fid)
        db.commit()
        assert db.scalars(select(CustomBadge)).all() == []
