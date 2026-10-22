from tests.conftest import LATER, LEARNER, NOW, POLICY, family_with_consent, learner_body, sign_in


def test_family_setup_and_me(client, outbox):
    fam = family_with_consent(client, outbox)
    assert fam["country"] == "KE" and fam["role"] == "owner"
    assert fam["settings"]["goal"] == 2
    me = client.get("/me").json()
    assert me["families"][0]["consent"]["policy_version"] == POLICY


def test_learners_need_consent(client, outbox):
    sign_in(client, outbox)
    fam = client.post("/families", json={"name": "F", "country": "KE"}).json()
    r = client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body())
    assert r.status_code == 403


def test_consent_rules(client, outbox):
    sign_in(client, outbox)
    fam = client.post("/families", json={"name": "F", "country": "KE"}).json()
    url = f"/families/{fam['id']}/consents"
    assert (
        client.post(
            url, json={"policy_version": "old", "scopes": {"progress": True}, "agreed": True}
        ).status_code
        == 409
    )
    assert (
        client.post(
            url, json={"policy_version": POLICY, "scopes": {"progress": False}, "agreed": True}
        ).status_code
        == 422
    )
    assert (
        client.post(
            url, json={"policy_version": POLICY, "scopes": {"progress": True}, "agreed": False}
        ).status_code
        == 422
    )


def test_learner_create_update_last_edit_wins(client, outbox):
    fam = family_with_consent(client, outbox)
    url = f"/families/{fam['id']}/learners/{LEARNER}"
    assert client.put(url, json=learner_body()).json()["name"] == "Zawadi"
    # an older edit from another device loses
    assert (
        client.put(url, json=learner_body(name="Old", updated_at="2030-01-01T09:00:00Z")).json()["name"]
        == "Zawadi"
    )
    r = client.put(
        url, json=learner_body(name="  Zawadi   W ", buddy="zip", interests=["animals"], updated_at=LATER)
    )
    assert r.json()["name"] == "Zawadi W" and r.json()["buddy"] == "zip"
    assert client.get(f"/families/{fam['id']}").json()["learners"][0]["interests"] == ["animals"]


def test_learner_data_is_minimal_and_validated(client, outbox):
    fam = family_with_consent(client, outbox)
    url = f"/families/{fam['id']}/learners/{LEARNER}"
    assert client.put(url, json=learner_body(surname="X")).status_code == 422
    assert client.put(url, json=learner_body(birth_month=13)).status_code == 422
    assert client.put(url, json=learner_body(birth_year=2999)).status_code == 422
    assert client.put(f"/families/{fam['id']}/learners/not-a-ulid", json=learner_body()).status_code == 422


def test_family_settings_and_pin_last_edit_wins(client, outbox):
    fam = family_with_consent(client, outbox)
    url = f"/families/{fam['id']}"
    pin = {"salt": "a" * 22, "hash": "b" * 43, "iterations": 150000}
    r = client.patch(url, json={"settings": {"goal": 3, "limit": 30}, "pin": pin, "updated_at": LATER})
    assert r.json()["settings"]["goal"] == 3 and r.json()["pin"] == pin
    r = client.patch(url, json={"settings": {"goal": 1}, "updated_at": NOW})
    assert r.json()["settings"]["goal"] == 3
    r = client.patch(url, json={"clear_pin": True, "updated_at": "2030-01-01T12:00:00Z"})
    assert r.json()["pin"] is None
    assert client.patch(url, json={"settings": {"goal": 9}, "updated_at": LATER}).status_code == 422


def test_other_families_are_invisible(client, outbox):
    fam = family_with_consent(client, outbox)
    client.post("/auth/logout")
    sign_in(client, outbox, "other@example.com")
    assert client.get(f"/families/{fam['id']}").status_code == 404
    assert client.put(f"/families/{fam['id']}/learners/{LEARNER}", json=learner_body()).status_code == 404


def test_delete_learner(client, outbox):
    fam = family_with_consent(client, outbox)
    url = f"/families/{fam['id']}/learners/{LEARNER}"
    client.put(url, json=learner_body())
    assert client.delete(url).status_code == 204
    assert client.get(f"/families/{fam['id']}").json()["learners"] == []


def test_policy_summary(client):
    p = client.get("/policy").json()
    assert p["version"] == POLICY and p["scopes"]["progress"]["required"] is True
