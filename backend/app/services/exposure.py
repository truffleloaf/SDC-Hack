"""Deterministic exposure scoring.

Mirrors ``lib/engine.ts`` from the frontend demo:

    recency           = 0.5 ^ (age_days / 180)
    signal_adjustment = clamp(Σ(strength × direction × recency × impact), -0.2, 0.2)
    exposure          = clamp(base_exposure × scenario.multiplier + adjustment, 0, 1)
    role_exposure     = Σ(time_share × exposure)

Exposure is always computed on read; nothing is cached.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date as date_type
from typing import Iterable, Sequence

from sqlmodel import Session, select

from app import runtime
from app.config import (
    AUTOMATE_EXPOSURE,
    AUTOMATE_JUDGMENT,
    CONFIDENCE_HIGH_COVERAGE,
    CONFIDENCE_HIGH_VERIFIED,
    CONFIDENCE_MEDIUM_COVERAGE,
    HALF_LIFE_DAYS,
    MAX_SIGNAL_ADJUSTMENT,
    PROTECT_JUDGMENT,
)
from app.models import Scenario, Signal, SignalTaskImpact, Task
from app.schemas import ScoredTask, Selection
from app.services.catalog import task_skills_map, tasks_for_role


@dataclass(frozen=True)
class LoadedSignal:
    signal: Signal
    impacts: list[SignalTaskImpact]


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def as_of_date() -> date_type:
    return runtime.as_of_date()


def age_days(published_at: date_type, as_of: date_type | None = None) -> int:
    return max(0, ((as_of or as_of_date()) - published_at).days)


def recency(published_at: date_type, as_of: date_type | None = None) -> float:
    return 0.5 ** (age_days(published_at, as_of) / HALF_LIFE_DAYS)


def normalize_shares(
    selections: Sequence[Selection],
) -> list[Selection]:
    """Normalise arbitrary non-negative weights to fractions summing to 1."""
    total = sum(max(0.0, item.share) for item in selections)
    if total <= 0:
        if not selections:
            return []
        equal = 1.0 / len(selections)
        return [Selection(taskId=item.taskId, share=equal) for item in selections]
    return [
        Selection(taskId=item.taskId, share=max(0.0, item.share) / total)
        for item in selections
    ]


def get_scenario(session: Session, scenario_id: str) -> Scenario:
    wanted = scenario_id if scenario_id in {"slow", "normal", "fast"} else "normal"
    scenario = session.get(Scenario, wanted)
    if scenario is None:
        raise ValueError(f"Unknown scenario: {scenario_id}")
    return scenario


def load_signals(
    session: Session,
    signal_ids: Iterable[str] | None = None,
    *,
    include_user: bool = False,
) -> list[LoadedSignal]:
    """Load signals and their task impacts.

    By default only seed signals are used for analysis, matching the demo where
    a newly added signal is pending until ``recompute`` applies it. Pass
    ``signal_ids`` to load a specific set (seed or user).
    """
    query = select(Signal)
    if signal_ids is not None:
        ids = list(signal_ids)
        if not ids:
            return []
        query = query.where(Signal.id.in_(ids))
    elif not include_user:
        query = query.where(Signal.evidence != "user")

    signals = session.exec(query).all()
    if not signals:
        return []

    impacts = session.exec(
        select(SignalTaskImpact).where(
            SignalTaskImpact.signal_id.in_([row.id for row in signals])
        )
    ).all()
    grouped: dict[str, list[SignalTaskImpact]] = {}
    for impact in impacts:
        grouped.setdefault(impact.signal_id, []).append(impact)

    return [
        LoadedSignal(signal=row, impacts=grouped.get(row.id, []))
        for row in signals
    ]


def signal_weight(signal: Signal) -> float:
    if signal.evidence in {"assumption", "illustrative"}:
        from app.reference_seed import SIGNALS
        original = next((s for s in SIGNALS if s['id'] == signal.id), {})
        return original.get('assumptionWeight', signal.strength)
    return signal.strength * recency(signal.date)


def signal_adjustment(task_id: str, signals: Sequence[LoadedSignal]) -> float:
    adjustment = 0.0
    as_of = as_of_date()
    for loaded in signals:
        for impact in loaded.impacts:
            if impact.task_id != task_id:
                continue
            adjustment += (
                signal_weight(loaded.signal)
                * loaded.signal.direction
                * impact.impact
            )
    return clamp(adjustment, -MAX_SIGNAL_ADJUSTMENT, MAX_SIGNAL_ADJUSTMENT)


def task_exposure(base_exposure: float, multiplier: float, adjustment: float) -> float:
    return clamp(base_exposure * multiplier + adjustment, 0.0, 1.0)


def classify(exposure: float, human_judgment: float) -> str:
    if exposure >= AUTOMATE_EXPOSURE and human_judgment < AUTOMATE_JUDGMENT:
        return "Automate"
    if human_judgment >= PROTECT_JUDGMENT:
        return "Protect"
    return "Augment"


def role_exposure(tasks: Sequence[ScoredTask]) -> float:
    return sum(task.share * task.exposure for task in tasks)


def score_tasks(
    session: Session,
    selections: Sequence[Selection],
    scenario_id: str,
    signals: Sequence[LoadedSignal],
    task_lookup: dict[str, Task] | None = None,
) -> list[ScoredTask]:
    scenario = get_scenario(session, scenario_id)
    if task_lookup is None:
        task_lookup = {task.id: task for task in session.exec(select(Task)).all()}

    normalized = normalize_shares(
        [item for item in selections if item.taskId in task_lookup]
    )
    skills_by_task = task_skills_map(session, [item.taskId for item in normalized])
    scored: list[ScoredTask] = []
    for item in normalized:
        task = task_lookup[item.taskId]
        adjustment = signal_adjustment(task.id, signals)
        exposure = task_exposure(task.base_exposure, scenario.multiplier, adjustment)
        scored.append(
            ScoredTask(
                id=task.id,
                name=task.name,
                description=task.description,
                share=round(item.share, 6),
                baseExposure=task.base_exposure,
                adjustment=round(adjustment, 6),
                exposure=round(exposure, 6),
                humanJudgment=task.human_judgment,
                classification=classify(exposure, task.human_judgment),  # type: ignore[arg-type]
                skills=skills_by_task.get(task.id, []),
                tryThisWeek=task.try_this_week,
                custom=False,
            )
        )
    return scored


def target_role_exposure(
    session: Session,
    role_id: str,
    scenario_id: str,
    signals: Sequence[LoadedSignal],
) -> float:
    tasks = tasks_for_role(session, role_id)
    selections = [Selection(taskId=task.id, share=task.default_share) for task in tasks]
    lookup = {task.id: task for task in tasks}
    scored = score_tasks(session, selections, scenario_id, signals, task_lookup=lookup)
    return role_exposure(scored)


def confidence(tasks: Sequence[ScoredTask], signals: Sequence[LoadedSignal]) -> str:
    """Evidence confidence, not certainty about outcomes."""
    task_ids = {task.id for task in tasks}
    covered = sum(
        task.share
        for task in tasks
        if any(impact.task_id == task.id for loaded in signals for impact in loaded.impacts)
    )

    total_weight = 0.0
    verified_weight = 0.0
    as_of = as_of_date()
    for loaded in signals:
        for impact in loaded.impacts:
            if impact.task_id not in task_ids:
                continue
            weight = (
                signal_weight(loaded.signal)
                * impact.impact
            )
            total_weight += weight
            if loaded.signal.evidence == "verified":
                verified_weight += weight

    verified_share = verified_weight / total_weight if total_weight else 0.0
    if covered >= CONFIDENCE_HIGH_COVERAGE and verified_share >= CONFIDENCE_HIGH_VERIFIED:
        return "High"
    if covered >= CONFIDENCE_MEDIUM_COVERAGE:
        return "Medium"
    return "Low"
