"""Sprint 11, part 2: share codes (SHR-01…05), the image check (SAF-08, BST-08) and the
moderation queue (MOD-01…03)."""

from datetime import timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import utcnow
from app.models import CustomLesson, MediaAsset, ModerationAction, ModerationItem, Share
from app.moderation import remind
from app.privacy import purge_family
from app.settings import get_settings
from tests.conftest import LEARNER, NOW, POLICY, learner_body, sign_in
from tests.test_lessons_media import (
    M1,
    M2,
    jpeg,
    setup,
    storage,  # noqa: F401  (fixture)
    upload,
    wav,
)
from tests.test_lessons_media import lesson as custom_lesson
from tests.test_sprint9 import a_class, teacher

L1 = "01JB0000000000000000000P01"
L2 = "01JB0000000000000000000P02"
B1 = "01JB0000000000000000000B01"
CLEAN = {"flagged": False, "scores": {"porn": 0.01, "neutral": 0.97}, "model": "nsfwjs-mobilenet-v2"}
FLAGGED = {"flagged": True, "reason": "nudity", "scores": {"porn": 0.91}, "model": "nsfwjs-mobilenet-v2"}
ADMIN = "steve@trailbuddies.africa"


@pytest.fixture(autouse=True)
def safety_team(monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_emails", f"{ADMIN}, other@trailbuddies.africa")


def checklist(**over):
    body = {"no_names": True, "faces_checked": True, "not_child": [], "removed": []}
    body.update(over)
    return body


def grace_with_a_lesson(client, outbox, storage):  # noqa: F811
    """Grace's family: a lesson with a photo (M1) and her voice (M2), assigned to Zawadi."""
    fid = setup(client, outbox)
    assert upload(client, fid, M1, jpeg()).status_code == 200
    assert upload(client, fid, M2, wav(), kind="voice", ctype="audio/wav").status_code == 200
    assert client.put(f"/families/{fid}/lessons/{L1}", json=custom_lesson()).status_code == 200
    return fid


def new_family(client, outbox, email, name="Otieno family", photos=True):
    sign_in(client, outbox, email)
    fid = client.post("/families", json={"name": name, "country": "ke"}).json()["id"]
    scopes = {"progress": True, "photos": photos, "voice": photos}
    client.post(
        f"/families/{fid}/consents", json={"policy_version": POLICY, "scopes": scopes, "agreed": True}
    )
    return fid


def as_admin(client, outbox):
    sign_in(client, outbox, ADMIN)


def item_for(client, share_id):
    items = client.get("/admin/moderation").json()["items"]
    return next(i for i in items if (i["share"] or {}).get("id") == share_id)


def test_the_checklist_comes_first_and_the_package_holds_no_child_data(client, outbox, storage, engine):  # noqa: F811
    fid = grace_with_a_lesson(client, outbox, storage)
    share = {"kind": "lesson", "ids": [L1], "checklist": checklist(no_names=False)}
    r = client.post(f"/families/{fid}/shares", json=share)
    assert r.status_code == 422 and r.json()["detail"]["code"] == "checklist"  # SHR-03 scenario 2
    r = client.post(f"/families/{fid}/shares", json={**share, "checklist": checklist(faces_checked=False)})
    assert r.status_code == 422  # the face check must have run over the photos

    r = client.post(f"/families/{fid}/shares", json={**share, "checklist": checklist(not_child=[M1])})
    assert r.status_code == 201, r.text
    out = r.json()
    assert len(out["code"]) == 7 and out["code"][3] == "-"
    assert out["status"] == "review" and out["cards"] == 3  # has a photo: waits for the safety team

    with Session(engine) as db:
        s = db.get(Share, out["id"])
        text = str(s.package)
        # SHR-04: no learner ids, assignment, versions or the grown-up's voice (not ticked).
        for bad in (LEARNER, "assigned", "version", "updated_at", M2, L1):
            assert bad not in text
        assert s.media == [M1]
        assert s.checklist["no_names"] is True and s.checklist["not_child"] == [M1] and s.checklist["at"]


def test_review_then_import_a_copy_that_never_changes(client, outbox, storage):  # noqa: F811
    fid = grace_with_a_lesson(client, outbox, storage)
    body = {"kind": "lesson", "ids": [L1], "voice": True, "checklist": checklist(not_child=[M1])}
    share = client.post(f"/families/{fid}/shares", json=body).json()
    code = share["code"]

    other = new_family(client, outbox, "amina@example.com")
    r = client.get(f"/shares/{code}")
    assert r.status_code == 423 and r.json()["detail"]["code"] == "review"
    assert client.get(f"/shares/{code.replace('-', '').lower()}").status_code == 423  # typed any way

    as_admin(client, outbox)
    item = item_for(client, share["id"])
    assert item["kind"] == "share" and item["photos"] == [{"id": M1, "status": "ready"}]
    assert client.get(f"/admin/media/{M1}", follow_redirects=False).status_code == 307
    r = client.post(f"/admin/moderation/{item['id']}", json={"action": "approve", "reason": "Fine, a cow"})
    assert r.status_code == 200 and r.json()["status"] == "closed"

    sign_in(client, outbox, "amina@example.com")
    p = client.get(f"/shares/{code}")
    assert p.status_code == 200, p.text
    prev = p.json()
    assert prev["own"] is False and prev["by"]
    assert [c["label"] for c in prev["package"]["lessons"][0]["cards"]] == [
        "Simba the dog",
        "Daisy the cow",
        "Kuku the hen",
    ]
    assert client.get(f"/shares/{code}/media/{M1}", follow_redirects=False).status_code == 307
    assert client.get(f"/shares/{code}/media/01JB0000000000000000000M99").status_code == 404

    r = client.post(f"/shares/{code}/import", json={"family_id": other})
    assert r.status_code == 201, r.text
    copy = r.json()["lessons"][0]
    assert copy["assigned"] == [] and copy["source_share"] == share["id"] and copy["id"] != L1
    photo = copy["cards"][1]["photo"]
    assert photo != M1 and copy["cards"][1]["voice"] not in (None, M2)
    assert (
        client.get(f"/families/{other}/media/{photo}", follow_redirects=False).status_code == 307
    )  # their own file

    # SHR-02 scenario 2: the creator edits the original; the copy stays the same.
    sign_in(client, outbox)
    client.put(
        f"/families/{fid}/lessons/{L1}",
        json=custom_lesson(title="Changed", updated_at="2030-02-01T00:00:00Z"),
    )
    # SHR-01 scenario 2: revoking stops the code; existing copies are unaffected.
    assert client.delete(f"/families/{fid}/shares/{share['id']}").status_code == 204
    assert client.get(f"/families/{fid}/shares").json()["shares"][0]["status"] == "revoked"
    sign_in(client, outbox, "amina@example.com")
    r = client.get(f"/shares/{code}")
    assert r.status_code == 410 and r.json()["detail"]["message"] == "This code is no longer available."
    lessons = client.get(f"/families/{other}/lessons").json()["lessons"]
    assert [x["title"] for x in lessons] == ["Our Pets"]
    assert client.get("/shares/NOPE99").status_code == 404


def test_a_share_without_media_works_at_once_trails_and_class_badge_sets(client, outbox, storage):  # noqa: F811
    fid = setup(client, outbox)
    plain = custom_lesson(cards=[{"id": "a", "label": "Ant"}, {"id": "b", "label": "Bee"}])
    client.put(f"/families/{fid}/lessons/{L1}", json=plain)
    client.put(f"/families/{fid}/lessons/{L2}", json={**plain, "title": "Bugs 2"})
    r = client.post(
        f"/families/{fid}/shares", json={"kind": "trail", "ids": [L1, L2], "checklist": checklist()}
    )
    assert r.status_code == 201 and r.json()["status"] == "live" and r.json()["lessons"] == 2
    assert (
        client.post(
            f"/families/{fid}/shares", json={"kind": "trail", "ids": [L1], "checklist": checklist()}
        ).status_code
        == 422
    )

    teacher(client, outbox)
    c = a_class(client)
    badge = {
        "name": "Kind class",
        "shape": "circle",
        "colour": "blue",
        "icon": "heart",
        "rule": {
            "type": "combo",
            "op": "and",
            "all": [{"type": "assignment"}, {"type": "count", "metric": "stars", "n": 10}],
        },
        "treasures": 30,
        "audience": "class",
        "updated_at": NOW,
    }
    assert client.put(f"/classes/{c['id']}/badges/{B1}", json=badge).status_code == 200
    r = client.post(
        f"/classes/{c['id']}/shares", json={"kind": "badges", "ids": [B1], "checklist": checklist()}
    )
    assert r.status_code == 201 and r.json()["status"] == "live", r.text
    code = r.json()["code"]
    other_class = a_class(client, "Class 2A")
    copied = client.post(f"/shares/{code}/import", json={"class_id": other_class["id"]}).json()["badges"][0]
    assert copied["audience"] == "class" and copied["rule"]["type"] == "combo"
    # In a family, assignment conditions don't apply.
    other = new_family(client, outbox, "amina@example.com")
    client.put(f"/families/{other}/learners/{LEARNER[:-1]}9", json=learner_body())
    fam_copy = client.post(f"/shares/{code}/import", json={"family_id": other}).json()["badges"][0]
    assert fam_copy["rule"] == {"type": "count", "metric": "stars", "n": 10}
    assert fam_copy["audience"] == [f"{LEARNER[:-1]}9"]


def live_share(client, outbox, storage):  # noqa: F811
    fid = grace_with_a_lesson(client, outbox, storage)
    share = client.post(
        f"/families/{fid}/shares",
        json={"kind": "lesson", "ids": [L1], "checklist": checklist(not_child=[M1])},
    ).json()
    as_admin(client, outbox)
    client.post(
        f"/admin/moderation/{item_for(client, share['id'])['id']}",
        json={"action": "approve", "reason": "Looks fine"},
    )
    return fid, share


def test_three_families_reporting_suspend_the_code(client, outbox, storage):  # noqa: F811
    _, share = live_share(client, outbox, storage)
    code = share["code"]
    fams = []
    for email in ("a@example.com", "b@example.com", "c@example.com"):
        f = new_family(client, outbox, email)
        assert client.post(f"/shares/{code}/import", json={"family_id": f}).status_code == 201
        fams.append((email, f))
    # Only a family with a copy can report.
    lone = new_family(client, outbox, "d@example.com")
    assert (
        client.post(
            f"/shares/{share['id']}/reports", json={"family_id": lone, "reason": "unkind"}
        ).status_code
        == 404
    )

    for n, (email, f) in enumerate(fams):
        sign_in(client, outbox, email)
        r = client.post(f"/shares/{share['id']}/reports", json={"family_id": f, "reason": "child-photo"})
        assert r.status_code == 201 and r.json()["suspended"] is (n == 2)
    again = client.post(f"/shares/{share['id']}/reports", json={"family_id": fams[2][1], "reason": "unkind"})
    assert again.json()["already"] is True
    assert client.get(f"/shares/{code}").status_code == 410

    as_admin(client, outbox)
    item = item_for(client, share["id"])
    assert item["kind"] == "report" and item["reports"] == 3 and item["report_reasons"] == {"child-photo": 3}
    audit = client.get("/admin/moderation").json()["audit"]
    assert audit[0]["who"] == "automatic" and audit[0]["action"] == "suspend_share"

    # MOD-02: hiding the image makes it a placeholder for every family with a copy.
    before = len(outbox)
    r = client.post(
        f"/admin/moderation/{item['id']}",
        json={"action": "hide_image", "media_id": M1, "reason": "A child's face"},
    )
    assert r.status_code == 200 and r.json()["photos"][0]["status"] == "hidden"
    uploader = [m for m in outbox[before:] if len(m) > 2 and m[0] == "grace@example.com"]
    assert uploader and "hidden" in uploader[0][2]  # MOD-03: reason and how to appeal
    r = client.post(
        f"/admin/moderation/{item['id']}", json={"action": "suspend_share", "reason": "Child photo"}
    )
    assert r.json()["status"] == "closed" and r.json()["outcome"] == "removed"
    told = {m[0] for m in outbox if len(m) > 2 and m[2] == "We've reviewed the lesson you reported"}
    assert told == {"a@example.com", "b@example.com", "c@example.com"}

    sign_in(client, outbox, "a@example.com")
    copy = client.get(f"/families/{fams[0][1]}/lessons").json()["lessons"][0]
    photo = copy["cards"][1]["photo"]
    assert client.get(f"/families/{fams[0][1]}/media/{photo}").status_code == 404
    assert client.get(f"/families/{fams[0][1]}/media-hidden").json()["hidden"] == [photo]

    as_admin(client, outbox)
    log = [a["action"] for a in client.get("/admin/moderation").json()["audit"]]
    assert log[:3] == ["suspend_share", "hide_image", "suspend_share"]
    assert all(a["who"] == ADMIN for a in client.get("/admin/moderation").json()["audit"][:2])


def test_keeping_a_reported_share_brings_it_back(client, outbox, storage):  # noqa: F811
    _, share = live_share(client, outbox, storage)
    f = new_family(client, outbox, "a@example.com")
    client.post(f"/shares/{share['code']}/import", json={"family_id": f})
    client.post(
        f"/shares/{share['id']}/reports", json={"family_id": f, "reason": "other", "note": "Not sure"}
    )
    as_admin(client, outbox)
    item = item_for(client, share["id"])
    r = client.post(f"/admin/moderation/{item['id']}", json={"action": "keep", "reason": "Follows the rules"})
    assert r.json()["outcome"] == "kept"
    assert [m for m in outbox if len(m) > 2 and m[0] == "a@example.com" and m[2].startswith("We've reviewed")]


def test_a_flagged_photo_is_hidden_and_queued_then_restored(client, outbox, storage, engine):  # noqa: F811
    fid = setup(client, outbox)
    data = jpeg()
    r = client.post(
        f"/families/{fid}/media",
        json={"id": M1, "kind": "photo", "content_type": "image/jpeg", "bytes": len(data)},
    )
    from urllib.parse import urlsplit

    up = r.json()["upload"]
    u = urlsplit(up["url"])
    client.put(f"{u.path}?{u.query}", content=data, headers=up["headers"])
    r = client.post(f"/families/{fid}/media/{M1}/complete", json={"scan": FLAGGED})
    assert r.status_code == 200 and r.json()["status"] == "flagged"  # SAF-08
    assert client.get(f"/families/{fid}/media/{M1}").json()["detail"]["code"] == "hidden"
    assert client.get(f"/families/{fid}/media-hidden").json() == {"hidden": [M1]}
    # It can't be shared while flagged.
    client.put(
        f"/families/{fid}/lessons/{L1}", json=custom_lesson(cards=[{"id": "a", "label": "A", "photo": M1}])
    )
    r = client.post(f"/families/{fid}/shares", json={"kind": "lesson", "ids": [L1], "checklist": checklist()})
    assert r.status_code == 409

    # MOD-01: in the queue with its reason, upload date and preview; only for the safety team.
    assert client.get("/admin/moderation").status_code == 403
    as_admin(client, outbox)
    item = client.get("/admin/moderation").json()["items"][0]
    assert item["kind"] == "upload" and item["reason_text"] == "the image check flagged it"
    assert item["scan"]["scores"]["porn"] == 0.91 and item["uploaded_at"] and item["overdue"] is False
    r = client.post(
        f"/admin/moderation/{item['id']}", json={"action": "restore_image", "reason": "A painting"}
    )
    assert r.json()["outcome"] == "restored"
    with Session(engine) as db:
        assert db.get(MediaAsset, M1).status == "ready"
        assert db.scalars(select(ModerationAction.why)).all() == ["A painting"]

    # A clean scan is kept on the file for the record.
    sign_in(client, outbox)
    r = upload(client, fid, M2, jpeg())
    assert r.json()["status"] == "ready"


def test_the_daily_reminder_and_suspending_a_creator(client, outbox, storage, engine):  # noqa: F811
    _, share = live_share(client, outbox, storage)
    f = new_family(client, outbox, "a@example.com")
    client.post(f"/shares/{share['code']}/import", json={"family_id": f})
    client.post(f"/shares/{share['id']}/reports", json={"family_id": f, "reason": "unkind"})
    with Session(engine) as db:
        assert remind(db) == 0  # nothing has waited a day yet
        item = db.scalar(select(ModerationItem).where(ModerationItem.status == "open"))
        item.created_at = utcnow() - timedelta(hours=30)
        db.commit()
        before = len(outbox)
        assert remind(db) == 1
        assert {m[0] for m in outbox[before:]} == {ADMIN, "other@trailbuddies.africa"}
        assert remind(db) == 0  # once a day
    as_admin(client, outbox)
    item = item_for(client, share["id"])
    assert item["overdue"] is True
    r = client.post(
        f"/admin/moderation/{item['id']}", json={"action": "suspend_creator", "reason": "Repeated reports"}
    )
    assert r.status_code == 200
    sign_in(client, outbox)
    fid = client.get("/me").json()["families"][0]["id"]
    r = client.post(
        f"/families/{fid}/shares",
        json={"kind": "lesson", "ids": [L1], "checklist": checklist(not_child=[M1])},
    )
    assert r.status_code == 403 and r.json()["detail"]["code"] == "banned"


def test_deleting_the_family_deletes_its_shares(client, outbox, storage, engine):  # noqa: F811
    fid, share = live_share(client, outbox, storage)
    with Session(engine) as db:
        purge_family(db, storage, fid)
        db.commit()
        assert db.get(Share, share["id"]) is None
        assert db.scalars(select(CustomLesson)).all() == []
