"""Persistence for one signed-in user's profile and demo UI state.

The scoring engine stays stateless: this module only stores the exact input the
frontend sent (normalised against the current catalogue) plus the pieces the
demo used to keep in ``localStorage``. Analysis and pathways are still
recomputed from the catalogue on every request, so saved results can never go
stale when the scoring rules change.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session

from app.auth import AuthUser
from app.models import Profile
from app.schemas import SavedProfileInput, SavedProfileResponse, Selection
from app.services.profile import ProfileError, normalize_profile

#: Defensive caps for JSON sent by the browser.
MAX_COMPLETED_STEPS = 200
MAX_CUSTOM_TASKS = 50
MAX_CUSTOM_SIGNALS = 100
MAX_CUSTOM_ITEM_BYTES = 4_000
MAX_CUSTOM_TOTAL_BYTES = 32_000


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime:
    if value is None:
        return _now()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clean_name(value: str) -> str:
    return value.strip()[:80]


def _clean_completed_steps(values: list[str]) -> list[str]:
    steps: list[str] = []
    seen: set[str] = set()
    for raw in values:
        if not isinstance(raw, str):
            continue
        step = raw.strip()[:120]
        if not step or step in seen:
            continue
        seen.add(step)
        steps.append(step)
        if len(steps) >= MAX_COMPLETED_STEPS:
            break
    return steps


def _json_bytes(value: Any) -> int:
    try:
        encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    except (TypeError, ValueError) as exc:
        raise ProfileError("Custom data must be JSON-serialisable") from exc
    return len(encoded.encode("utf-8"))


def _clean_custom(
    values: list[dict[str, Any]],
    *,
    label: str,
    limit: int,
) -> list[dict[str, Any]]:
    """Keep custom JSON items, but bound their number and size."""
    cleaned: list[dict[str, Any]] = []
    total = 0
    for item in values[:limit]:
        if not isinstance(item, dict):
            continue
        size = _json_bytes(item)
        if size > MAX_CUSTOM_ITEM_BYTES:
            raise ProfileError(f"Each {label} must be smaller than 4 KB")
        total += size
        if total > MAX_CUSTOM_TOTAL_BYTES:
            raise ProfileError(f"Saved {label} exceed 32 KB")
        cleaned.append(item)
    return cleaned


def get_profile(session: Session, user_id: str) -> Profile | None:
    return session.get(Profile, user_id)


def to_response(record: Profile) -> SavedProfileResponse:
    selections = [
        Selection.model_validate(item)
        for item in record.selections
        if isinstance(item, dict)
    ]
    scenario = record.scenario if record.scenario in {"normal", "fast"} else "normal"
    return SavedProfileResponse(
        userId=record.user_id,
        email=record.email,
        name=record.name,
        roleId=record.role_id,
        selections=selections,
        skills={str(key): int(value) for key, value in (record.skills or {}).items()},
        scenario=scenario,
        hoursPerWeek=record.hours_per_week,
        freeOnly=record.free_only,
        targetRoleId=record.target_role_id,
        completedSteps=list(record.completed_steps or []),
        customTasks=list(record.custom_tasks or []),
        customSignals=list(record.custom_signals or []),
        createdAt=_as_utc(record.created_at),
        updatedAt=_as_utc(record.updated_at),
    )


def upsert_profile(
    session: Session,
    user: AuthUser,
    payload: SavedProfileInput,
) -> SavedProfileResponse:
    """Create or replace the signed-in user's saved profile.

    ``user.id`` comes from the verified token, never from the request body, so
    a caller cannot write another user's row.
    """
    normalized = normalize_profile(session, payload)

    record = session.get(Profile, user.id)
    now = _now()
    if record is None:
        record = Profile(user_id=user.id, created_at=now)

    record.email = (user.email or "")[:320] or None
    record.name = _clean_name(payload.name)
    record.role_id = normalized.roleId
    record.scenario = normalized.scenario
    record.hours_per_week = normalized.hoursPerWeek
    record.free_only = normalized.freeOnly
    record.target_role_id = normalized.targetRoleId
    record.selections = [selection.model_dump() for selection in normalized.selections]
    record.skills = normalized.skills
    record.completed_steps = _clean_completed_steps(payload.completedSteps)
    record.custom_tasks = _clean_custom(
        payload.customTasks, label="custom task", limit=MAX_CUSTOM_TASKS
    )
    record.custom_signals = _clean_custom(
        payload.customSignals, label="custom signal", limit=MAX_CUSTOM_SIGNALS
    )
    record.updated_at = now

    session.add(record)
    session.commit()
    session.refresh(record)
    return to_response(record)


def delete_profile(session: Session, user_id: str) -> bool:
    """Delete the signed-in user's row; returns whether anything was deleted."""
    record = session.get(Profile, user_id)
    if record is None:
        return False
    session.delete(record)
    session.commit()
    return True
