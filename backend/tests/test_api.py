from __future__ import annotations

import pytest

from app.seed import DEMO_PERSONA, SCENARIOS, TASKS_BY_ROLE


def profile_payload(**overrides):
    payload = {
        "roleId": "finance-admin",
        "selections": [
            {"taskId": task["id"], "share": task["defaultShare"]}
            for task in TASKS_BY_ROLE["finance-admin"]
        ],
        "skills": DEMO_PERSONA["skills"],
        "scenario": "normal",
        "hoursPerWeek": 8,
        "freeOnly": False,
    }
    payload.update(overrides)
    return payload


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["dataAsOf"] == "2026-10-01"
    assert body["counts"] == {"roles": 6, "tasks": 31, "skills": 15, "signals": 20}


def test_seed_get_and_reset(client):
    response = client.get("/api/seed")
    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "2026.10.2"
    assert len(body["roles"]) == 6
    assert len(body["tasks"]) == 31
    assert len(body["skills"]) == 15
    assert len(body["signals"]) == 20
    assert body["demoPersona"]["name"] == "Aisyah"

    reset = client.post("/api/seed")
    assert reset.status_code == 200
    assert reset.json()["reset"] is True
    assert reset.json()["demoPersona"]["name"] == "Aisyah"


def test_analysis_normal(client):
    response = client.post("/api/analysis", json=profile_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["scenario"] == "normal"
    assert body["roleExposure"] == pytest.approx(0.6190312308415231)
    assert body["confidence"] == "Medium"
    assert len(body["tasks"]) == 6
    assert len(body["routes"]) == 3
    assert body["routes"][0]["roleId"] == "operations-coordinator"
    assert body["illustrative"] is True


def test_analysis_fast_changes_ranking(client):
    normal = client.post("/api/analysis", json=profile_payload(scenario="normal")).json()
    fast = client.post("/api/analysis", json=profile_payload(scenario="fast")).json()
    assert fast["roleExposure"] > normal["roleExposure"]
    assert normal["routes"][0]["roleId"] == "operations-coordinator"
    assert fast["routes"][0]["roleId"] == "finance-systems-analyst"


def test_analysis_rejects_unknown_role(client):
    response = client.post("/api/analysis", json={"roleId": "not-a-role"})
    assert response.status_code == 400
    assert response.json() == {"error": "Unknown roleId"}


def test_profile_round_trip(client):
    response = client.post("/api/profiles", json=profile_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["storage"] == "client"
    assert isinstance(body["id"], str) and body["id"]
    assert body["profile"]["roleId"] == "finance-admin"
    assert "targetRoleId" not in body["profile"]


def test_profile_validates_and_clamps(client):
    response = client.post(
        "/api/profiles",
        json=profile_payload(
            hoursPerWeek=0,
            skills={"excel": 99, "not-a-skill": 4},
        ),
    )
    assert response.status_code == 201
    profile = response.json()["profile"]
    assert profile["hoursPerWeek"] == 6
    assert profile["skills"]["excel"] == 4
    assert "not-a-skill" not in profile["skills"]


def test_profile_rejects_malformed_json(client):
    response = client.post(
        "/api/profiles",
        content="{",
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Body must be a JSON object"}


def test_pathway_create_get_and_free_only(client):
    response = client.post(
        "/api/pathways",
        json=profile_payload(targetRoleId="finance-systems-analyst", hoursPerWeek=8),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["targetRoleId"] == "finance-systems-analyst"
    assert body["totalHours"] == 90
    assert body["weeks"] == 12
    assert len(body["steps"]) == 5

    fetched = client.get(f"/api/pathways/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["weeks"] == 12
    assert len(fetched.json()["steps"]) == 5

    free = client.post(
        "/api/pathways",
        json=profile_payload(
            targetRoleId="finance-systems-analyst",
            hoursPerWeek=8,
            freeOnly=True,
        ),
    )
    assert free.status_code == 201
    for step in free.json()["steps"]:
        assert step["resource"] is None or step["resource"]["free"] is True


def test_pathway_requires_target_role(client):
    response = client.post("/api/pathways", json=profile_payload())
    assert response.status_code == 400
    assert response.json() == {"error": "targetRoleId is required"}


def test_pathway_not_found(client):
    response = client.get("/api/pathways/not-a-real-id")
    assert response.status_code == 404
    assert response.json() == {"error": "Pathway not found"}


def test_role_tasks(client):
    response = client.get("/api/roles/finance-admin/tasks?scenario=normal")
    assert response.status_code == 200
    body = response.json()
    assert body["role"]["id"] == "finance-admin"
    assert body["scenario"] == "normal"
    assert len(body["tasks"]) == 6
    assert body["roleExposure"] == pytest.approx(0.6190312308415231)

    fast = client.get("/api/roles/finance-admin/tasks?scenario=fast").json()
    assert fast["roleExposure"] > body["roleExposure"]


def test_role_not_found(client):
    response = client.get("/api/roles/nope/tasks")
    assert response.status_code == 404
    assert response.json() == {"error": "Role not found"}


def test_signals(client):
    response = client.get("/api/signals")
    assert response.status_code == 200
    body = response.json()
    assert body["asOf"] == "2026-10-01"
    assert body["count"] == 20
    assert len(body["signals"]) == 20
    dates = [signal["date"] for signal in body["signals"]]
    assert dates == sorted(dates, reverse=True)
    for signal in body["signals"]:
        assert 0 <= signal["recency"] <= 1


def test_sdgs(client):
    response = client.get("/api/sdgs")
    assert response.status_code == 200
    body = response.json()
    assert len(body["sdgs"]) == 4
    assert [sdg["id"] for sdg in body["sdgs"]] == [4, 8, 9, 10]
    for sdg in body["sdgs"]:
        assert isinstance(sdg["roles"], list)


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["docs"] == "/docs"
