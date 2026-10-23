"""Profile parsing and shareable base64url ids.

Mirrors the frontend ``parseProfile``:

- ``roleId`` is the only hard requirement (400 when unknown).
- unknown selections/skills are silently dropped;
- shares are clamped to 0..100 and at most 20 selections are kept;
- skill levels are clamped to 0..4;
- anything other than ``scenario == "fast"`` becomes ``normal``;
- ``hoursPerWeek`` defaults to 6 and is clamped to 1..40;
- ``targetRoleId`` is dropped when unknown.
"""

from __future__ import annotations

import base64
import json
from typing import Any

from sqlmodel import Session, select

from app.config import (
    DEFAULT_HOURS_PER_WEEK,
    MAX_HOURS_PER_WEEK,
    MAX_SELECTIONS,
    MAX_SKILL_LEVEL,
    MIN_HOURS_PER_WEEK,
)
from app.models import Role, Skill, Task
from app.schemas import NormalizedProfile, ProfileInput, Selection


class ProfileError(ValueError):
    """Raised when a hard profile field is invalid."""


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if number != number:  # NaN
        return default
    return number


def _round_half_up(value: float) -> int:
    return int(value + 0.5) if value >= 0 else int(value - 0.5)


def normalize_profile(session: Session, payload: ProfileInput) -> NormalizedProfile:
    role = session.get(Role, payload.roleId)
    if role is None:
        raise ProfileError("Unknown roleId")

    allowed_tasks = {row.id for row in session.exec(select(Task)).all()}
    allowed_skills = {row.id for row in session.exec(select(Skill)).all()}

    selections: list[Selection] = []
    for raw in payload.selections:
        if not isinstance(raw, dict):
            continue
        task_id = raw.get("taskId")
        if not isinstance(task_id, str) or task_id not in allowed_tasks:
            continue
        share = _as_float(raw.get("share", 0))
        selections.append(
            Selection(taskId=task_id, share=max(0.0, min(100.0, share)))
        )
        if len(selections) >= MAX_SELECTIONS:
            break

    skills: dict[str, int] = {}
    for skill_id, raw_level in payload.skills.items():
        if skill_id not in allowed_skills:
            continue
        level = _round_half_up(_as_float(raw_level, 0))
        skills[skill_id] = max(0, min(MAX_SKILL_LEVEL, level))

    hours = _round_half_up(_as_float(payload.hoursPerWeek, DEFAULT_HOURS_PER_WEEK))
    hours = max(MIN_HOURS_PER_WEEK, min(MAX_HOURS_PER_WEEK, hours))

    scenario = "fast" if payload.scenario == "fast" else "normal"

    target_role_id = payload.targetRoleId
    if target_role_id is not None and session.get(Role, target_role_id) is None:
        target_role_id = None

    return NormalizedProfile(
        roleId=role.id,
        selections=selections,
        skills=skills,
        scenario=scenario,
        hoursPerWeek=hours,
        freeOnly=payload.freeOnly is True,
        targetRoleId=target_role_id,
    )


def sanitize_levels(session: Session, raw: Any) -> dict[str, int]:
    allowed = {row.id for row in session.exec(select(Skill)).all()}
    levels: dict[str, int] = {}
    if not isinstance(raw, dict):
        return levels
    for skill_id, value in raw.items():
        if skill_id not in allowed:
            continue
        level = _round_half_up(_as_float(value, 0))
        levels[skill_id] = max(0, min(MAX_SKILL_LEVEL, level))
    return levels


def sanitize_hours(value: Any) -> int:
    hours = _round_half_up(_as_float(value, DEFAULT_HOURS_PER_WEEK))
    return max(MIN_HOURS_PER_WEEK, min(MAX_HOURS_PER_WEEK, hours))


def encode_id(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")


def decode_id(value: str) -> dict[str, Any] | None:
    try:
        padded = value + "=" * (-len(value) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
        decoded = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    return decoded if isinstance(decoded, dict) else None
