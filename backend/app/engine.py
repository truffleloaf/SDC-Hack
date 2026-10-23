"""Deterministic scoring engine.

This is a Python port of ``pivott-web-application-design/lib/engine.ts``.
Every function keeps the same name, formula and output shape as the
TypeScript version, so the FastAPI responses can be diffed against the
frontend's Next.js API.

No LLM, no database, no randomness.
"""

from __future__ import annotations

import math
from datetime import date
from typing import Any, Iterable, Sequence

from app.seed import (
    DATA_AS_OF,
    RESOURCES,
    ROLES,
    SCENARIOS,
    SIGNALS,
    SKILL_BY_ID,
    TASKS_BY_ROLE,
)

Classification = str


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def age_days(value: str, as_of: str = DATA_AS_OF) -> float:
    """Whole days between an ISO date and the data cut-off (never negative)."""
    return max(0.0, float((date.fromisoformat(as_of) - date.fromisoformat(value)).days))


def recency(age: float) -> float:
    """recency = 0.5 ^ (age_days / 180)"""
    return 0.5 ** (age / 180.0)


def signal_weight(signal: dict[str, Any], as_of: str = DATA_AS_OF) -> float:
    if signal["evidence"] == "assumption":
        return signal["assumptionWeight"]
    return signal["strength"] * recency(age_days(signal["date"], as_of))


def signal_adjustment(
    task_id: str,
    signals: Sequence[dict[str, Any]] = SIGNALS,
    as_of: str = DATA_AS_OF,
) -> float:
    """clamp(sum(strength × direction × recency × impact), -0.2, 0.2)"""
    total = 0.0
    for signal in signals:
        for impact in signal.get("impacts", []):
            if impact["taskId"] != task_id:
                continue
            total += (
                signal_weight(signal, as_of)
                * signal["direction"]
                * impact["impact"]
            )
    return clamp(total, -0.2, 0.2)


def get_scenario(scenario_id: str) -> dict[str, Any]:
    for scenario in SCENARIOS:
        if scenario["id"] == scenario_id:
            return scenario
    return SCENARIOS[0]


def task_exposure(base: float, multiplier: float, adjustment: float) -> float:
    """clamp(base_exposure × scenario.multiplier + signal_adjustment, 0, 1)"""
    return clamp(base * multiplier + adjustment, 0.0, 1.0)


def classify(exposure: float, human_judgment: float) -> Classification:
    if exposure >= 0.65 and human_judgment < 0.4:
        return "Automate"
    if human_judgment >= 0.65:
        return "Protect"
    return "Augment"


def normalize_shares(items: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalise arbitrary weights to fractions summing to 1."""
    items = list(items)
    total = sum(max(0.0, float(item["share"])) for item in items)
    if total <= 0:
        count = len(items)
        return [{**item, "share": (1.0 / count if count else 0.0)} for item in items]
    return [{**item, "share": max(0.0, float(item["share"])) / total} for item in items]


def role_exposure(items: Sequence[dict[str, Any]]) -> float:
    """role_exposure = sum(time_share × exposure)"""
    return sum(item["share"] * item["exposure"] for item in items)


def score_tasks(
    selections: Sequence[dict[str, Any]],
    task_lookup: dict[str, dict[str, Any]],
    scenario_id: str,
    signals: Sequence[dict[str, Any]] = SIGNALS,
    preview_multiplier: float | None = None,
) -> list[dict[str, Any]]:
    multiplier = get_scenario(scenario_id)["multiplier"] if preview_multiplier is None else clamp(preview_multiplier, 1, 1.5)
    normalized = normalize_shares(
        [selection for selection in selections if selection["taskId"] in task_lookup and "roleId" in task_lookup[selection["taskId"]]]
    )

    scored: list[dict[str, Any]] = []
    for selection in normalized:
        task_id = selection["taskId"]
        task = task_lookup[task_id]
        adjustment = signal_adjustment(task_id, signals)
        exposure = task_exposure(task["baseExposure"], multiplier, adjustment)
        is_seed = "roleId" in task
        scored.append(
            {
                "id": task_id,
                "name": task["name"],
                "description": task["description"] if is_seed else "Your own task",
                "share": selection["share"],
                "baseExposure": task["baseExposure"],
                "adjustment": adjustment,
                "exposure": exposure,
                "humanJudgment": task["humanJudgment"],
                "classification": classify(exposure, task["humanJudgment"]),
                "skills": task["skills"],
                "tryThisWeek": (
                    task["tryThisWeek"]
                    if is_seed
                    else "Try one AI-assisted run of this task and note which steps still needed your judgment."
                ),
                "custom": not is_seed,
            }
        )
    return scored


def assessment_summary(selections, lookup):
    valid = normalize_shares([item for item in selections if item["taskId"] in lookup])
    return {
        "assessmentCoverage": sum(item["share"] for item in valid if "roleId" in lookup[item["taskId"]]),
        "unassessedTasks": [{"id": item["taskId"], "name": lookup[item["taskId"]]["name"], "share": item["share"]} for item in valid if "roleId" not in lookup[item["taskId"]]],
    }


def skill_coverage(role: dict[str, Any], levels: dict[str, float]) -> float:
    """sum(importance × min(current / required, 1)) / sum(importance)"""
    rated = [requirement for requirement in role["requirements"] if requirement["skillId"] in levels]
    total_importance = sum(requirement["importance"] for requirement in role["requirements"])
    if not total_importance:
        return 0.0
    covered = sum(
        requirement["importance"]
        * min(float(levels.get(requirement["skillId"], 0)) / requirement["requiredLevel"], 1.0)
        for requirement in rated
    )
    return covered / total_importance


def task_similarity(user_skills: Sequence[str], target_role_id: str) -> float | None:
    """Jaccard similarity between the user's task skills and the target role's tasks."""
    target: set[str] = set()
    for task in TASKS_BY_ROLE.get(target_role_id, []):
        target.update(task["skills"])
    user = set(user_skills)
    if not target or not user:
        return None
    intersection = len(user & target)
    union = len(user | target)
    return intersection / union


def role_fit(coverage: float, similarity: float | None) -> float:
    """fit = 100 × (0.8 × coverage + 0.2 × similarity); falls back to coverage."""
    if similarity is None:
        return 100.0 * coverage
    return 100.0 * (0.8 * coverage + 0.2 * similarity)


def skill_gaps(role: dict[str, Any], levels: dict[str, float]) -> list[dict[str, Any]]:
    """gap = max(0, required - current); priority = gap × importance × demand/100."""
    gaps: list[dict[str, Any]] = []
    for requirement in role["requirements"]:
        if requirement["skillId"] not in levels:
            continue
        current = float(levels.get(requirement["skillId"], 0))
        gap = max(0.0, requirement["requiredLevel"] - current)
        if gap <= 0:
            continue
        skill = SKILL_BY_ID.get(requirement["skillId"], {})
        gaps.append(
            {
                "skillId": requirement["skillId"],
                "name": skill.get("name", requirement["skillId"]),
                "current": current,
                "required": requirement["requiredLevel"],
                "gap": gap,
                "importance": requirement["importance"],
                "priority": gap * requirement["importance"] * (role["demand"] / 100.0),
                "hours": gap * skill.get("hoursPerLevel", 10),
            }
        )
    gaps.sort(key=lambda gap: (-gap["priority"], gap["name"]))
    return gaps


def learning_weeks(total_hours: float, hours_per_week: float) -> int:
    """weeks = ceil(sum(gap_hours) / hours_per_week)"""
    if total_hours <= 0:
        return 0
    return math.ceil(total_hours / max(1.0, hours_per_week))


def target_role_exposure(
    role_id: str,
    scenario_id: str,
    signals: Sequence[dict[str, Any]] = SIGNALS,
    preview_multiplier: float | None = None,
) -> float:
    tasks = TASKS_BY_ROLE.get(role_id, [])
    lookup = {task["id"]: task for task in tasks}
    scored = score_tasks(
        [{"taskId": task["id"], "share": task["defaultShare"]} for task in tasks],
        lookup,
        scenario_id,
        signals,
        preview_multiplier,
    )
    return role_exposure(scored)


def route_score(fit: float, target_exposure: float) -> float:
    """route_score = 0.7 × fit + 0.3 × 100 × (1 − target_exposure)"""
    return 0.7 * fit + 0.3 * 100.0 * (1.0 - target_exposure)


def compute_routes(
    *,
    current_role_id: str,
    user_task_skills: Sequence[str],
    levels: dict[str, float],
    scenario_id: str,
    signals: Sequence[dict[str, Any]] = SIGNALS,
    hours_per_week: float,
    limit: int = 3,
    preview_multiplier: float | None = None,
) -> list[dict[str, Any]]:
    routes: list[dict[str, Any]] = []
    for role in ROLES:
        if role["id"] == current_role_id:
            continue
        coverage = skill_coverage(role, levels)
        similarity = task_similarity(user_task_skills, role["id"])
        unknown = [requirement["skillId"] for requirement in role["requirements"] if requirement["skillId"] not in levels]
        total_importance = sum(r["importance"] for r in role["requirements"])
        rated_share = sum(r["importance"] for r in role["requirements"] if r["skillId"] in levels) / total_importance if total_importance else 1
        fit_low = role_fit(coverage, similarity)
        fit_high = role_fit(min(1, coverage + 1 - rated_share), similarity)
        fit = fit_low
        exposure = target_role_exposure(role["id"], scenario_id, signals, preview_multiplier)
        gaps = skill_gaps(role, levels)
        total_gap_hours = sum(gap["hours"] for gap in gaps)
        routes.append(
            {
                "roleId": role["id"],
                "title": role["title"],
                "family": role["family"],
                "demand": role["demand"],
                "coverage": coverage,
                "similarity": similarity,
                "fit": fit,
                "fitLow": fit_low,
                "fitHigh": fit_high,
                "ratedShare": rated_share,
                "targetExposure": exposure,
                "score": route_score(fit, exposure),
                "gaps": gaps,
                "totalGapHours": total_gap_hours,
                "weeks": learning_weeks(total_gap_hours, hours_per_week),
                "sdgs": role["sdgs"],
                "unknownSkillIds": unknown,
            }
        )
    routes.sort(key=lambda route: (-route["score"], route["title"]))
    return routes[:limit]


def build_pathway(
    *,
    target_role_id: str,
    levels: dict[str, float],
    hours_per_week: float,
    free_only: bool,
) -> dict[str, Any]:
    role = next((candidate for candidate in ROLES if candidate["id"] == target_role_id), None)
    if role is None:
        return {"steps": [], "totalHours": 0, "weeks": 0}

    gaps = skill_gaps(role, levels)
    cursor = 0.0
    steps: list[dict[str, Any]] = []
    for gap in gaps:
        options = [resource for resource in RESOURCES if resource["skillId"] == gap["skillId"]]
        if free_only:
            resource = next((option for option in options if option["free"]), None)
        else:
            resource = options[0] if options else None

        start_hours = cursor
        cursor += gap["hours"]
        skill = SKILL_BY_ID.get(gap["skillId"], {})
        steps.append(
            {
                "id": f"{role['id']}:{gap['skillId']}",
                "skillId": gap["skillId"],
                "title": f"{'Start' if gap['current'] == 0 else 'Level up'}: {gap['name']}",
                "skills": [gap["skillId"]],
                "resource": (
                    {
                        "title": resource["title"],
                        "provider": resource["provider"],
                        "url": resource["url"],
                        "free": resource["free"],
                    }
                    if resource
                    else None
                ),
                "hours": gap["hours"],
                "startWeek": math.floor(start_hours / max(1.0, hours_per_week)) + 1,
                "endWeek": max(1, math.ceil(cursor / max(1.0, hours_per_week))),
                "deliverable": skill.get("deliverable", "A small practical project"),
                "current": gap["current"],
                "required": gap["required"],
            }
        )

    return {
        "steps": steps,
        "totalHours": cursor,
        "weeks": learning_weeks(cursor, hours_per_week),
    }


def confidence(
    tasks: Sequence[dict[str, Any]],
    signals: Sequence[dict[str, Any]] = SIGNALS,
) -> str:
    """Confidence reflects evidence coverage and verified-source share."""
    task_ids = {task["id"] for task in tasks}
    covered = sum(
        task["share"]
        for task in tasks
        if any(
            impact["taskId"] == task["id"]
            for signal in signals
            for impact in signal.get("impacts", [])
        )
    )

    total = 0.0
    verified = 0.0
    for signal in signals:
        for impact in signal.get("impacts", []):
            if impact["taskId"] not in task_ids:
                continue
            weight = signal_weight(signal) * impact["impact"]
            total += weight
            if signal["evidence"] == "verified":
                verified += weight

    verified_share = verified / total if total else 0.0
    if covered >= 0.8 and verified_share >= 0.6:
        return "High"
    if covered >= 0.5:
        return "Medium"
    return "Low"


def exposure_band(exposure: float) -> str:
    if exposure < 0.45:
        return "Lower"
    if exposure < 0.65:
        return "Medium"
    return "Higher"


def pct(value: float, digits: int = 0) -> str:
    return f"{value * 100:.{digits}f}%"
