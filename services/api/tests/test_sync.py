from tests.conftest import LEARNER, family_with_consent, learner_body, sign_in


def ev(n, type_="item_answered", learner=LEARNER, **data):
    return {
        "id": f"01JB00000000000000000000{n:02d}",
        "type": type_,
        "learnerId": learner,
        "at": "2026-10-22T10:00:00.000Z",
        "data": data or {"itemId": "one", "firstTry": True},
    }


def setup(client, outbox):
    fam = family_with_consent(client, outbox)
    client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    return fam["id"]


def test_push_is_idempotent_and_pull_pages_with_a_cursor(client, outbox):
    fid = setup(client, outbox)
    r = client.post("/sync/events", json={"family_id": fid, "events": [ev(1), ev(2), ev(3)]})
    assert r.json()["accepted"] == [ev(1)["id"], ev(2)["id"], ev(3)["id"]]
    # the same batch again (a retry after a lost response) is accepted but stored once
    client.post("/sync/events", json={"family_id": fid, "events": [ev(2), ev(3), ev(4)]})
    page = client.get(f"/sync/events?family_id={fid}&limit=3").json()
    assert [e["id"] for e in page["events"]] == [ev(i)["id"] for i in (1, 2, 3)] and page["more"] is True
    rest = client.get(f"/sync/events?family_id={fid}&after={page['cursor']}").json()
    assert [e["id"] for e in rest["events"]] == [ev(4)["id"]] and rest["more"] is False
    done = client.get(f"/sync/events?family_id={fid}&after={rest['cursor']}").json()
    assert done == {"events": [], "cursor": rest["cursor"], "more": False}
    assert page["events"][0]["at"] == "2026-10-22T10:00:00Z"


def test_rejects_unknown_learners_bad_types_and_big_data(client, outbox):
    fid = setup(client, outbox)
    r = client.post(
        "/sync/events",
        json={
            "family_id": fid,
            "events": [ev(1, learner="01JB0000000000000000000099"), ev(2, blob="x" * 3000)],
        },
    )
    assert [x["reason"] for x in r.json()["rejected"]] == ["unknown learner", "data too large"]
    assert (
        client.post("/sync/events", json={"family_id": fid, "events": [ev(3, type_="hacked")]}).status_code
        == 422
    )


def test_sync_is_per_family(client, outbox):
    fid = setup(client, outbox)
    client.post("/auth/logout")
    sign_in(client, outbox, "other@example.com")
    assert client.post("/sync/events", json={"family_id": fid, "events": [ev(1)]}).status_code == 404
    assert client.get(f"/sync/events?family_id={fid}").status_code == 404


def test_deleting_a_learner_deletes_their_events(client, outbox):
    fid = setup(client, outbox)
    client.post("/sync/events", json={"family_id": fid, "events": [ev(1)]})
    client.delete(f"/families/{fid}/learners/{LEARNER}")
    assert client.get(f"/sync/events?family_id={fid}").json()["events"] == []


def test_game_events_sync(client, outbox):
    fid = setup(client, outbox)
    r = client.post(
        "/sync/events",
        json={"family_id": fid, "events": [ev(1, type_="game_finished", game="memory", unitId="u")]},
    )
    assert r.json()["accepted"] == [ev(1)["id"]]
