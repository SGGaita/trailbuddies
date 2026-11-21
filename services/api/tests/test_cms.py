"""Sprint 12: the staff area and content admin (CMS-01…04)."""

import json
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import cms
from app.models import AdminLog, ContentDoc
from app.settings import get_settings
from tests.conftest import sign_in
from tests.test_lessons_media import (
    M1,
    M2,
    jpeg,
    storage,  # noqa: F401  (fixture)
)

ADMIN = "steve@trailbuddies.africa"
EDITOR = "wanjiru@trailbuddies.africa"
REVIEWER = "otieno@trailbuddies.africa"
MOD = "safety@trailbuddies.africa"
ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "packages" / "content" / "src"
CLEAN = {"flagged": False, "scores": {"porn": 0.01}, "model": "nsfwjs-mobilenet-v2"}


@pytest.fixture(autouse=True)
def first_admin(monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_emails", ADMIN)


def bundle(ids=("where-animals-live", "wild-animals")):
    """What the admin page sends from the web app's bundle: the catalogue plus some units."""
    cat = json.loads((SRC / "catalogue.json").read_text())
    units, assets = [], {}
    for uid in ids:
        f = next(SRC.glob(f"units/*/{uid}.json"))
        units.append(json.loads(f.read_text()))
        a = f.with_name(f"{uid}.assets.json")
        if a.exists():
            assets[uid] = json.loads(a.read_text())
    return {"catalogue": cat, "units": units, "assets": assets}


def as_(client, outbox, email):
    client.cookies.clear()
    sign_in(client, outbox, email)


def imported(client, outbox):
    as_(client, outbox, ADMIN)
    r = client.post("/admin/content/import", json=bundle())
    assert r.status_code == 201, r.text
    return r.json()


def staff_team(client, outbox):
    as_(client, outbox, ADMIN)
    for email, role in ((EDITOR, "editor"), (REVIEWER, "reviewer"), (MOD, "moderator")):
        assert client.post("/admin/staff", json={"email": email, "role": role}).status_code == 201


def test_vendored_schemas_match_the_content_package():
    """`pnpm --filter @trailbuddies/content-schema schemas:api` keeps this copy in step."""
    src = ROOT / "packages" / "content-schema" / "src" / "schemas"
    if not src.exists():
        pytest.skip("not in the monorepo")
    ours = json.loads((Path(cms.__file__).with_name("content_schemas.json")).read_text())
    for name, schema in ours.items():
        assert json.loads((src / name).read_text()) == schema, f"{name} is stale: run schemas:api"


def test_roles_decide_what_each_person_can_open(client, outbox):
    sign_in(client, outbox, "grace@example.com")
    assert client.get("/admin/me").status_code == 403
    staff_team(client, outbox)
    me = client.get("/admin/me").json()
    assert me["role"] == "admin" and "publish" in me["can"]
    listing = client.get("/admin/staff").json()
    assert [s["email"] for s in listing["staff"]][0] == ADMIN and listing["staff"][0]["bootstrap"]
    assert {s["role"] for s in listing["staff"]} == {"admin", "editor", "reviewer", "moderator"}
    assert client.post("/admin/staff", json={"email": EDITOR, "role": "reviewer"}).status_code == 409

    as_(client, outbox, EDITOR)
    assert client.get("/admin/me").json()["can"] == ["edit"]
    assert client.get("/admin/staff").status_code == 403
    assert client.get("/admin/moderation").status_code == 403

    as_(client, outbox, MOD)
    assert client.get("/admin/moderation").status_code == 200  # moderation moved to the role
    assert client.get("/admin/content").status_code == 403

    as_(client, outbox, ADMIN)
    assert client.patch(f"/admin/staff/{MOD}", json={"role": "reviewer"}).json()["role"] == "reviewer"
    assert client.delete(f"/admin/staff/{EDITOR}").status_code == 204
    assert client.patch(f"/admin/staff/{ADMIN}", json={"role": "editor"}).status_code == 404
    log = [x["action"] for x in client.get("/admin/staff").json()["log"]]
    assert log[:2] == ["staff_remove", "staff_role"] and log.count("staff_add") == 3


def test_import_once_from_the_bundle_and_check_everything(client, outbox):
    as_(client, outbox, ADMIN)
    bad = bundle()
    bad["units"][0]["items"][0]["label"] = ""
    r = client.post("/admin/content/import", json=bad)
    assert r.status_code == 422 and any("where-animals-live" in p for p in r.json()["detail"]["problems"])
    s = imported(client, outbox)
    assert s["imported"] and s["live"]["version"] == 1 and s["draft"] is None
    farm = next(u for sub in s["subjects"] for u in sub["units"] if u["id"] == "where-animals-live")
    assert farm["has_content"] and farm["items"] > 3
    assert client.post("/admin/content/import", json=bundle()).status_code == 409


def test_an_editor_saves_a_draft_children_keep_the_published_unit(client, outbox, storage, engine):  # noqa: F811
    staff_team(client, outbox)
    imported(client, outbox)
    as_(client, outbox, EDITOR)
    got = client.get("/admin/content/units/where-animals-live").json()
    unit = got["unit"]
    assert got["changes"] == []
    first = unit["items"][0]
    unit["items"][0] = {**first, "fact": "Cows have four stomachs to help them eat grass."}
    unit["title"] = "Farm friends"

    # A broken unit comes back with problems by field; nothing is saved.
    broken = {**unit, "items": [{**first, "label": ""}] + unit["items"][1:]}
    r = client.put("/admin/content/units/where-animals-live", json={"unit": broken})
    assert r.status_code == 422 and any(
        p.startswith("/items/0/label") for p in r.json()["detail"]["problems"]
    )
    assert (
        client.put("/admin/content/units/where-animals-live", json={"unit": {**unit, "id": "x"}}).status_code
        == 422
    )
    assert (
        client.put(
            "/admin/content/units/where-animals-live", json={"unit": {**unit, "status": "draft"}}
        ).status_code
        == 403
    )

    r = client.put("/admin/content/units/where-animals-live", json={"unit": unit})
    assert r.status_code == 200, r.text
    assert "renamed to “Farm friends”" in r.json()["changes"] and any(
        "edited" in c for c in r.json()["changes"]
    )
    assert r.json()["published"]["title"] != "Farm friends"
    s = client.get("/admin/content").json()
    assert s["draft"]["version"] == 2 and s["draft"]["changes"][0]["unit"] == "where-animals-live"
    entry = next(u for sub in s["subjects"] for u in sub["units"] if u["id"] == "where-animals-live")
    assert entry["title"] == "Farm friends" and entry["edited"]
    # Editors never publish (CMS-04).
    assert client.post("/admin/content/publish", json={"note": "Farm facts"}).status_code == 403

    as_(client, outbox, ADMIN)
    r = client.post("/admin/content/publish", json={"note": "Farm facts"})
    assert r.status_code == 200, r.text
    assert r.json()["live"]["version"] == 2 and r.json()["draft"] is None
    man = json.loads(storage.get_key("packs/manifest-production.json"))
    assert man["release"].endswith(".cms2")
    pack = next(p for p in man["packs"] if "where-animals-live" in p["units"])
    body = json.loads(storage.get_key(f"packs/{pack['file']}"))
    assert next(u for u in body["units"] if u["id"] == "where-animals-live")["title"] == "Farm friends"
    entry = next(e for e in body["subject"]["units"] if e["id"] == "where-animals-live")
    assert entry["title"] == "Farm friends"  # the catalogue entry follows the unit
    with Session(engine) as db:
        row = db.scalar(select(AdminLog).where(AdminLog.action == "content_publish"))
        assert row.detail["self_published"] is False


def test_an_admin_publishing_their_own_change_must_confirm(client, outbox, storage):  # noqa: F811
    imported(client, outbox)
    unit = client.get("/admin/content/units/wild-animals").json()["unit"]
    unit["summary"] = "Big animals that live in the wild."
    assert client.put("/admin/content/units/wild-animals", json={"unit": unit}).status_code == 200
    r = client.post("/admin/content/publish", json={"note": "Summary"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "own"
    r = client.post("/admin/content/publish", json={"note": "Summary", "confirm_own": True})
    assert r.status_code == 200
    log = client.get("/admin/staff").json()["log"]
    assert log[0]["action"] == "content_publish" and log[0]["detail"]["self_published"] is True


def test_discarding_the_draft(client, outbox):
    imported(client, outbox)
    unit = client.get("/admin/content/units/wild-animals").json()["unit"]
    client.put("/admin/content/units/wild-animals", json={"unit": {**unit, "title": "Wild ones"}})
    assert client.delete("/admin/content/draft").status_code == 204
    assert client.get("/admin/content").json()["draft"] is None
    assert client.get("/admin/content/units/wild-animals").json()["unit"]["title"] == unit["title"]


def put_picture(client, mid, data):
    r = client.post(
        "/admin/content/assets",
        json={"id": mid, "content_type": "image/jpeg", "bytes": len(data), "label": "Cow"},
    )
    assert r.status_code == 201, r.text
    up = urlsplit(r.json()["upload"]["url"])
    assert (
        client.put(f"{up.path}?{up.query}", content=data, headers={"Content-Type": "image/jpeg"}).status_code
        == 204
    )
    return client.post(f"/admin/content/assets/{mid}/complete", json={"scan": CLEAN})


def test_uploaded_pictures_need_a_reviewer_before_children_see_them(client, outbox, storage, engine):  # noqa: F811
    staff_team(client, outbox)
    imported(client, outbox)
    as_(client, outbox, EDITOR)
    assert put_picture(client, M2, jpeg(gps=True)).status_code == 422  # location data refused (SAF-02)
    r = put_picture(client, M1, jpeg())
    assert r.status_code == 200 and r.json()["approval"] == "waiting"
    assert client.get(f"/content/assets/{M1}", follow_redirects=False).status_code == 404

    got = client.get("/admin/content/units/where-animals-live").json()
    unit, assets = got["unit"], got["assets"]
    entry = cms_upload_entry(M1)
    assets = {**assets, "assets": assets["assets"] + [entry]}
    unit["items"][0] = {**unit["items"][0], "image": entry["id"]}
    r = client.put("/admin/content/units/where-animals-live", json={"unit": unit, "assets": assets})
    assert r.status_code == 200, r.text
    assert got["uploads"] == {} and r.json()["uploads"] == {M1: "waiting"}

    # Publishing is blocked until the picture is approved.
    as_(client, outbox, ADMIN)
    r = client.post("/admin/content/publish", json={"note": "Cow photo"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "assets"

    as_(client, outbox, EDITOR)
    assert client.post(f"/admin/content/assets/{M1}/decision", json={"approve": True}).status_code == 403
    as_(client, outbox, REVIEWER)
    assert client.get("/admin/content/assets").json()["assets"][0]["id"] == M1
    assert (
        client.post(f"/admin/content/assets/{M1}/decision", json={"approve": True}).json()["approval"]
        == "approved"
    )
    assert client.get(f"/content/assets/{M1}", follow_redirects=False).status_code == 307

    as_(client, outbox, ADMIN)
    assert client.post("/admin/content/publish", json={"note": "Cow photo"}).status_code == 200
    man = json.loads(storage.get_key("packs/manifest-production.json"))
    pack = next(p for p in man["packs"] if "where-animals-live" in p["units"])
    shipped = json.loads(storage.get_key(f"packs/{pack['file']}"))["assets"]["where-animals-live"]["assets"]
    assert next(a for a in shipped if a["id"] == entry["id"])["review_status"] == "approved"
    with Session(engine) as db:  # the stored draft copy was not changed by building the packs
        doc = db.scalar(
            select(ContentDoc).where(
                ContentDoc.kind == "assets",
                ContentDoc.key == "where-animals-live",
                ContentDoc.version_id == 2,
            )
        )
        assert next(a for a in doc.data["assets"] if a["id"] == entry["id"])["review_status"] == "reviewed"


def cms_upload_entry(mid):
    return {
        "id": f"img-up-{mid.lower()}",
        "kind": "image",
        "path": f"uploads/{mid}",
        "source": "uploaded",
        "license": "Trailbuddies staff upload",
        "review_status": "reviewed",
    }


def test_a_flagged_upload_cant_be_used(client, outbox, storage):  # noqa: F811
    imported(client, outbox)
    data = jpeg()
    r = client.post(
        "/admin/content/assets", json={"id": M1, "content_type": "image/jpeg", "bytes": len(data)}
    )
    up = urlsplit(r.json()["upload"]["url"])
    client.put(f"{up.path}?{up.query}", content=data, headers={"Content-Type": "image/jpeg"})
    flagged = {"flagged": True, "reason": "nudity", "scores": {"porn": 0.9}, "model": "nsfwjs-mobilenet-v2"}
    assert (
        client.post(f"/admin/content/assets/{M1}/complete", json={"scan": flagged}).json()["approval"]
        == "flagged"
    )
    got = client.get("/admin/content/units/where-animals-live").json()
    entry = cms_upload_entry(M1)
    unit = {
        **got["unit"],
        "items": [{**got["unit"]["items"][0], "image": entry["id"]}] + got["unit"]["items"][1:],
    }
    r = client.put(
        "/admin/content/units/where-animals-live",
        json={"unit": unit, "assets": {**got["assets"], "assets": got["assets"]["assets"] + [entry]}},
    )
    assert r.status_code == 422 and "can't be used" in " ".join(r.json()["detail"]["problems"])
