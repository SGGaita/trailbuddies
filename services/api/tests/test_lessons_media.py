"""Sprint 5: custom lessons (BLD-01..09) and grown-ups' photos and voice clips (BLD-15, SAF-02)."""

import io
import struct
import time
import wave
from urllib.parse import urlsplit

import pytest
from PIL import Image

from app.models import MediaAsset
from app.settings import Settings
from app.storage import LocalStorage, get_storage
from tests.conftest import LATER, LEARNER, NOW, POLICY, family_with_consent, learner_body, sign_in

M1 = "01JB0000000000000000000M01"
M2 = "01JB0000000000000000000M02"
L1 = "01JB0000000000000000000P01"


@pytest.fixture()
def storage(client, tmp_path):
    s = LocalStorage(Settings(media_dir=str(tmp_path / "media"), media_url_base=""))
    client.app.dependency_overrides[get_storage] = lambda: s
    return s


def setup(client, outbox, photos=True, voice=True):
    fam = family_with_consent(client, outbox)
    fid = fam["id"]
    client.put(f"/families/{fid}/learners/{LEARNER}", json=learner_body())
    if photos or voice:
        r = client.post(
            f"/families/{fid}/consents",
            json={
                "policy_version": POLICY,
                "scopes": {"progress": True, "photos": photos, "voice": voice},
                "agreed": True,
            },
        )
        assert r.status_code == 201
    return fid


def jpeg(gps=False, size=(64, 64)) -> bytes:
    img = Image.new("RGB", size, (200, 120, 40))
    buf = io.BytesIO()
    if gps:
        exif = Image.Exif()
        exif[0x010F] = "PhoneMaker"
        exif.get_ifd(0x8825).update({1: "S", 2: (1.0, 17.0, 0.0), 3: "E", 4: (36.0, 49.0, 0.0)})
        img.save(buf, "JPEG", exif=exif)
    else:
        img.save(buf, "JPEG")
    return buf.getvalue()


def wav() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"".join(struct.pack("<h", 3000 if i % 40 < 20 else -3000) for i in range(16000)))
    return buf.getvalue()


def upload(client, fid, media_id, data, kind="photo", ctype="image/jpeg"):
    r = client.post(
        f"/families/{fid}/media",
        json={"id": media_id, "kind": kind, "content_type": ctype, "bytes": len(data)},
    )
    assert r.status_code == 201, r.text
    up = r.json()["upload"]
    u = urlsplit(up["url"])
    assert client.put(f"{u.path}?{u.query}", content=data, headers=up["headers"]).status_code == 204
    return client.post(f"/families/{fid}/media/{media_id}/complete")


def test_photos_need_the_familys_photo_consent(client, outbox, storage):
    fid = setup(client, outbox, photos=False, voice=False)
    r = client.post(
        f"/families/{fid}/media", json={"id": M1, "kind": "photo", "content_type": "image/jpeg", "bytes": 10}
    )
    assert r.status_code == 403 and r.json()["detail"]["code"] == "consent_needed"
    assert r.json()["detail"]["scope"] == "photos"


def test_a_photo_uploads_is_checked_and_opens_through_a_short_lived_link(client, outbox, storage):
    fid = setup(client, outbox)
    data = jpeg()
    r = upload(client, fid, M1, data)
    assert r.status_code == 200, r.text
    assert r.json() == {
        "id": M1,
        "kind": "photo",
        "content_type": "image/jpeg",
        "bytes": len(data),
        "status": "ready",
    }
    link = client.get(f"/families/{fid}/media/{M1}", follow_redirects=False)
    assert link.status_code == 307 and link.headers["cache-control"] == "no-store"
    u = urlsplit(link.headers["location"])
    assert client.get(f"{u.path}?{u.query}").content == data
    # Completing again is harmless.
    assert client.post(f"/families/{fid}/media/{M1}/complete").json()["status"] == "ready"


def test_a_photo_with_gps_data_is_refused_and_deleted(client, outbox, storage, engine):
    fid = setup(client, outbox)
    r = upload(client, fid, M1, jpeg(gps=True))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "gps_metadata"
    assert not storage.path(M1).exists()
    from sqlalchemy.orm import Session

    with Session(engine) as s:
        m = s.get(MediaAsset, M1)
        assert (m.status, m.reject_code) == ("rejected", "gps_metadata")
    assert client.get(f"/families/{fid}/media/{M1}", follow_redirects=False).status_code == 404


def test_wrong_types_sizes_and_fake_files_are_refused(client, outbox, storage):
    fid = setup(client, outbox)
    body = {"id": M1, "kind": "photo", "content_type": "image/gif", "bytes": 100}
    assert client.post(f"/families/{fid}/media", json=body).json()["detail"]["code"] == "bad_type"
    body = {"id": M1, "kind": "photo", "content_type": "image/jpeg", "bytes": 3_000_000}
    assert client.post(f"/families/{fid}/media", json=body).status_code == 413
    r = upload(client, fid, M1, b"not really a picture at all")
    assert r.status_code == 422 and r.json()["detail"]["code"] == "bad_file"
    r = upload(client, fid, M2, b"\x00" * 64, kind="voice", ctype="audio/wav")
    assert r.status_code == 422 and r.json()["detail"]["code"] == "bad_file"


def test_a_voice_clip_uploads(client, outbox, storage):
    fid = setup(client, outbox)
    r = upload(client, fid, M2, wav(), kind="voice", ctype="audio/wav")
    assert r.status_code == 200 and r.json()["content_type"] == "audio/wav"


def test_signed_links_cant_be_forged_or_reused_late(client, outbox, storage):
    fid = setup(client, outbox)
    upload(client, fid, M1, jpeg())
    assert client.get(f"/media/blob/{M1}?exp={int(time.time()) + 60}&sig=abc").status_code == 404
    exp = int(time.time()) - 1
    assert client.get(f"/media/blob/{M1}?exp={exp}&sig={storage.sign(M1, 'GET', exp)}").status_code == 404
    # A download signature can't be used to upload.
    exp = int(time.time()) + 60
    put = client.put(f"/media/blob/{M1}?exp={exp}&sig={storage.sign(M1, 'GET', exp)}", content=b"x")
    assert put.status_code == 403


def test_another_family_cant_see_the_media(client, outbox, storage):
    fid = setup(client, outbox)
    upload(client, fid, M1, jpeg())
    client.post("/auth/logout")
    sign_in(client, outbox, "other@example.com")
    assert client.get(f"/families/{fid}/media/{M1}", follow_redirects=False).status_code == 404


def lesson(**over):
    body = {
        "title": "  Our   Pets ",
        "template": "learn",
        "cards": [
            {"id": "k1", "label": "Simba the dog", "emoji": "🐕", "group": "Pets", "fact": " Loves  balls. "},
            {"id": "k2", "label": "Daisy the cow", "photo": M1, "voice": M2, "group": "Farm"},
            {"id": "k3", "label": "Kuku the hen", "emoji": "🐔"},
        ],
        "assigned": [LEARNER],
        "updated_at": NOW,
    }
    body.update(over)
    return body


def test_lessons_save_list_and_newest_edit_wins_keeping_card_ids(client, outbox, storage):
    fid = setup(client, outbox)
    r = client.put(f"/families/{fid}/lessons/{L1}", json=lesson(question="ignored for learn"))
    assert r.status_code == 200, r.text
    saved = r.json()
    assert saved["title"] == "Our Pets" and saved["question"] is None and saved["version"] == 1
    assert [c["id"] for c in saved["cards"]] == ["k1", "k2", "k3"]
    assert saved["cards"][0]["fact"] == "Loves balls." and "fact" not in saved["cards"][2]
    # An older edit arriving late is kept aside, not applied.
    late = client.put(
        f"/families/{fid}/lessons/{L1}", json=lesson(title="Old", updated_at="2029-12-31T10:00:00Z")
    )
    assert late.json()["title"] == "Our Pets"
    # Adding two cards later keeps the first three ids.
    more = lesson(
        cards=lesson()["cards"] + [{"id": "k4", "label": "Polly"}, {"id": "k5", "label": "Bobo"}],
        version=2,
        updated_at=LATER,
    )
    after = client.put(f"/families/{fid}/lessons/{L1}", json=more).json()
    assert [c["id"] for c in after["cards"]] == ["k1", "k2", "k3", "k4", "k5"] and after["version"] == 2
    assert [x["id"] for x in client.get(f"/families/{fid}/lessons").json()["lessons"]] == [L1]
    assert client.delete(f"/families/{fid}/lessons/{L1}").status_code == 204
    assert client.get(f"/families/{fid}/lessons").json()["lessons"] == []


def test_lesson_rules(client, outbox, storage):
    fid = setup(client, outbox)
    other = "01JB0000000000000000000099"
    assert client.put(f"/families/{fid}/lessons/{L1}", json=lesson(assigned=[other])).status_code == 422
    dup = lesson(cards=[{"id": "k1", "label": "a"}, {"id": "k1", "label": "b"}])
    assert client.put(f"/families/{fid}/lessons/{L1}", json=dup).status_code == 422
    assert client.put(f"/families/{fid}/lessons/not-a-ulid", json=lesson()).status_code == 422
    long_fact = lesson(cards=[{"id": "k1", "label": "a", "fact": "x" * 121}])
    assert client.put(f"/families/{fid}/lessons/{L1}", json=long_fact).status_code == 422
    too_many = lesson(cards=[{"id": f"c{i}", "label": f"Card {i}"} for i in range(13)])
    assert client.put(f"/families/{fid}/lessons/{L1}", json=too_many).status_code == 422
    puzzle = client.put(
        f"/families/{fid}/lessons/{L1}",
        json=lesson(template="puzzle", question="Who is this?", puzzle_card="k2"),
    ).json()
    assert (puzzle["question"], puzzle["puzzle_card"]) == ("Who is this?", "k2")


def test_progress_on_a_custom_lesson_syncs_like_any_lesson(client, outbox, storage):
    fid = setup(client, outbox)
    client.put(f"/families/{fid}/lessons/{L1}", json=lesson())
    e = {
        "id": "01JB000000000000000000EV01",
        "type": "lesson_completed",
        "learnerId": LEARNER,
        "at": "2030-01-01T10:00:00.000Z",
        "data": {
            "lessonId": f"custom-{L1}",
            "unitId": f"custom-{L1}",
            "subjectId": "family",
            "kind": "custom",
            "stars": 3,
        },
    }
    assert client.post("/sync/events", json={"family_id": fid, "events": [e]}).json()["accepted"] == [e["id"]]


def test_s3_links_use_the_public_endpoint_and_expire():
    from app.storage import S3Storage

    s = S3Storage(
        Settings(
            env="production",  # no bucket check: this test makes no network calls
            media_backend="s3",
            s3_endpoint="http://minio:9000",
            s3_public_endpoint="http://localhost:9000",
            s3_access_key="k",
            s3_secret_key="s",
            s3_region="us-east-1",
        )
    )
    put = s.upload_url(M1, "image/jpeg")
    assert put.startswith(f"http://localhost:9000/trailbuddies-media/media/{M1}?")
    assert "X-Amz-Signature=" in put and "X-Amz-Expires=900" in put
    assert "X-Amz-Signature=" in s.download_url(M1)
