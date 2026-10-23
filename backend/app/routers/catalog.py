"""System/seed and catalog endpoints used by the demo."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app import runtime
from app.config import allow_demo_reset, is_demo
from app.db import get_session
from app.models import Role
from app.schemas import (
    RoleTasksResponse,
    SDGsResponse,
    SeedResetResponse,
    Selection,
)
from app.seed import reset_and_seed
from app.services.catalog import (
    demo_persona,
    list_sdgs,
    seed_payload,
    serialize_role,
    tasks_for_role,
)
from app.services.exposure import load_signals, role_exposure, score_tasks

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/seed")
def get_seed(session: Session = Depends(get_session)) -> dict:
    """Full versioned dataset: 6 roles, 31 tasks, 15 skills, 20 signals, 24 resources."""
    return seed_payload(session)


@router.post("/seed", response_model=SeedResetResponse)
def reset_seed() -> SeedResetResponse:
    """Reset the demo dataset (removes user-added signals).

    Only a demo process may reset, and only when ``ALLOW_DEMO_RESET`` is not
    false. A live process has no demo dataset to reset.
    """
    if not is_demo():
        raise HTTPException(
            status_code=403, detail="Demo reset is only available in demo mode"
        )
    if not allow_demo_reset():
        raise HTTPException(status_code=403, detail="Demo reset is disabled")
    reset_and_seed()
    return SeedResetResponse(
        reset=True,
        version=runtime.seed_version(),
        demoPersona=demo_persona(),
    )


@router.get("/roles/{role_id}/tasks", response_model=RoleTasksResponse)
def role_tasks(
    role_id: str,
    scenario: str = Query(default="normal", description="normal or fast"),
    session: Session = Depends(get_session),
) -> RoleTasksResponse:
    role = session.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    scenario_id = "fast" if scenario == "fast" else "normal"
    tasks = tasks_for_role(session, role.id)
    selections = [
        Selection(taskId=task.id, share=task.default_share) for task in tasks
    ]
    lookup = {task.id: task for task in tasks}
    signals = load_signals(session)
    scored = score_tasks(
        session,
        selections,
        scenario_id,
        signals,
        task_lookup=lookup,
    )
    return RoleTasksResponse(
        role=serialize_role(session, role),
        scenario=scenario_id,
        roleExposure=round(role_exposure(scored), 6),
        tasks=scored,
    )


@router.get("/sdgs", response_model=SDGsResponse)
def sdgs(session: Session = Depends(get_session)) -> SDGsResponse:
    return SDGsResponse(sdgs=list_sdgs(session))
