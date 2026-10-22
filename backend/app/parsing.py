"""Request parsing and opaque-id helpers.

Mirrors ``pivott-web-application-design/lib/api.ts`` so validation errors and
pathway ids behave the same way as the Next.js implementation.
"""

from __future__ import annotations

import base64
import json
import math
import re
from datetime import date
from urllib.parse import urlsplit
from typing import Any

from fastapi import Request

from app.seed import DATA_AS_OF, ROLE_BY_ID, SKILL_BY_ID, TASK_BY_ID


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


def _text(value: Any, limit: int) -> str:
    return value.strip()[:limit] if isinstance(value, str) else ""


def _finite(value: Any) -> bool:
    return type(value) in (int, float) and math.isfinite(value)


def _parse_custom_inputs(body: dict) -> tuple[list[dict], list[dict]]:
    tasks: list[dict] = []
    signals: list[dict] = []
    task_ids = set(TASK_BY_ID)
    signal_ids: set[str] = set()
    raw_tasks = body.get("customTasks", [])
    if not isinstance(raw_tasks, list) or len(raw_tasks) > 100:
        raise ProfileError("customTasks must be an array of at most 100 tasks")
    for task in raw_tasks:
        if not isinstance(task, dict) or not isinstance(task.get("id"), str) or not re.fullmatch(r"custom-[A-Za-z0-9_-]{1,64}", task["id"]) or task["id"] in task_ids:
            raise ProfileError("Invalid or duplicate custom task id")
        name = _text(task.get("name"), 60)
        if not name or not isinstance(task.get("skills"), list) or not _finite(task.get("baseExposure")) or not _finite(task.get("humanJudgment")):
            raise ProfileError("Invalid custom task")
        tasks.append({
            "id": task["id"], "name": name,
            "skills": list(dict.fromkeys(skill for skill in task["skills"] if isinstance(skill, str) and skill in SKILL_BY_ID)),
            "baseExposure": max(0, min(1, task["baseExposure"])),
            "humanJudgment": max(0, min(1, task["humanJudgment"])),
        })
        task_ids.add(task["id"])

    raw_signals = body.get("customSignals", [])
    if not isinstance(raw_signals, list) or len(raw_signals) > 100:
        raise ProfileError("customSignals must be an array of at most 100 signals")
    for signal in raw_signals:
        if not isinstance(signal, dict) or not isinstance(signal.get("id"), str) or not re.fullmatch(r"user-[A-Za-z0-9_-]{1,64}", signal["id"]) or signal["id"] in signal_ids:
            raise ProfileError("Invalid or duplicate custom signal id")
        headline = _text(signal.get("headline"), 140)
        source_name = _text(signal.get("sourceName"), 60)
        source_url = _text(signal.get("sourceUrl"), 2048)
        valid_url = False
        try:
            url = urlsplit(source_url)
            valid_url = url.scheme == "https" and "." in (url.hostname or "") and not url.username and not url.password
        except ValueError:
            pass
        signal_date = _text(signal.get("date"), 32)
        valid_date = False
        try:
            valid_date = bool(re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", signal_date)) and date.fromisoformat(signal_date).isoformat() == signal_date and signal_date <= DATA_AS_OF
        except ValueError:
            pass
        if len(headline) < 8 or not source_name or not valid_url or not valid_date or not _finite(signal.get("direction")) or signal["direction"] not in (1, -1) or not _finite(signal.get("strength")) or not isinstance(signal.get("impacts"), list) or not 1 <= len(signal["impacts"]) <= 100:
            raise ProfileError("Invalid custom signal")
        impacts = []
        affected: set[str] = set()
        for item in signal["impacts"]:
            if not isinstance(item, dict) or not isinstance(item.get("taskId"), str) or item["taskId"] not in task_ids or item["taskId"] in affected or not _finite(item.get("impact")):
                raise ProfileError("Invalid custom signal impact")
            impacts.append({"taskId": item["taskId"], "impact": js_round(max(0.05, min(0.4, item["impact"])) * 100) / 100})
            affected.add(item["taskId"])
        signals.append({
            "id": signal["id"], "date": signal_date, "headline": headline,
            "sourceName": source_name, "sourceUrl": source_url, "direction": signal["direction"],
            "strength": js_round(max(0.1, min(1, signal["strength"])) * 100) / 100,
            "impacts": impacts, "explanation": _text(signal.get("explanation"), 200) or "Added manually by an admin.",
            "evidence": "user",
        })
        signal_ids.add(signal["id"])
    return tasks, signals


def parse_profile(body: Any) -> dict[str, Any]:
    if not isinstance(body, dict):
        raise ProfileError("Body must be a JSON object")

    role_id = body.get("roleId")
    if not isinstance(role_id, str) or role_id not in ROLE_BY_ID:
        raise ProfileError("Unknown roleId")

    custom_tasks, custom_signals = _parse_custom_inputs(body)
    task_ids = set(TASK_BY_ID) | {task["id"] for task in custom_tasks}
    raw_selections = body.get("selections")
    selections: list[dict[str, Any]] = []
    if isinstance(raw_selections, list):
        for item in raw_selections:
            if not isinstance(item, dict):
                continue
            task_id = item.get("taskId")
            if not isinstance(task_id, str) or task_id not in task_ids:
                continue
            share = max(0.0, min(100.0, _number(item.get("share"))))
            selections.append({"taskId": task_id, "share": share})
            if len(selections) >= 100:
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
    if "customTasks" in body:
        profile["customTasks"] = custom_tasks
    if "customSignals" in body:
        profile["customSignals"] = custom_signals
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
