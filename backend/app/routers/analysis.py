"""Analysis endpoints: task map + routes, plus the demo recompute diff."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.schemas import (
    AnalysisResponse,
    ChangedTask,
    ProfileInput,
    RecomputeRequest,
    RecomputeResponse,
    RecomputeSide,
)
from app.services.exposure import load_signals, role_exposure, score_tasks
from app.services.matching import analyze
from app.services.profile import normalize_profile

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("", response_model=AnalysisResponse)
def run_analysis(
    payload: ProfileInput,
    session: Session = Depends(get_session),
) -> AnalysisResponse:
    profile = normalize_profile(session, payload)

    signals = [] if profile.ignoreTrendSignals else load_signals(session)
    return analyze(
        session,
        role_id=profile.roleId,
        sdg_focus=profile.sdgFocus, limit=profile.routeLimit,
        selections=profile.selections,
        levels=profile.skills,
        scenario_id=profile.scenario,
        signals=signals,
        hours_per_week=profile.hoursPerWeek,
    )


@router.post("/recompute", response_model=RecomputeResponse)
def recompute(
    payload: RecomputeRequest,
    session: Session = Depends(get_session),
) -> RecomputeResponse:
    """Apply pending signals to a profile and return the before/after diff.

    ``POST /api/analysis`` intentionally uses only the 20 seed signals, matching
    the demo where a new signal stays pending until the Recompute button.
    """
    profile = normalize_profile(session, payload.profile)

    base_signals = load_signals(session)
    pending = load_signals(session, payload.pendingSignalIds)
    combined = {row.signal.id: row for row in base_signals}
    for row in pending:
        combined[row.signal.id] = row
    after_signals = list(combined.values())

    before_tasks = score_tasks(session, profile.selections, profile.scenario, base_signals)
    after_tasks = score_tasks(session, profile.selections, profile.scenario, after_signals)

    before_exposure = role_exposure(before_tasks)
    after_exposure = role_exposure(after_tasks)
    before_by_id = {task.id: task for task in before_tasks}
    changed = [
        ChangedTask(
            taskId=task.id,
            name=task.name,
            before=before_by_id[task.id].exposure,
            after=task.exposure,
        )
        for task in after_tasks
        if task.id in before_by_id
        and abs(task.exposure - before_by_id[task.id].exposure) > 0.0005
    ]

    return RecomputeResponse(
        before=RecomputeSide(
            roleExposure=round(before_exposure, 6),
            tasks=before_tasks,
        ),
        after=RecomputeSide(
            roleExposure=round(after_exposure, 6),
            tasks=after_tasks,
        ),
        delta=round(after_exposure - before_exposure, 6),
        changed=changed,
    )
