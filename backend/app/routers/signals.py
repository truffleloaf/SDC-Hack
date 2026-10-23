"""Signal timeline and demo signal creation."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app import runtime
from app.db import get_session
from app.models import Signal, SignalTaskImpact, Task
from app.schemas import SignalCreate, SignalRead, SignalsResponse
from app.services.catalog import get_signal, list_signals

router = APIRouter(prefix="/api/signals", tags=["signals"])


@router.get("", response_model=SignalsResponse)
def list_signal_timeline(session: Session = Depends(get_session)) -> SignalsResponse:
    signals = list_signals(session, include_user=True)
    return SignalsResponse(
        asOf=runtime.as_of_iso(),
        count=len(signals),
        signals=signals,
    )


@router.post("", response_model=SignalRead, status_code=status.HTTP_201_CREATED)
def create_signal(
    payload: SignalCreate,
    session: Session = Depends(get_session),
) -> SignalRead:
    """Add an ``evidence = "user"`` signal. Pending until recompute."""
    as_of = runtime.as_of_date()
    if payload.date > as_of:
        raise HTTPException(status_code=400, detail="date cannot be after dataAsOf")

    headline = payload.headline.strip()
    if not 8 <= len(headline) <= 140:
        raise HTTPException(status_code=400, detail="headline must be 8-140 characters")

    source_name = payload.sourceName.strip()
    if not 1 <= len(source_name) <= 60:
        raise HTTPException(status_code=400, detail="sourceName must be 1-60 characters")

    source_url = payload.sourceUrl.strip()
    if not source_url.startswith("https://") or "." not in source_url[8:]:
        raise HTTPException(status_code=400, detail="sourceUrl must be a full https:// link")

    if payload.direction not in (-1, 1):
        raise HTTPException(status_code=400, detail="direction must be +1 or -1")
    if not 0.1 <= payload.strength <= 1.0:
        raise HTTPException(status_code=400, detail="strength must be between 0.1 and 1")
    if not payload.impacts:
        raise HTTPException(status_code=400, detail="select at least one task")

    seen: set[str] = set()
    impacts: list[tuple[str, float]] = []
    for impact in payload.impacts:
        if impact.taskId in seen:
            continue
        seen.add(impact.taskId)
        if session.get(Task, impact.taskId) is None:
            raise HTTPException(status_code=400, detail=f"Unknown taskId: {impact.taskId}")
        if not 0.0 < impact.impact <= 0.4:
            raise HTTPException(status_code=400, detail="impact must be between 0 and 0.4")
        impacts.append((impact.taskId, impact.impact))

    signal_id = f"user-{uuid4().hex[:8]}"
    signal = Signal(
        id=signal_id,
        date=payload.date,
        headline=headline,
        source_name=source_name,
        source_url=source_url,
        direction=payload.direction,
        strength=payload.strength,
        explanation=(payload.explanation.strip()[:200] or "Added manually by an admin."),
        evidence="user",
    )
    session.add(signal)
    session.flush()
    for task_id, impact in impacts:
        session.add(
            SignalTaskImpact(
                signal_id=signal_id,
                task_id=task_id,
                impact=impact,
            )
        )
    session.commit()

    created = get_signal(session, signal_id)
    if created is None:
        raise HTTPException(status_code=500, detail="signal was not stored")
    return created
