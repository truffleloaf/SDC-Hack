"""Explainable matching: coverage, task similarity, gaps and route ranking."""

from __future__ import annotations

from math import ceil
from typing import Sequence

from sqlmodel import Session

from app.config import (
    FIT_SIMILARITY_WEIGHT,
    FIT_SKILL_WEIGHT,
    ROUTE_EXPOSURE_WEIGHT,
    ROUTE_FIT_WEIGHT,
    ROUTE_LIMIT,
)
from app.models import Role
from app.schemas import AnalysisResponse, RouteResult, ScoredTask, SkillGap, Selection
from app.services.catalog import (
    list_roles,
    requirements_for_role,
    sdg_ids_for_role,
    skill_ids_for_role_tasks,
)
from app.services.exposure import (
    LoadedSignal,
    confidence,
    role_exposure,
    score_tasks,
    target_role_exposure,
)


def role_fit(coverage: float, similarity: float | None) -> float:
    if similarity is None:
        return 100.0 * coverage
    return 100.0 * (
        FIT_SKILL_WEIGHT * coverage + FIT_SIMILARITY_WEIGHT * similarity
    )


def skill_coverage(session: Session, role_id: str, levels: dict[str, int]) -> float:
    rows = requirements_for_role(session, role_id)
    total_importance = sum(req.importance for req, _skill in rows)
    if total_importance == 0:
        return 0.0
    covered = 0.0
    for req, _skill in rows:
        current = levels.get(req.skill_id, 0)
        covered += req.importance * min(current / req.required_level, 1.0)
    return covered / total_importance


def task_similarity(
    user_skills: set[str], target_role_id: str, session: Session
) -> float | None:
    target = skill_ids_for_role_tasks(session, target_role_id)
    if not target or not user_skills:
        return None
    union = user_skills | target
    return len(user_skills & target) / len(union) if union else None


def skill_gaps(session: Session, role: Role, levels: dict[str, int]) -> list[SkillGap]:
    rows = requirements_for_role(session, role.id)
    gaps: list[SkillGap] = []
    for req, skill in rows:
        current = levels.get(req.skill_id, 0)
        gap = max(0, req.required_level - current)
        if gap == 0:
            continue
        gaps.append(
            SkillGap(
                skillId=skill.id,
                name=skill.name,
                current=current,
                required=req.required_level,
                gap=gap,
                importance=req.importance,
                priority=round(gap * req.importance * (role.demand / 100.0), 6),
                hours=gap * skill.hours_per_level,
            )
        )
    gaps.sort(key=lambda gap: (-gap.priority, gap.name))
    return gaps


def learning_weeks(total_hours: int, hours_per_week: int) -> int:
    if total_hours <= 0:
        return 0
    return ceil(total_hours / max(1, hours_per_week))


def route_score(fit: float, target_exposure: float) -> float:
    return (
        ROUTE_FIT_WEIGHT * fit
        + ROUTE_EXPOSURE_WEIGHT * 100.0 * (1.0 - target_exposure)
    )


def compute_routes(
    session: Session,
    *,
    current_role_id: str,
    user_task_skills: set[str],
    levels: dict[str, int],
    scenario_id: str,
    signals: Sequence[LoadedSignal],
    hours_per_week: int,
    limit: int = ROUTE_LIMIT,
) -> list[RouteResult]:
    results: list[RouteResult] = []
    for role in list_roles(session):
        if role.id == current_role_id:
            continue
        coverage = skill_coverage(session, role.id, levels)
        similarity = task_similarity(user_task_skills, role.id, session)
        fit = role_fit(coverage, similarity)
        exposure = target_role_exposure(session, role.id, scenario_id, signals)
        gaps = skill_gaps(session, role, levels)
        total_hours = sum(gap.hours for gap in gaps)
        results.append(
            RouteResult(
                roleId=role.id,
                title=role.title,
                family=role.family,
                demand=role.demand,
                coverage=round(coverage, 6),
                similarity=round(similarity, 6) if similarity is not None else None,
                fit=round(fit, 6),
                targetExposure=round(exposure, 6),
                score=round(route_score(fit, exposure), 6),
                gaps=gaps,
                totalGapHours=total_hours,
                weeks=learning_weeks(total_hours, hours_per_week),
                sdgs=sdg_ids_for_role(session, role.id),
            )
        )
    results.sort(key=lambda row: (-row.score, row.title))
    return results[:limit]


def analyze(
    session: Session,
    *,
    role_id: str,
    selections: Sequence[Selection],
    levels: dict[str, int],
    scenario_id: str,
    signals: Sequence[LoadedSignal],
    hours_per_week: int,
    limit: int = ROUTE_LIMIT,
) -> AnalysisResponse:
    scored = score_tasks(session, selections, scenario_id, signals)
    exposure = role_exposure(scored)
    user_task_skills = {skill for task in scored for skill in task.skills}
    routes = compute_routes(
        session,
        current_role_id=role_id,
        user_task_skills=user_task_skills,
        levels=levels,
        scenario_id=scenario_id,
        signals=signals,
        hours_per_week=hours_per_week,
        limit=limit,
    )
    return AnalysisResponse(
        scenario="fast" if scenario_id == "fast" else "normal",
        roleExposure=round(exposure, 6),
        confidence=confidence(scored, signals),  # type: ignore[arg-type]
        tasks=scored,
        routes=routes,
        illustrative=True,
    )
