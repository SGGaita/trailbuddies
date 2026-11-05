"""Sprint 10: groups within a class (CLS-07), assigning work (ASN-01), Class Island at home
(MAP-06b), class progress data (ASN-02..04), classroom devices (CRM-01) and 'Ask my teacher'
(CRM-02)."""

from fastapi.testclient import TestClient

from tests.conftest import LEARNER, POLICY, family_with_consent, learner_body, sign_in
from tests.test_lessons_media import (
    M1,
    M2,
    jpeg,
    storage,  # noqa: F401  (fixture)
    upload,
    wav,
)
from tests.test_lessons_media import lesson as custom_lesson
from tests.test_sprint9 import a_class, teacher

E = "01JB00000000000000000S10"
L1 = "01JB0000000000000000000P01"
DEVICE = "01JB0000000000000000000D01"


def ev(n, student, kind="lesson_completed", unit="water-animals", **data):
    base = {"unitId": unit, "subjectId": "animals"}
    if kind == "lesson_completed":
        base |= {"lessonId": f"{unit}:1", "kind": "lesson", "stars": 3, "durationSec": 120}
    return {
        "id": f"{E}{n:02d}",
        "type": kind,
        "learnerId": student,
        "at": "2030-01-01T10:00:00Z",
        "data": base | data,
    }


def class_with_children(client, outbox, names=("Zawadi", "Amani", "Baraka")):
    teacher(client, outbox)
    c = a_class(client)
    body = {"students": [{"first_name": n} for n in names]}
    roster = client.post(f"/classes/{c['id']}/students", json=body).json()["roster"]
    client.post(
        f"/schools/{client.get('/teacher').json()['school']['id']}/consent",
        json={"name": "Priya Shah", "role": "Class teacher", "agreed": True},
    )
    return c, {s["first_name"]: s["id"] for s in roster}


def test_groups_hold_children_of_the_class_only(client, outbox):
    c, ids = class_with_children(client, outbox)
    r = client.post(
        f"/classes/{c['id']}/groups",
        json={"name": " Readers ", "student_ids": [ids["Zawadi"], ids["Baraka"]]},
    )
    assert r.status_code == 201, r.text
    g = r.json()["groups"][0]
    assert g["name"] == "Readers" and sorted(g["student_ids"]) == sorted([ids["Zawadi"], ids["Baraka"]])
    # Names are unique in a class; strangers can't be added.
    assert client.post(f"/classes/{c['id']}/groups", json={"name": "readers"}).status_code == 422
    assert (
        client.post(
            f"/classes/{c['id']}/groups",
            json={"name": "Starters", "student_ids": ["01JB0000000000000000000XXX"]},
        ).status_code
        == 422
    )
    # Move children around; the class page lists groups.
    client.patch(f"/classes/{c['id']}/groups/{g['id']}", json={"student_ids": [ids["Amani"]]})
    assert client.get(f"/classes/{c['id']}").json()["groups"][0]["student_ids"] == [ids["Amani"]]
    # Another teacher can't see or change them.
    other = TestClient(client.app)
    teacher(other, outbox, "james@hill.sc.ke", "Hill School")
    assert other.patch(f"/classes/{c['id']}/groups/{g['id']}", json={"name": "Mine"}).status_code == 404
    # A child taken off the roster leaves their groups.
    client.delete(f"/classes/{c['id']}/students/{ids['Amani']}")
    assert client.get(f"/classes/{c['id']}").json()["groups"][0]["student_ids"] == []


def test_work_goes_to_the_class_a_group_or_chosen_children(client, outbox):
    c, ids = class_with_children(client, outbox)
    g = client.post(
        f"/classes/{c['id']}/groups", json={"name": "Readers", "student_ids": [ids["Zawadi"], ids["Baraka"]]}
    ).json()["groups"][0]
    unit = {"kind": "unit", "unit_id": "water-animals", "title": "Water animals"}
    r = client.post(
        f"/classes/{c['id']}/assignments",
        json=unit | {"target": {"type": "group", "group_id": g["id"]}, "due_on": "2030-01-04"},
    )
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["to"] == [ids["Baraka"], ids["Zawadi"]]  # roster order (by first name)
    assert a["due_on"] == "2030-01-04" and a["title"] == "Water animals"
    whole = client.post(f"/classes/{c['id']}/assignments", json=unit | {"target": {"type": "class"}}).json()
    assert len(whole["to"]) == 3
    one = client.post(
        f"/classes/{c['id']}/assignments",
        json=unit | {"target": {"type": "students", "student_ids": [ids["Amani"]]}},
    ).json()
    assert one["to"] == [ids["Amani"]]
    # Bad targets.
    bad = [
        {"type": "group", "group_id": "01JB0000000000000000000XXX"},
        {"type": "students", "student_ids": ["01JB0000000000000000000XXX"]},
        {"type": "students", "student_ids": []},
    ]
    for t in bad:
        assert client.post(f"/classes/{c['id']}/assignments", json=unit | {"target": t}).status_code == 422
    assert (
        client.post(
            f"/classes/{c['id']}/assignments",
            json={"kind": "unit", "unit_id": "../x", "title": "x", "target": {"type": "class"}},
        ).status_code
        == 422
    )
    # A group with work can't be deleted until the work is removed.
    r = client.delete(f"/classes/{c['id']}/groups/{g['id']}")
    assert r.status_code == 409 and r.json()["detail"]["titles"] == ["Water animals"]
    assert client.delete(f"/classes/{c['id']}/assignments/{a['id']}").status_code == 204
    assert client.delete(f"/classes/{c['id']}/groups/{g['id']}").status_code == 204
    listed = client.get(f"/classes/{c['id']}/assignments").json()["assignments"]
    assert [x["id"] for x in listed] == [whole["id"], one["id"]]
    # The first-week checklist ticks "Assign work".
    assert client.get("/teacher").json()["tips"]["assigned"] is True


def test_a_teachers_own_lesson_is_copied_and_its_photos_reach_linked_families(client, outbox, storage):  # noqa: F811
    # Priya is a parent too, with a Lesson Builder lesson that has a photo and a voice clip.
    fam = family_with_consent(client, outbox)
    client.post(
        f"/families/{fam['id']}/consents",
        json={
            "policy_version": POLICY,
            "scopes": {"progress": True, "photos": True, "voice": True},
            "agreed": True,
        },
    )
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    assert upload(client, fam["id"], M1, jpeg()).status_code == 200
    assert upload(client, fam["id"], M2, wav(), kind="voice", ctype="audio/wav").status_code == 200
    assert client.put(f"/families/{fam['id']}/lessons/{L1}", json=custom_lesson()).status_code == 200
    client.post("/teacher", json={"school_name": "Sunrise Academy"})
    c = a_class(client)
    sid = client.post(f"/classes/{c['id']}/students", json={"students": [{"first_name": "Zawadi"}]}).json()[
        "added"
    ][0]["id"]
    a = client.post(
        f"/classes/{c['id']}/assignments",
        json={"kind": "custom", "lesson_id": L1, "target": {"type": "class"}},
    ).json()
    assert a["title"] == "Our Pets" and a["lesson"]["id"] == L1 and len(a["lesson"]["cards"]) == 3
    # Editing the original later doesn't change the assigned copy.
    client.put(
        f"/families/{fam['id']}/lessons/{L1}",
        json=custom_lesson(title="Changed", updated_at="2030-02-01T10:00:00Z"),
    )
    assert client.get(f"/classes/{c['id']}/assignments").json()["assignments"][0]["title"] == "Our Pets"
    # The class's tablets (the teacher's sign-in) open its photo.
    assert client.get(f"/assignments/{a['id']}/media/{M1}", follow_redirects=False).status_code == 307
    # Another family at home, before and after linking their child to the class.
    other = TestClient(client.app)
    sign_in(other, outbox, "wanjiru@home.example")
    gfam = other.post("/families", json={"name": "Wanjiru family", "country": "ke"}).json()
    other.post(
        f"/families/{gfam['id']}/consents",
        json={"policy_version": POLICY, "scopes": {"progress": True}, "agreed": True},
    )
    kid = "01JB0000000000000000000002"
    other.put(f"/families/{gfam['id']}/learners/{kid}", json=learner_body())
    assert other.get(f"/assignments/{a['id']}/media/{M1}", follow_redirects=False).status_code == 404
    other.post(
        f"/families/{gfam['id']}/links", json={"code": c["join_code"], "student_id": sid, "learner_id": kid}
    )
    assert other.get(f"/assignments/{a['id']}/media/{M1}", follow_redirects=False).status_code == 307
    # Only media in the lesson.
    assert (
        other.get(
            f"/assignments/{a['id']}/media/01JB0000000000000000000M99", follow_redirects=False
        ).status_code
        == 404
    )
    # Someone else's lesson can't be assigned.
    stranger = TestClient(client.app)
    teacher(stranger, outbox, "james@hill.sc.ke", "Hill School")
    sc = a_class(stranger)
    assert (
        stranger.post(
            f"/classes/{sc['id']}/assignments",
            json={"kind": "custom", "lesson_id": L1, "target": {"type": "class"}},
        ).status_code
        == 404
    )


def test_class_island_at_home_and_progress_count_only_assigned_work(client, outbox):
    c, ids = class_with_children(client, outbox, names=("Zawadi", "Amani"))
    z = ids["Zawadi"]
    unit = {"kind": "unit", "unit_id": "water-animals", "title": "Water animals"}
    a = client.post(
        f"/classes/{c['id']}/assignments",
        json=unit | {"target": {"type": "students", "student_ids": [z]}, "due_on": "2030-01-04"},
    ).json()
    # Class play: water animals (assigned) and farm animals (not).
    r = client.post(
        f"/classes/{c['id']}/events",
        json={
            "events": [
                ev(1, z),
                ev(2, z, "item_answered", itemId="hippo", firstTry=False),
                ev(3, z, unit="farm-animals"),
                ev(4, ids["Amani"]),
            ]
        },
    )
    assert len(r.json()["accepted"]) == 4
    # Grace links Zawadi; her home play has the assigned unit and a Family Island lesson.
    grace = TestClient(client.app)
    fam = family_with_consent(grace, outbox)
    grace.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    grace.post(
        f"/families/{fam['id']}/links", json={"code": c["join_code"], "student_id": z, "learner_id": LEARNER}
    )
    grace.post(
        "/sync/events",
        json={
            "family_id": fam["id"],
            "events": [
                ev(5, LEARNER, lessonId="water-animals:2"),
                ev(6, LEARNER, unit="custom-01JB0000000000000000000P09", subjectId="family"),
            ],
        },
    )
    # MAP-06b: at home, the work and what she did towards it in class (named as her learner).
    home = grace.get(f"/families/{fam['id']}/assignments").json()
    assert [x["id"] for x in home["assignments"]] == [a["id"]]
    assert home["assignments"][0] | {"created_at": None} == {
        **{k: a[k] for k in ("id", "kind", "unit_id", "lesson", "title", "target", "due_on")},
        "created_at": None,
        "learner_id": LEARNER,
        "class_name": "Class 1B",
        "teacher": "Your child's teacher",  # Priya hasn't added her name
    }
    assert sorted(e["id"][-2:] for e in home["events"]) == ["01", "02"]
    assert {e["learnerId"] for e in home["events"]} == {LEARNER}
    # ASN-02: the teacher's data has class and home play for assigned work only.
    p = client.get(f"/classes/{c['id']}/assignments/progress").json()
    assert sorted(e["id"][-2:] for e in p["events"]) == ["01", "02", "05"]
    assert {e["learnerId"] for e in p["events"]} == {z}
    assert p["events"][0]["data"].keys() <= {
        "lessonId",
        "unitId",
        "subjectId",
        "kind",
        "stars",
        "itemId",
        "firstTry",
    }
    # Removed work disappears everywhere.
    client.delete(f"/classes/{c['id']}/assignments/{a['id']}")
    assert grace.get(f"/families/{fam['id']}/assignments").json() == {"assignments": [], "events": []}
    # Another family can't read Grace's list.
    other = TestClient(client.app)
    teacher(other, outbox, "james@hill.sc.ke", "Hill School")
    assert other.get(f"/families/{fam['id']}/assignments").status_code == 404
    assert other.get(f"/classes/{c['id']}/assignments/progress").status_code == 404


def test_classroom_devices_and_ask_my_teacher(client, outbox):
    c, ids = class_with_children(client, outbox)
    r = client.post(f"/classes/{c['id']}/devices", json={"id": DEVICE, "label": "Tablet 1"})
    assert r.status_code == 201 and r.json()["label"] == "Tablet 1"
    assert client.get(f"/classes/{c['id']}").json()["devices"][0]["id"] == DEVICE
    assert client.get(f"/classes/{c['id']}/devices/{DEVICE}").json() == {"active": True}
    # Set to another of her classes: it moves.
    c2 = a_class(client, "Class 2A")
    client.post(f"/classes/{c2['id']}/devices", json={"id": DEVICE, "label": "Tablet 1"})
    assert client.get(f"/classes/{c['id']}").json()["devices"] == []
    assert client.get(f"/classes/{c['id']}/devices/{DEVICE}").json() == {"active": False}
    # Removing it: the tablet sees it at its next check and leaves classroom mode.
    assert client.delete(f"/classes/{c2['id']}/devices/{DEVICE}").status_code == 204
    assert client.get(f"/classes/{c2['id']}/devices/{DEVICE}").json() == {"active": False}
    # Another teacher can't take it over.
    client.post(f"/classes/{c['id']}/devices", json={"id": DEVICE, "label": "Tablet 1"})
    other = TestClient(client.app)
    teacher(other, outbox, "james@hill.sc.ke", "Hill School")
    oc = a_class(other)
    assert other.post(f"/classes/{oc['id']}/devices", json={"id": DEVICE, "label": "Mine"}).status_code == 409
    # CRM-02: Zawadi forgot her pictures; the teacher sees it and clears it.
    z = ids["Zawadi"]
    assert client.post(f"/classes/{c['id']}/students/{z}/help").status_code == 204
    roster = client.get(f"/classes/{c['id']}").json()["roster"]
    assert [s["first_name"] for s in roster if s["help"]] == ["Zawadi"]
    client.patch(f"/classes/{c['id']}/students/{z}", json={"help": False})
    assert not any(s["help"] for s in client.get(f"/classes/{c['id']}").json()["roster"])
