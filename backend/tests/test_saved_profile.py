"""The signed-in user's saved profile (/api/me/profile)."""

from __future__ import annotations

import pytest

from app import auth
from app.main import app

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"

AISYAH_SELECTIONS = [
    {"taskId": "fa-invoice", "share": 30},
    {"taskId": "fa-recon", "share": 20},
    {"taskId": "fa-exception", "share": 15},
    {"taskId": "fa-reporting", "share": 15},
    {"taskId": "fa-comms", "share": 10},
    {"taskId": "fa-expense", "share": 10},
]

AISYAH_SKILLS = {
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
}


def profile_body(**overrides) -> dict:
    body = {
        "roleId": "finance-admin",
        "selections": AISYAH_SELECTIONS,
        "skills": AISYAH_SKILLS,
        "scenario": "normal",
        "hoursPerWeek": 6,
        "freeOnly": False,
        "targetRoleId": "operations-coordinator",
        "name": "Aisyah",
        "completedSteps": ["sql-1"],
        "customTasks": [{"id": "local-1", "name": "Custom task"}],
        "customSignals": [{"id": "sig-1", "headline": "Custom signal"}],
    }
    body.update(overrides)
    return body


def make_user(user_id: str = USER_A, email: str = "aisyah@example.com") -> auth.AuthUser:
    return auth.AuthUser(
        id=user_id,
        email=email,
        role="authenticated",
        provider="email",
        expires_at=None,
        claims={},
    )


@pytest.fixture()
def signed_in(client):
    user = make_user()
    app.dependency_overrides[auth.get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(auth.get_current_user, None)


def test_saved_profile_requires_auth(client):
    response = client.get("/api/me/profile")
    assert response.status_code == 401
    assert response.json() == {"error": "Missing bearer token"}


def test_profile_round_trip(signed_in, client):
    assert client.get("/api/me/profile").status_code == 404

    saved = client.put("/api/me/profile", json=profile_body())
    assert saved.status_code == 200
    body = saved.json()
    assert body["userId"] == USER_A
    assert body["email"] == "aisyah@example.com"
    assert body["name"] == "Aisyah"
    assert body["storage"] == "server"
    assert body["roleId"] == "finance-admin"
    assert body["scenario"] == "normal"
    assert body["hoursPerWeek"] == 6
    assert body["freeOnly"] is False
    assert body["targetRoleId"] == "operations-coordinator"
    assert [selection["taskId"] for selection in body["selections"]] == [
        selection["taskId"] for selection in AISYAH_SELECTIONS
    ]
    assert body["skills"]["excel"] == 3
    assert body["completedSteps"] == ["sql-1"]
    assert body["customTasks"] == [{"id": "local-1", "name": "Custom task"}]
    assert body["customSignals"] == [{"id": "sig-1", "headline": "Custom signal"}]

    fetched = client.get("/api/me/profile")
    assert fetched.status_code == 200
    assert fetched.json() == body


def test_update_keeps_created_at(signed_in, client):
    first = client.put("/api/me/profile", json=profile_body()).json()
    second = client.put(
        "/api/me/profile",
        json=profile_body(
            scenario="fast",
            hoursPerWeek=12,
            name="Aisyah updated",
            completedSteps=["sql-1", "sql-2"],
        ),
    ).json()

    assert second["createdAt"] == first["createdAt"]
    assert second["scenario"] == "fast"
    assert second["hoursPerWeek"] == 12
    assert second["name"] == "Aisyah updated"
    assert second["completedSteps"] == ["sql-1", "sql-2"]


def test_delete_is_idempotent(signed_in, client):
    client.put("/api/me/profile", json=profile_body())

    assert client.delete("/api/me/profile").json() == {"deleted": True}
    assert client.get("/api/me/profile").status_code == 404
    assert client.delete("/api/me/profile").json() == {"deleted": False}


def test_unknown_role_is_a_400(signed_in, client):
    response = client.put("/api/me/profile", json=profile_body(roleId="no-such-role"))
    assert response.status_code == 400
    assert response.json() == {"error": "Unknown roleId"}


def test_unknown_catalogue_ids_are_filtered_and_values_clamped(signed_in, client):
    body = client.put(
        "/api/me/profile",
        json=profile_body(
            selections=[
                {"taskId": "no-such-task", "share": 10},
                {"taskId": "fa-invoice", "share": 999},
            ],
            skills={"no-such-skill": 4, "excel": 9},
            hoursPerWeek=999,
            targetRoleId="no-such-role",
        ),
    ).json()

    assert body["selections"] == [{"taskId": "fa-invoice", "share": 100.0}]
    assert body["skills"] == {"excel": 4}
    assert body["hoursPerWeek"] == 40
    assert body["targetRoleId"] is None


def test_profiles_are_isolated_per_user(signed_in, client):
    client.put("/api/me/profile", json=profile_body(name="Aisyah"))

    app.dependency_overrides[auth.get_current_user] = lambda: make_user(
        USER_B, "other@example.com"
    )
    assert client.get("/api/me/profile").status_code == 404
    other = client.put(
        "/api/me/profile",
        json=profile_body(roleId="data-analyst", name="Other"),
    ).json()
    assert other["userId"] == USER_B
    assert other["roleId"] == "data-analyst"

    app.dependency_overrides[auth.get_current_user] = lambda: make_user()
    restored = client.get("/api/me/profile").json()
    assert restored["userId"] == USER_A
    assert restored["name"] == "Aisyah"


def test_oversized_custom_signal_is_rejected(signed_in, client):
    response = client.put(
        "/api/me/profile",
        json=profile_body(customSignals=[{"note": "x" * 5_000}]),
    )
    assert response.status_code == 400
    assert "4 KB" in response.json()["error"]
