"""API tests for the demo contract (Aisyah / 62% / Fast 76%)."""

from __future__ import annotations

import pytest


def aisyah(scenario: str = "normal", hours: int = 6, **overrides) -> dict:
    body = {
        "roleId": "finance-admin",
        "selections": [
            {"taskId": "fa-invoice", "share": 30},
            {"taskId": "fa-recon", "share": 20},
            {"taskId": "fa-exception", "share": 15},
            {"taskId": "fa-reporting", "share": 15},
            {"taskId": "fa-comms", "share": 10},
            {"taskId": "fa-expense", "share": 10},
        ],
        "skills": {
            "excel": 3,
            "erp": 3,
            "controls": 3,
            "stakeholder": 2,
            "analysis": 2,
            "writing": 2,
            "empathy": 2,
            "coordination": 2,
            "process": 1,
            "automation": 1,
            "bi": 1,
            "ai": 1,
            "stats": 1,
            "sql": 0,
            "python": 0,
        },
        "scenario": scenario,
        "hoursPerWeek": hours,
        "freeOnly": False,
    }
    body.update(overrides)
    return body


def test_health_and_seed_counts(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    body = health.json()
    assert body == {
        "status": "ok",
        "dataset": "demo",
        "seedVersion": "2026.10.4",
        "dataAsOf": "2026-10-01",
        "counts": {"roles": 8, "tasks": 39, "skills": 15, "signals": 20},
    }

    seed = client.get("/api/seed")
    assert seed.status_code == 200
    data = seed.json()
    assert data["version"] == "2026.10.4"
    assert data["asOf"] == "2026-10-01"
    assert len(data["roles"]) == 8
    assert len(data["tasks"]) == 39
    assert len(data["skills"]) == 15
    assert len(data["signals"]) == 20
    assert len(data["resources"]) == 25
    assert len(data["sdgs"]) == 17
    assert len(data["scenarios"]) == 3
    assert sum(len(role["sdgs"]) for role in data["roles"]) == 13
    assert data["demoPersona"]["name"] == "Aisyah"
    assert len(data["demoPersona"]["skills"]) == 15

    assert data["roles"][0]["id"] == "finance-admin"
    assert data["tasks"][0]["id"] == "fa-invoice"
    assert data["tasks"][0]["skills"] == ["erp", "excel"]
    assert data["skills"][0]["id"] == "excel"
    assert data["skills"][0]["hoursPerLevel"] == 10


def test_analysis_normal_and_fast_match_the_demo(client):
    normal = client.post("/api/analysis", json=aisyah("normal"))
    assert normal.status_code == 200
    body = normal.json()
    assert body["scenario"] == "normal"
    assert body["confidence"] == "Medium"
    assert body["illustrative"] is True
    assert body["roleExposure"] == pytest.approx(0.619031, abs=1e-4)
    assert round(body["roleExposure"] * 100) == 62
    assert len(body["tasks"]) == 6
    assert len(body["routes"]) == 3

    tasks = {task["id"]: task for task in body["tasks"]}
    assert tasks["fa-invoice"]["exposure"] == pytest.approx(0.8218, abs=1e-3)
    assert tasks["fa-invoice"]["classification"] == "Automate"
    assert tasks["fa-exception"]["exposure"] == pytest.approx(0.3597, abs=1e-3)
    assert tasks["fa-exception"]["classification"] == "Protect"
    assert tasks["fa-reporting"]["classification"] == "Augment"

    assert [route["roleId"] for route in body["routes"]] == [
        "operations-coordinator",
        "finance-systems-analyst",
        "hr-operations",
    ]

    fsa = next(route for route in body["routes"] if route["roleId"] == "finance-systems-analyst")
    assert fsa["fit"] == pytest.approx(56.0, abs=0.1)
    assert fsa["targetExposure"] == pytest.approx(0.3646, abs=1e-3)
    assert fsa["score"] == pytest.approx(58.29, abs=0.1)
    assert [gap["skillId"] for gap in fsa["gaps"]] == [
        "automation",
        "process",
        "sql",
        "erp",
        "stakeholder",
    ]
    assert fsa["totalGapHours"] == 90
    assert fsa["weeks"] == 15

    fast = client.post("/api/analysis", json=aisyah("fast")).json()
    assert fast["scenario"] == "fast"
    assert fast["roleExposure"] == pytest.approx(0.7640, abs=1e-3)
    assert round(fast["roleExposure"] * 100) == 76
    assert fast["routes"][0]["roleId"] == "finance-systems-analyst"
    fast_tasks = {task["id"]: task for task in fast["tasks"]}
    assert fast_tasks["fa-invoice"]["exposure"] == 1.0
    assert fast_tasks["fa-exception"]["exposure"] == pytest.approx(0.4597, abs=1e-3)


def test_profile_validation_matches_parse_profile(client):
    bad = client.post("/api/analysis", json={"roleId": "nope"})
    assert bad.status_code == 400
    assert bad.json() == {"error": "Unknown roleId"}

    body = aisyah(hoursPerWeek=100, scenario="weird")
    body["skills"]["basket-weaving"] = 3
    body["skills"]["sql"] = 9
    body["selections"].append({"taskId": "not-a-task", "share": 10})

    response = client.post("/api/profiles", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["storage"] == "client"
    assert data["profile"]["roleId"] == "finance-admin"
    assert data["profile"]["hoursPerWeek"] == 40
    assert data["profile"]["scenario"] == "normal"
    assert data["profile"]["skills"]["sql"] == 4
    assert "basket-weaving" not in data["profile"]["skills"]
    assert len(data["profile"]["selections"]) == 6
    assert data["id"]


def test_role_tasks_and_sdgs(client):
    normal = client.get("/api/roles/finance-admin/tasks?scenario=normal")
    assert normal.status_code == 200
    body = normal.json()
    assert body["role"]["id"] == "finance-admin"
    assert len(body["role"]["requirements"]) == 5
    assert body["scenario"] == "normal"
    assert body["roleExposure"] == pytest.approx(0.619031, abs=1e-4)
    assert len(body["tasks"]) == 6

    # Unknown scenario falls back to normal.
    fallback = client.get("/api/roles/finance-admin/tasks?scenario=unknown")
    assert fallback.status_code == 200
    assert fallback.json()["scenario"] == "normal"

    missing = client.get("/api/roles/nope/tasks")
    assert missing.status_code == 404
    assert missing.json() == {"error": "Role not found"}

    sdgs = client.get("/api/sdgs")
    assert sdgs.status_code == 200
    rows = {row["id"]: row for row in sdgs.json()["sdgs"]}
    assert set(rows) == set(range(1,18))
    assert len(rows[8]["roles"]) == 8
    assert rows[4]["roles"] == []
    assert len(rows[9]["roles"]) == 3
    assert sum(len(row["roles"]) for row in rows.values()) == 13


def test_pathway_generation_and_lookup(client):
    body = aisyah("fast", targetRoleId="finance-systems-analyst")
    response = client.post("/api/pathways", json=body)
    assert response.status_code == 201
    data = response.json()
    assert data["targetRoleId"] == "finance-systems-analyst"
    assert data["totalHours"] == 90
    assert data["weeks"] == 15
    assert len(data["steps"]) == 5
    assert data["steps"][0]["skillId"] == "automation"
    assert data["steps"][0]["hours"] == 24
    assert data["steps"][0]["title"] == "Level up: Process automation"
    assert data["steps"][0]["startWeek"] == 1
    assert data["steps"][0]["resource"]["free"] is True

    lookup = client.get(f"/api/pathways/{data['id']}")
    assert lookup.status_code == 200
    assert lookup.json()["weeks"] == 15
    assert [step["skillId"] for step in lookup.json()["steps"]] == [
        "automation",
        "process",
        "sql",
        "erp",
        "stakeholder",
    ]

    eight = client.post("/api/pathways", json={**body, "hoursPerWeek": 8}).json()
    twelve = client.post("/api/pathways", json={**body, "hoursPerWeek": 12}).json()
    assert eight["weeks"] == 12
    assert twelve["weeks"] == 8

    free = client.post("/api/pathways", json={**body, "freeOnly": True}).json()
    for step in free["steps"]:
        assert step["resource"] is None or step["resource"]["free"] is True

    missing_target = client.post("/api/pathways", json=aisyah("fast"))
    assert missing_target.status_code == 400
    assert missing_target.json() == {"error": "targetRoleId is required"}

    assert client.get("/api/pathways/not-a-real-id").status_code == 404


def test_signals_add_recompute_and_reset(client):
    listed = client.get("/api/signals")
    assert listed.status_code == 200
    assert listed.json()["count"] == 20
    assert listed.json()["signals"][0]["id"] == "s01"
    assert "recency" in listed.json()["signals"][0]

    signal = {
        "date": "2026-09-30",
        "headline": "A new invoice agent reaches finance teams",
        "sourceName": "Demo source",
        "sourceUrl": "https://example.org/signal",
        "direction": 1,
        "strength": 0.6,
        "impacts": [{"taskId": "fa-invoice", "impact": 0.15}],
        "explanation": "Synthetic demo signal.",
    }
    created = client.post("/api/signals", json=signal)
    assert created.status_code == 201
    assert created.json()["evidence"] == "user"
    assert created.json()["id"].startswith("user-")
    assert client.get("/api/signals").json()["count"] == 21
    # Health still counts the 20 seed signals.
    assert client.get("/api/health").json()["counts"]["signals"] == 20

    recompute = client.post(
        "/api/analysis/recompute",
        json={"profile": aisyah("normal"), "pendingSignalIds": [created.json()["id"]]},
    )
    assert recompute.status_code == 200
    diff = recompute.json()
    assert diff["before"]["roleExposure"] == pytest.approx(0.619031, abs=1e-4)
    assert diff["after"]["roleExposure"] == pytest.approx(0.645927, abs=1e-4)
    assert diff["delta"] == pytest.approx(0.026896, abs=1e-4)
    assert len(diff["changed"]) == 1
    assert diff["changed"][0]["taskId"] == "fa-invoice"
    assert diff["changed"][0]["before"] == pytest.approx(0.821834, abs=1e-4)
    assert diff["changed"][0]["after"] == pytest.approx(0.911488, abs=1e-4)

    reset = client.post("/api/seed")
    assert reset.status_code == 200
    assert reset.json()["reset"] is True
    assert client.get("/api/signals").json()["count"] == 20


def test_signal_validation(client):
    base = {
        "date": "2026-10-02",
        "headline": "A valid headline here",
        "sourceName": "Demo source",
        "sourceUrl": "https://example.org/signal",
        "direction": 1,
        "strength": 0.6,
        "impacts": [{"taskId": "fa-invoice", "impact": 0.15}],
    }
    assert client.post("/api/signals", json=base).status_code == 400
    assert client.post("/api/signals", json={**base, "date": "2026-09-30", "sourceUrl": "http://insecure"}).status_code == 400
    assert client.post("/api/signals", json={**base, "date": "2026-09-30", "impacts": []}).status_code == 400
    assert client.post("/api/signals", json={**base, "date": "2026-09-30", "impacts": [{"taskId": "nope", "impact": 0.1}]}).status_code == 400


def test_errors_are_error_objects(client):
    assert client.post("/api/analysis", json={"roleId": ""}).json() == {"error": "Unknown roleId"}
    # ProfileError is mapped once, not per-router.
    assert client.post("/api/pathways", json={"roleId": ""}).json() == {"error": "Unknown roleId"}
    assert client.post("/api/profiles", json={"roleId": ""}).json() == {"error": "Unknown roleId"}
    assert client.get("/api/nope").json() == {"error": "Not Found"}

    # Non-object JSON bodies and malformed JSON also use the {error} envelope.
    not_an_object = client.post("/api/analysis", json=[])
    assert not_an_object.status_code == 400
    assert not_an_object.json() == {"error": "Body must be a JSON object"}

    malformed = client.post(
        "/api/analysis",
        content=b"{not json",
        headers={"content-type": "application/json"},
    )
    assert malformed.status_code == 400
    assert malformed.json() == {"error": "Invalid request body: malformed JSON"}

    # Protocol headers such as Allow must survive the handler.
    wrong_method = client.put("/api/seed")
    assert wrong_method.status_code == 405
    assert wrong_method.json() == {"error": "Method Not Allowed"}
    assert wrong_method.headers.get("allow")


def test_unhandled_errors_return_json_envelope(client, caplog):
    """A bug in a route must not leak a plain-text 500 or a traceback."""
    from fastapi.testclient import TestClient

    from app.db import get_session
    from app.main import app

    def explode():
        raise RuntimeError("internal detail: /secret/path")

    app.dependency_overrides[get_session] = explode
    probe = TestClient(app, raise_server_exceptions=False)
    try:
        response = probe.get(
            "/api/health", headers={"Origin": "https://frontend.example"}
        )
    finally:
        probe.close()
        app.dependency_overrides.pop(get_session, None)

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/json")
    # The 500 must survive CORS, otherwise browser clients cannot read it.
    assert response.headers.get("access-control-allow-origin")
    assert response.json() == {"error": "Internal Server Error"}
    assert "secret" not in response.text
    assert "Unhandled error: GET /api/health" in caplog.text


def test_database_outage_returns_503(client):
    """Connection-level failures are retryable, so they map to 503, not 500."""
    from fastapi.testclient import TestClient
    from sqlalchemy.exc import OperationalError

    from app.db import get_session
    from app.main import app

    def down():
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    app.dependency_overrides[get_session] = down
    probe = TestClient(app, raise_server_exceptions=False)
    try:
        response = probe.get(
            "/api/health", headers={"Origin": "https://frontend.example"}
        )
    finally:
        probe.close()
        app.dependency_overrides.pop(get_session, None)

    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/json")
    assert response.headers.get("access-control-allow-origin")
    assert response.json() == {"error": "service unavailable"}
    assert "connection refused" not in response.text


def test_demo_reset_can_be_disabled(client, monkeypatch):
    monkeypatch.setenv("ALLOW_DEMO_RESET", "false")

    response = client.post("/api/seed")
    assert response.status_code == 403
    assert response.json() == {"error": "Demo reset is disabled"}
    # The dataset is untouched and still readable.
    assert client.get("/api/seed").status_code == 200


def test_demo_reset_is_disabled_for_live_dataset(client, monkeypatch):
    monkeypatch.setattr("app.config.DATASET", "live")

    response = client.post("/api/seed")
    assert response.status_code == 403
    assert response.json() == {
        "error": "Demo reset is only available in demo mode"
    }


def test_catalog_reads_order_and_task_skills_from_database(client):
    """New rows must show up; no ordering or skills come from seed constants."""
    from sqlmodel import Session

    from app.db import engine
    from app.models import Skill, Task, TaskSkill

    with Session(engine) as session:
        session.add(
            Skill(
                id="verify-skill",
                name="Verify skill",
                category="Technical",
                hours_per_level=1,
                deliverable="d",
                why="w",
                sort_order=99,
            )
        )
        session.add(
            Task(
                id="zz-verify",
                role_id="finance-admin",
                name="Verify task",
                description="d",
                base_exposure=0.5,
                human_judgment=0.5,
                default_share=1,
                try_this_week="t",
                sort_order=99,
            )
        )
        session.flush()
        session.add(
            TaskSkill(task_id="zz-verify", skill_id="verify-skill", position=0)
        )
        session.add(TaskSkill(task_id="zz-verify", skill_id="sql", position=1))
        session.commit()

    data = client.get("/api/seed").json()
    assert data["skills"][-1]["id"] == "verify-skill"
    assert data["tasks"][-1]["id"] == "zz-verify"
    assert data["tasks"][-1]["skills"] == ["verify-skill", "sql"]


def test_role_sdgs_come_from_database(client):
    from sqlmodel import Session

    from app.db import engine
    from app.models import RoleSDG

    with Session(engine) as session:
        session.add(
            RoleSDG(role_id="operations-coordinator", sdg_id=4, position=9)
        )
        session.commit()

    data = client.get("/api/seed").json()
    role = next(
        row for row in data["roles"] if row["id"] == "operations-coordinator"
    )
    assert 4 in role["sdgs"]


def test_live_process_refuses_a_demo_database(client, monkeypatch):
    from sqlmodel import Session

    from app.db import engine
    from app.models import Meta
    from app.seed import ensure_dataset

    with Session(engine) as session:
        marker = session.get(Meta, "dataset")
        session.delete(marker)
        session.commit()

        monkeypatch.setattr("app.config.DATASET", "live")
        with pytest.raises(RuntimeError, match="no\\s+meta\\.dataset marker"):
            ensure_dataset(session)


def test_cors_preflight_allows_json_post(client):
    """A browser JSON POST triggers OPTIONS first; it must be allowed."""
    from app.config import CORS_ORIGINS

    origin = (
        "https://frontend.example"
        if "*" in CORS_ORIGINS
        else CORS_ORIGINS[0]
    )
    response = client.options(
        "/api/analysis",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin")
    assert "POST" in response.headers.get("access-control-allow-methods", "")
    allow_headers = response.headers.get("access-control-allow-headers", "").lower()
    assert "content-type" in allow_headers


def test_cors_origins_parsing(monkeypatch):
    from app.config import cors_origins

    monkeypatch.setenv("CORS_ORIGINS", "https://a.example, https://b.example")
    assert cors_origins() == ["https://a.example", "https://b.example"]

    monkeypatch.setenv("CORS_ORIGINS", "*")
    assert cors_origins() == ["*"]


def test_slow_scenario_is_preserved_by_api(client):
    slow=client.post('/api/analysis',json=aisyah('slow')).json()
    normal=client.post('/api/analysis',json=aisyah('normal')).json()
    assert slow['scenario']=='slow'
    assert slow['roleExposure']<normal['roleExposure']
