"""Sprint 9: teacher sign-up and schools (ONB-13), classes and rosters (CLS-01, CLS-02), class
play and school consent (CLS-06), parents linking a child (CLS-04), what the teacher sees
(CLS-05, PAR-08), the first-week checklist (HLP-03) and Juma becoming Jumbo."""

import re

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import LATER, LEARNER, NOW, family_with_consent, learner_body, sign_in

E = "01JB0000000000000000000E"


def teacher(client, outbox, email="priya@stmarys.sch.ke", school="St Mary's Primary"):
    sign_in(client, outbox, email)
    r = client.post("/teacher", json={"school_name": school})
    assert r.status_code == 201, r.text
    return r.json()


def a_class(client, name="Class 1B"):
    r = client.post("/classes", json={"name": name, "year_group": "Grade 1", "band": "sprout"})
    assert r.status_code == 201, r.text
    return r.json()


def lesson(eid, student, subject="numbers", stars=3):
    return {
        "id": f"{E}{eid:02d}",
        "type": "lesson_completed",
        "learnerId": student,
        "at": "2030-01-01T10:00:00Z",
        "data": {"subjectId": subject, "stars": stars, "durationSec": 300},
    }


def test_a_teacher_signs_up_and_creates_a_class_with_a_join_code(client, outbox):
    t = teacher(client, outbox)
    assert t["school"]["name"] == "St Mary's Primary" and t["school"]["domain"] == "stmarys.sch.ke"
    assert t["classes"] == []
    c = a_class(client)
    assert re.fullmatch(r"[A-HJ-NP-Z2-9]{6}", c["join_code"]) and c["roster"] == []
    me = client.get("/me").json()
    assert me["teacher"]["classes"][0]["name"] == "Class 1B" and me["families"] == []
    # A new code replaces the old one.
    assert client.post(f"/classes/{c['id']}/code").json()["join_code"] != c["join_code"]


def test_a_second_teacher_from_the_same_school_domain_is_offered_to_join(client, outbox):
    first = teacher(client, outbox)
    other = TestClient(client.app)
    sign_in(other, outbox, "james@stmarys.sch.ke")
    r = other.post("/teacher", json={"school_name": "St Marys"}).json()
    assert r["offer"]["id"] == first["school"]["id"] and r["school"] is None
    joined = other.post(
        "/teacher", json={"school_name": "St Marys", "join_school": first["school"]["id"]}
    ).json()
    assert joined["school"]["id"] == first["school"]["id"]
    # Or a school of their own (another school at the same domain gets no domain).
    third = TestClient(client.app)
    sign_in(third, outbox, "amy@stmarys.sch.ke")
    own = third.post("/teacher", json={"school_name": "St Mary's Junior", "separate": True}).json()
    assert own["school"]["name"] == "St Mary's Junior" and own["school"]["domain"] is None
    # A Gmail teacher gets their own school, with no domain.
    gm = TestClient(client.app)
    sign_in(gm, outbox, "ms.wanjiku@gmail.com")
    r = gm.post("/teacher", json={"school_name": "Sunrise Academy"}).json()
    assert r["school"]["domain"] is None and "offer" not in r
    assert (
        gm.post("/teacher", json={"school_name": "xy", "join_school": first["school"]["id"]}).status_code
        == 403
    )


def test_one_sign_in_can_be_a_parent_and_a_teacher(client, outbox):
    fam = family_with_consent(client, outbox)
    client.post("/teacher", json={"school_name": "Sunrise Academy"})
    me = client.get("/me").json()
    assert me["families"][0]["id"] == fam["id"] and me["teacher"]["school"]["name"] == "Sunrise Academy"


def test_a_pasted_roster_gets_avatars_and_picture_passwords_and_names_must_differ(client, outbox):
    teacher(client, outbox)
    c = a_class(client)
    names = [{"first_name": f"Child{i}"} for i in range(26)]
    r = client.post(f"/classes/{c['id']}/students", json={"students": names})
    assert r.status_code == 201 and len(r.json()["added"]) == 26
    s = r.json()["added"][0]
    assert len(s["pictures"]) == 3 and s["avatar_color"] and s["linked"] is False
    r = client.post(f"/classes/{c['id']}/students", json={"students": [{"first_name": "Child3"}]})
    assert r.status_code == 422 and r.json()["detail"]["names"] == ["child3"]
    r = client.post(
        f"/classes/{c['id']}/students", json={"students": [{"first_name": "Child3", "initial": "m"}]}
    )
    assert r.json()["added"][0]["initial"] == "M"
    assert (
        client.post(
            f"/classes/{c['id']}/students", json={"students": [{"first_name": "Amani Otieno"}]}
        ).status_code
        == 422
    )


def test_class_play_for_children_without_parents_waits_for_the_school_terms(client, outbox):
    t = teacher(client, outbox)
    c = a_class(client)
    sid = client.post(f"/classes/{c['id']}/students", json={"students": [{"first_name": "Baraka"}]}).json()[
        "added"
    ][0]["id"]
    r = client.post(f"/classes/{c['id']}/events", json={"events": [lesson(1, sid)]}).json()
    assert r["accepted"] == [] and r["rejected"][0]["reason"] == "school_consent"
    r = client.post(
        f"/schools/{t['school']['id']}/consent",
        json={"name": "Grace Achieng", "role": "Head teacher", "agreed": True},
    )
    assert r.json()["consent"]["role"] == "Head teacher"
    assert client.post(f"/classes/{c['id']}/events", json={"events": [lesson(1, sid)]}).json()[
        "accepted"
    ] == [f"{E}01"]
    pulled = client.get(f"/classes/{c['id']}/events?after=0").json()
    assert pulled["events"][0]["learnerId"] == sid and pulled["cursor"] > 0
    p = client.get(f"/classes/{c['id']}/students/{sid}/progress").json()
    assert p["class"]["lessons"] == 1 and p["home"] is None
    assert client.get("/teacher").json()["tips"]["viewed"] is True


def test_a_parent_links_a_child_and_controls_what_the_teacher_sees(client, outbox, engine):
    # Teacher and class, on one device.
    teacher(client, outbox)
    c = a_class(client)
    sid = client.post(
        f"/classes/{c['id']}/students", json={"students": [{"first_name": "Zawadi", "initial": "M"}]}
    ).json()["added"][0]["id"]
    client.post(
        f"/classes/{c['id']}/events", json={"events": [lesson(2, sid, "letters", 2)]}
    )  # rejected: no terms yet
    # Grace at home: Zawadi has played numbers and a Family Island lesson.
    grace = TestClient(client.app)
    fam = family_with_consent(grace, outbox)
    grace.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    grace.post(
        "/sync/events",
        json={
            "family_id": fam["id"],
            "events": [lesson(3, LEARNER, "numbers"), lesson(4, LEARNER, "family")],
        },
    )
    assert grace.get("/join/zzzzzz").status_code == 404
    pre = grace.get(f"/join/{c['join_code'].lower()}").json()
    assert pre["class"]["name"] == "Class 1B" and pre["students"] == [{"id": sid, "name": "Zawadi M."}]
    body = {"code": c["join_code"], "student_id": sid, "learner_id": LEARNER}
    r = grace.post(f"/families/{fam['id']}/links", json=body)
    assert r.status_code == 201 and r.json()["scope"] == "class" and r.json()["roster_name"] == "Zawadi M."
    assert client.get(f"/classes/{c['id']}").json()["roster"][0]["linked"] is True  # the linked icon
    # Linked: class play is covered by the parent's consent.
    assert client.post(f"/classes/{c['id']}/events", json={"events": [lesson(5, sid, "letters", 2)]}).json()[
        "accepted"
    ]
    p = client.get(f"/classes/{c['id']}/students/{sid}/progress").json()
    assert p["class"]["lessons"] == 1
    assert p["home"] == {"lessons": 1, "stars": 3, "badges": 0}  # totals only; Family Island not counted
    grace.patch(f"/families/{fam['id']}/links/{sid}", json={"scope": "all"})
    p = client.get(f"/classes/{c['id']}/students/{sid}/progress").json()
    assert p["home"]["subjects"] == {"numbers": {"lessons": 1, "stars": 3}}
    # Separate histories: nothing from class play lands in the family's events.
    assert len(grace.get(f"/sync/events?family_id={fam['id']}").json()["events"]) == 2
    # PAR-08: the family sees who and what, and can unlink.
    links = grace.get(f"/families/{fam['id']}/links").json()["links"]
    assert links[0] | {"linked_at": None} == {
        "student_id": sid,
        "learner_id": LEARNER,
        "roster_name": "Zawadi M.",
        "class": "Class 1B",
        "year_group": "Grade 1",
        "teacher": "Your child's teacher",  # Priya hasn't added her name yet
        "school": "St Mary's Primary",
        "scope": "all",
        "linked_at": None,
    }
    assert grace.post(f"/families/{fam['id']}/links", json=body).status_code == 201  # same link again is fine
    assert grace.delete(f"/families/{fam['id']}/links/{sid}").status_code == 204
    assert client.get(f"/classes/{c['id']}/students/{sid}/progress").json()["home"] is None
    assert grace.get(f"/families/{fam['id']}/links").json()["links"] == []


def test_a_wrong_class_or_someone_elses_child_cannot_be_linked(client, outbox):
    teacher(client, outbox)
    c = a_class(client)
    c2 = a_class(client, "Class 2A")
    s1 = client.post(f"/classes/{c['id']}/students", json={"students": [{"first_name": "Amani"}]}).json()[
        "added"
    ][0]["id"]
    grace = TestClient(client.app)
    fam = family_with_consent(grace, outbox)
    grace.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    bad = {"code": c2["join_code"], "student_id": s1, "learner_id": LEARNER}
    assert grace.post(f"/families/{fam['id']}/links", json=bad).status_code == 404
    other = TestClient(client.app)
    ok = {"code": c["join_code"], "student_id": s1, "learner_id": LEARNER}
    assert grace.post(f"/families/{fam['id']}/links", json=ok).status_code == 201
    # Someone else can't pull this class's play, and a teacher can't see another's class.
    assert other.get(f"/classes/{c['id']}").status_code == 401
    sign_in(other, outbox, "james@other.sch.ke")
    other.post("/teacher", json={"school_name": "Other School"})
    assert other.get(f"/classes/{c['id']}").status_code == 404
    assert other.get(f"/classes/{c['id']}/events").status_code == 404


def test_deleting_a_family_unlinks_its_children_but_keeps_the_teachers_class(client, outbox, engine):
    from app.privacy import purge_family
    from app.storage import get_storage

    teacher(client, outbox)
    c = a_class(client)
    sid = client.post(f"/classes/{c['id']}/students", json={"students": [{"first_name": "Zawadi"}]}).json()[
        "added"
    ][0]["id"]
    grace = TestClient(client.app)
    fam = family_with_consent(grace, outbox)
    grace.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    grace.post(
        f"/families/{fam['id']}/links",
        json={"code": c["join_code"], "student_id": sid, "learner_id": LEARNER},
    )
    with Session(engine) as db:
        purge_family(db, get_storage(), fam["id"])
        db.commit()
    roster = client.get(f"/classes/{c['id']}").json()["roster"]
    assert roster[0]["id"] == sid and roster[0]["linked"] is False


def test_juma_is_now_jumbo(client, outbox, engine):
    fam = family_with_consent(client, outbox)
    r = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body(buddy="juma"))
    assert r.json()["buddy"] == "jumbo"  # an app from before the rename
    r = client.put(
        f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body(buddy="jumbo", updated_at=LATER)
    )
    assert r.json()["buddy"] == "jumbo"


def test_the_migration_renames_juma_in_saved_profiles(tmp_path):
    from sqlalchemy import create_engine, text

    from alembic import command
    from tests.test_migrations import alembic_config

    url = f"sqlite:///{tmp_path / 'j.db'}"
    cfg = alembic_config(url)
    command.upgrade(cfg, "0008")
    eng = create_engine(url)
    with eng.begin() as db:
        db.execute(
            text(
                "INSERT INTO families (id, name, country, plan, settings, updated_at, created_at)"
                " VALUES ('F', 'f', 'KE', 'free', '{}', :t, :t)"
            ),
            {"t": NOW},
        )
        db.execute(
            text(
                "INSERT INTO learners (id, family_id, name, birth_year, birth_month, avatar_color, buddy,"
                " outfit, interests, placement, difficulty, levels, created_at, updated_at)"
                " VALUES ('L', 'F', 'Z', 2020, 1, 'leaf', 'juma', '{}', '[]', '{}', 'auto', '{}', :t, :t)"
            ),
            {"t": NOW},
        )
    command.upgrade(cfg, "head")
    with eng.connect() as db:
        assert db.execute(text("SELECT buddy FROM learners")).scalar() == "jumbo"


def test_a_teachers_magic_link_says_so_whichever_browser_opens_it(client, outbox):
    """ONB-13: the link carries role=teacher, so a mail app's browser still opens teacher set-up."""
    assert (
        client.post("/auth/magic-link", json={"email": "priya@stmarys.sch.ke", "role": "teacher"}).status_code
        == 202
    )
    assert re.search(r"/auth/verify\?token=[^&\s]+&role=teacher", outbox[-1][1])
    client.post("/auth/magic-link", json={"email": "grace@example.com"})
    assert "role=" not in outbox[-1][1]
    assert (
        client.post("/auth/magic-link", json={"email": "x@example.com", "role": "admin"}).status_code == 422
    )
