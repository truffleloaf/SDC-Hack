from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.engine import (
    classify,
    compute_routes,
    confidence,
    learning_weeks,
    normalize_shares,
    recency,
    role_exposure,
    role_fit,
    score_tasks,
    signal_adjustment,
    skill_coverage,
    task_similarity,
)
from app.seed import (
    DEMO_PERSONA,
    RESOURCES,
    ROLES,
    SCENARIOS,
    SDGS,
    SIGNALS,
    SKILLS,
    TASKS,
    TASKS_BY_ROLE,
    TASK_BY_ID,
    ROLE_BY_ID,
)

GOLDEN = json.loads((Path(__file__).with_name("golden.json")).read_text(encoding="utf-8"))
LEVELS = DEMO_PERSONA["skills"]
SELECTIONS = [
    {"taskId": task["id"], "share": task["defaultShare"]}
    for task in TASKS_BY_ROLE["finance-admin"]
]


def analysis(scenario: str) -> dict:
    tasks = score_tasks(SELECTIONS, TASK_BY_ID, scenario, SIGNALS)
    user_skills = list(dict.fromkeys(skill for task in tasks for skill in task["skills"]))
    return {
        "scenario": scenario,
        "roleExposure": role_exposure(tasks),
        "confidence": confidence(tasks, SIGNALS),
        "tasks": tasks,
        "routes": compute_routes(
            current_role_id="finance-admin",
            user_task_skills=user_skills,
            levels=LEVELS,
            scenario_id=scenario,
            signals=SIGNALS,
            hours_per_week=8,
        ),
    }


def assert_close(actual, expected, path: str = "") -> None:
    if isinstance(expected, dict):
        assert isinstance(actual, dict), f"{path}: expected object"
        assert set(actual) == set(expected), f"{path}: key mismatch {set(actual) ^ set(expected)}"
        for key in expected:
            assert_close(actual[key], expected[key], f"{path}.{key}")
        return

    if isinstance(expected, list):
        assert isinstance(actual, list), f"{path}: expected list"
        assert len(actual) == len(expected), f"{path}: length {len(actual)} != {len(expected)}"
        for index, (left, right) in enumerate(zip(actual, expected)):
            assert_close(left, right, f"{path}[{index}]")
        return

    if expected is None or isinstance(expected, (str, bool)):
        assert actual == expected, f"{path}: {actual!r} != {expected!r}"
        return

    assert actual == pytest.approx(expected, rel=1e-12, abs=1e-9), f"{path}: {actual!r} != {expected!r}"


def test_seed_counts() -> None:
    assert len(ROLES) == 6
    assert len(TASKS) == 31
    assert len(SKILLS) == 15
    assert len(SIGNALS) == 20
    assert len(SDGS) == 4
    assert len(RESOURCES) == 25
    assert len(SCENARIOS) == 2


def test_normal_analysis_matches_frontend_golden() -> None:
    assert_close(analysis("normal"), GOLDEN["analysisNormal"], "normal")


def test_fast_analysis_matches_frontend_golden() -> None:
    assert_close(analysis("fast"), GOLDEN["analysisFast"], "fast")


def test_pathway_matches_frontend_golden() -> None:
    from app.engine import build_pathway

    assert_close(
        build_pathway(
            target_role_id="finance-systems-analyst",
            levels=LEVELS,
            hours_per_week=8,
            free_only=False,
        ),
        GOLDEN["pathway"],
        "pathway",
    )


def test_pathway_free_matches_frontend_golden() -> None:
    from app.engine import build_pathway

    assert_close(
        build_pathway(
            target_role_id="finance-systems-analyst",
            levels=LEVELS,
            hours_per_week=8,
            free_only=True,
        ),
        GOLDEN["pathwayFree"],
        "pathwayFree",
    )


def test_role_tasks_matches_frontend_golden() -> None:
    admin_tasks = TASKS_BY_ROLE["finance-admin"]
    lookup = {task["id"]: task for task in admin_tasks}
    scored = score_tasks(
        [{"taskId": task["id"], "share": task["defaultShare"]} for task in admin_tasks],
        lookup,
        "normal",
        SIGNALS,
    )
    actual = {
        "role": ROLE_BY_ID["finance-admin"],
        "scenario": "normal",
        "roleExposure": role_exposure(scored),
        "tasks": scored,
    }
    assert_close(actual, GOLDEN["roleTasks"], "roleTasks")


def test_recency_halves_at_180_days() -> None:
    assert recency(0) == 1
    assert recency(180) == pytest.approx(0.5)


def test_signal_adjustment_is_bounded_and_zero_without_signals() -> None:
    assert signal_adjustment("no-such-task", SIGNALS) == 0
    for task in TASKS:
        assert -0.2 <= signal_adjustment(task["id"], SIGNALS) <= 0.2


def test_classification_thresholds() -> None:
    assert classify(0.65, 0.39) == "Automate"
    assert classify(0.64, 0.39) == "Augment"
    assert classify(0.9, 0.65) == "Protect"
    assert classify(0.5, 0.5) == "Augment"


def test_normalize_shares() -> None:
    assert [item["share"] for item in normalize_shares([{"share": 1}, {"share": 3}])] == [
        0.25,
        0.75,
    ]
    assert [item["share"] for item in normalize_shares([{"share": 0}, {"share": 0}])] == [
        0.5,
        0.5,
    ]
    assert normalize_shares([]) == []


def test_learning_weeks() -> None:
    assert learning_weeks(90, 8) == 12
    assert learning_weeks(0, 8) == 0
    assert learning_weeks(90, 12) == 8


def test_skill_coverage_bounds() -> None:
    role = ROLE_BY_ID["finance-admin"]
    assert skill_coverage(role, {}) == 0
    assert skill_coverage(role, {requirement["skillId"]: 4 for requirement in role["requirements"]}) == 1


def test_task_similarity_none_for_empty_user_skills() -> None:
    assert task_similarity([], "data-analyst") is None


def test_role_fit_falls_back_to_coverage() -> None:
    assert role_fit(0.5, None) == 50
    assert role_fit(0.5, 0.5) == 50


def test_normal_and_fast_change_ranking() -> None:
    normal = [route["roleId"] for route in analysis("normal")["routes"]]
    fast = [route["roleId"] for route in analysis("fast")["routes"]]
    assert normal[0] == "operations-coordinator"
    assert fast[0] == "finance-systems-analyst"
    assert normal != fast


@pytest.mark.parametrize("skill", SKILLS, ids=lambda skill: skill["id"])
def test_every_skill_has_a_free_resource(skill):
    assert any(resource["skillId"] == skill["id"] and resource["free"] for resource in RESOURCES)
