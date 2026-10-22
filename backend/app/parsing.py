"""Request parsing and opaque-id helpers.

Mirrors ``pivott-web-application-design/lib/api.ts`` so validation errors and
pathway ids behave the same way as the Next.js implementation.
"""

from __future__ import annotations

import base64
import json
import math
from typing import Any

from fastapi import Request

from app.seed import ROLE_BY_ID, SKILL_BY_ID, TASK_BY_ID


class ProfileError(ValueError):
    """Raised when a profile payload does not match the frontend contract."""


def js_round(value: float) -> int:
    """JavaScript Math.round semantics (half rounds toward +infinity)."""
    return math.floor(value + 0.5)


def _number(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(number):
        return 0.0
    return number


def parse_profile(body: Any) -> dict[str, Any]:
    if not isinstance(body, dict):
        raise ProfileError("Body must be a JSON object")

    role_id = body.get("roleId")
    if not isinstance(role_id, str) or role_id not in ROLE_BY_ID:
        raise ProfileError("Unknown roleId")

    raw_selections = body.get("selections")
    selections: list[dict[str, Any]] = []
    if isinstance(raw_selections, list):
        for item in raw_selections:
            if not isinstance(item, dict):
                continue
            task_id = item.get("taskId")
            if not isinstance(task_id, str) or task_id not in TASK_BY_ID:
                continue
            share = max(0.0, min(100.0, _number(item.get("share"))))
            selections.append({"taskId": task_id, "share": share})
            if len(selections) >= 20:
                break

    levels: dict[str, int] = {}
    raw_skills = body.get("skills")
    if isinstance(raw_skills, dict):
        for key, value in raw_skills.items():
            if key not in SKILL_BY_ID:
                continue
            levels[key] = max(0, min(4, js_round(_number(value))))

    scenario = "fast" if body.get("scenario") == "fast" else "normal"

    hours_raw = _number(body.get("hoursPerWeek"))
    if hours_raw == 0:
        hours_raw = 6.0
    hours_per_week = max(1, min(40, js_round(hours_raw)))

    target = body.get("targetRoleId")
    target_role_id = target if isinstance(target, str) and target in ROLE_BY_ID else None

    profile = {
        "roleId": role_id,
        "selections": selections,
        "skills": levels,
        "scenario": scenario,
        "hoursPerWeek": hours_per_week,
        "freeOnly": body.get("freeOnly") is True,
    }
    if target_role_id is not None:
        profile["targetRoleId"] = target_role_id
    return profile


async def read_json(request: Request) -> Any:
    try:
        return await request.json()
    except Exception:  # noqa: BLE001 - malformed JSON maps to the frontend's 400
        return None


def encode_id(payload: Any) -> str:
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_id(value: str) -> dict[str, Any] | None:
    try:
        padded = value + "=" * (-len(value) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
        payload = json.loads(raw)
    except Exception:  # noqa: BLE001 - any invalid id is a 404
        return None
    return payload if isinstance(payload, dict) else None
