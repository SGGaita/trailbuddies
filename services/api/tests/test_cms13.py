"""Sprint 13: trails and islands, review, roll back and badges (CMS-05…08)."""

import json
from urllib.parse import urlsplit

from tests.test_cms import (
    ADMIN,
    CLEAN,
    EDITOR,
    REVIEWER,
    SRC,
    as_,
    bundle,
    first_admin,  # noqa: F401  (fixture)
    staff_team,
    through_review,
)
from tests.test_lessons_media import (
    M1,
    M2,
    jpeg,
    storage,  # noqa: F401  (fixture)
)

BADGES = json.loads((SRC / "badges" / "built-in.json").read_text())


def setup(client, outbox):
    staff_team(client, outbox)
    as_(client, outbox, ADMIN)
    r = client.post("/admin/content/import", json={**bundle(), "badges": BADGES})
    assert r.status_code == 201, r.text
    return r.json()


def upload(client, mid, label="Weather Hill"):
    data = jpeg()
    r = client.post(
        "/admin/content/assets",
        json={"id": mid, "content_type": "image/jpeg", "bytes": len(data), "label": label},
    )
    up = urlsplit(r.json()["upload"]["url"])
    client.put(f"{up.path}?{up.query}", content=data, headers={"Content-Type": "image/jpeg"})
    assert client.post(f"/admin/content/assets/{mid}/complete", json={"scan": CLEAN}).status_code == 200


def manifest(storage, channel="production"):  # noqa: F811
    return json.loads(storage.get_key(f"packs/manifest-{channel}.json"))


def publish(client, note="Publish"):
    r = client.post("/admin/content/publish", json={"note": note})
    assert r.status_code == 200, r.text
    return r.json()


def test_a_new_trail_with_its_art_and_units_reaches_the_map_once_approved(client, outbox, storage):  # noqa: F811
    setup(client, outbox)
    as_(client, outbox, EDITOR)
    upload(client, M1)
    trail = {
        "name": "Weather",
        "place": "Weather Hill",
        "art": M1,
        "unit": {"title": "Clouds", "band": "sprout"},
    }
    s = client.post("/admin/content/trails", json=trail).json()
    hill = next(x for x in s["subjects"] if x["id"] == "weather-hill")
    assert hill["art"] == M1 and [u["id"] for u in hill["units"]] == ["clouds"]
    assert s["draft"]["changes"][0]["changes"] == ["new trail “Weather”"] or any(
        "new trail" in c for x in s["draft"]["changes"] for c in x["changes"]
    )
    # A second unit, copied from an existing one; both start as drafts.
    r = client.post(
        "/admin/content/trails/weather-hill/units",
        json={"title": "Rain", "band": "sprout", "copy_from": "where-animals-live"},
    )
    assert r.status_code == 201 and r.json()["unit"] == "rain"
    rain = client.get("/admin/content/units/rain").json()
    assert rain["unit"]["status"] == "draft" and rain["unit"]["lessons"][0]["id"] == "rain-1"
    assert (
        rain["unit"]["items"] == client.get("/admin/content/units/where-animals-live").json()["unit"]["items"]
    )
    # Put it first on the map.
    order = [x["id"] for x in s["subjects"]]
    order.remove("weather-hill")
    r = client.put(
        "/admin/content/order",
        json={"subjects": ["weather-hill", *order], "units": {"weather-hill": ["rain", "clouds"]}},
    )
    assert r.status_code == 200
    assert (
        client.put("/admin/content/order", json={"subjects": order}).status_code == 422
    )  # every trail, once

    # An admin marks the units ready for children.
    as_(client, outbox, ADMIN)
    for uid in ("clouds", "rain"):
        u = client.get(f"/admin/content/units/{uid}").json()["unit"]
        assert (
            client.put(f"/admin/content/units/{uid}", json={"unit": {**u, "status": "ready"}}).status_code
            == 200
        )
    through_review(client, outbox)
    # The art isn't approved yet: the trail can't go out.
    r = client.post("/admin/content/publish", json={"note": "Weather Hill"})
    assert r.status_code == 409 and any("island art" in p for p in r.json()["detail"]["problems"])
    as_(client, outbox, REVIEWER)
    client.post(f"/admin/content/assets/{M1}/decision", json={"approve": True})
    as_(client, outbox, ADMIN)
    publish(client, "Weather Hill")
    man = manifest(storage)
    assert man["map"][0]["id"] == "weather-hill" and man["map"][0]["art"] == M1
    assert [e["id"] for e in man["map"][0]["units"]] == ["rain", "clouds"]
    assert man["packs"][0]["subject"] == "weather-hill"


def test_archiving_a_trail_keeps_it_in_the_packs_marked_archived(client, outbox, storage):  # noqa: F811
    setup(client, outbox)
    as_(client, outbox, EDITOR)
    r = client.patch("/admin/content/trails/animals", json={"archived": True})
    assert r.status_code == 200
    assert any("archived “Animals”" in c for x in r.json()["draft"]["changes"] for c in x["changes"])
    through_review(client, outbox)
    publish(client, "Archive animals")
    man = manifest(storage, "preview")
    # Still shipped (children keep their stars, badges and treasure), but off the map.
    animals = next(m for m in man["map"] if m["id"] == "animals")
    assert animals["archived"] is True
    as_(client, outbox, EDITOR)
    r = client.patch("/admin/content/trails/animals", json={"archived": False})
    assert (
        "archived" not in next(x for x in r.json()["subjects"] if x["id"] == "animals")
        or not next(x for x in r.json()["subjects"] if x["id"] == "animals")["archived"]
    )


def test_badges_are_edited_retired_and_shipped_in_the_packs(client, outbox, storage):  # noqa: F811
    setup(client, outbox)
    as_(client, outbox, EDITOR)
    got = client.get("/admin/content/badges").json()
    assert len(got["badges"]) == len(BADGES)
    new = {
        "id": "wild-explorer",
        "name": "Wild Explorer",
        "how": "Finish Wild animals",
        "category": "learning",
        "tier": "bronze",
        "icon": "🦁",
        "rule": {"type": "complete", "units": ["wild-animals"]},
    }
    assert (
        client.put(
            "/admin/content/badges/wild-explorer",
            json={"badge": {**new, "rule": {"type": "complete", "units": ["nope"]}}},
        ).status_code
        == 422
    )
    assert (
        client.put("/admin/content/badges/wild-explorer", json={"badge": {**new, "id": "x"}}).status_code
        == 422
    )
    r = client.put("/admin/content/badges/wild-explorer", json={"badge": new})
    assert r.status_code == 200, r.text
    first = {**BADGES[0], "retired": True}
    r = client.put(f"/admin/content/badges/{first['id']}", json={"badge": first})
    assert set(r.json()["edited"]) == {"wild-explorer", first["id"]}
    # New art waits for approval like any upload.
    upload(client, M2, "Lion badge")
    r = client.put("/admin/content/badges/wild-explorer", json={"badge": {**new, "art": M2}})
    assert r.json()["approvals"] == {M2: "waiting"}
    changes = client.get("/admin/content").json()["draft"]["changes"]
    lines = next(x for x in changes if x["kind"] == "badges")["changes"]
    assert "new badge “Wild Explorer”" in lines and f"retired “{BADGES[0]['name']}”" in lines

    through_review(client, outbox)
    r = client.post("/admin/content/publish", json={"note": "Badges"})
    assert r.status_code == 409 and any("badge wild-explorer" in p for p in r.json()["detail"]["problems"])
    as_(client, outbox, REVIEWER)
    client.post(f"/admin/content/assets/{M2}/decision", json={"approve": True})
    as_(client, outbox, ADMIN)
    publish(client, "Badges")
    man = manifest(storage)
    shipped = json.loads(storage.get_key(f"packs/{man['badges']['file']}"))
    assert shipped["schema"] == "badges/1" and shipped["badges"][0]["retired"] is True
    assert shipped["badges"][-1] | {"art": M2} == shipped["badges"][-1]


def test_badges_join_an_earlier_import(client, outbox):
    staff_team(client, outbox)
    as_(client, outbox, ADMIN)
    client.post("/admin/content/import", json=bundle())
    assert client.get("/admin/content").json()["has_badges"] is False
    assert client.get("/admin/content/badges").json()["badges"] == []
    r = client.post("/admin/content/import", json={**bundle(), "badges": BADGES})
    assert r.status_code == 201 and r.json()["has_badges"] is True and r.json()["draft"] is None
    assert client.post("/admin/content/import", json={**bundle(), "badges": BADGES}).status_code == 409


def test_roll_back_to_any_earlier_version(client, outbox, storage):  # noqa: F811
    setup(client, outbox)
    titles = []
    for title in ("Wild ones", "Wild friends"):
        as_(client, outbox, EDITOR)
        u = client.get("/admin/content/units/wild-animals").json()["unit"]
        client.put("/admin/content/units/wild-animals", json={"unit": {**u, "title": title}})
        through_review(client, outbox, note=title)
        publish(client, title)
        titles.append(title)
    assert client.get("/admin/content").json()["live"]["version"] == 3

    # Editors and reviewers can't roll back; nobody can while a draft is open.
    as_(client, outbox, REVIEWER)
    assert client.post("/admin/content/rollback", json={"version": 1, "note": "Undo"}).status_code == 403
    as_(client, outbox, EDITOR)
    u = client.get("/admin/content/units/wild-animals").json()["unit"]
    client.put("/admin/content/units/wild-animals", json={"unit": {**u, "summary": "Draft"}})
    as_(client, outbox, ADMIN)
    assert client.post("/admin/content/rollback", json={"version": 1, "note": "Undo"}).status_code == 409
    client.delete("/admin/content/draft")
    assert client.post("/admin/content/rollback", json={"version": 3, "note": "Undo"}).status_code == 404

    r = client.post("/admin/content/rollback", json={"version": 1, "note": "Back to the original"})
    assert r.status_code == 200, r.text
    assert r.json()["live"]["version"] == 4
    assert client.get("/admin/content/units/wild-animals").json()["unit"]["title"] == "Wild animals"
    man = manifest(storage, "preview")
    assert man["release"].endswith(".cms4")
    history = client.get("/admin/content/versions").json()["versions"]
    assert history[0] | {"rolled_back_from": 1, "live": True, "note": "Back to the original"} == history[0]
    assert [v["version"] for v in history] == [4, 3, 2, 1]  # history is never rewritten


def test_the_review_page_shows_each_change_side_by_side(client, outbox):
    setup(client, outbox)
    as_(client, outbox, EDITOR)
    u = client.get("/admin/content/units/wild-animals").json()["unit"]
    client.put("/admin/content/units/wild-animals", json={"unit": {**u, "title": "Wild ones"}})
    client.post("/admin/content/submit", json={"note": "Rename"})
    as_(client, outbox, REVIEWER)
    r = client.get("/admin/content/review").json()
    doc = next(d for d in r["docs"] if d["key"] == "wild-animals")
    assert (
        doc["before"]["title"] == "Wild animals"
        and doc["after"]["title"] == "Wild ones"
        and doc["by"] == EDITOR
    )
    assert r["draft"]["submitted_by"] == EDITOR and r["draft"]["authors"] == [EDITOR]
