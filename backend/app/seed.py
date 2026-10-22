"""Canonical Pivott seed data.

The JSON in ``app/data/seed.json`` is a 1:1 export of the frontend's
``pivott-web-application-design/lib/data/seed.ts``. It is the single source
of truth for this backend:

- 6 roles
- 31 tasks
- 15 skills
- 20 dated signals
- 4 SDGs
- 24 learning resources
- 2 scenarios
- the Aisyah demo persona

Do not hand-edit the JSON. Regenerate it from the frontend seed if the
frontend data changes.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_DATA_FILE = Path(__file__).resolve().parent / "data" / "seed.json"
_SEED: dict[str, Any] = json.loads(_DATA_FILE.read_text(encoding="utf-8"))

DATA_AS_OF: str = _SEED["DATA_AS_OF"]
SEED_VERSION: str = _SEED["SEED_VERSION"]

SCENARIOS: list[dict[str, Any]] = _SEED["scenarios"]
SDGS: list[dict[str, Any]] = _SEED["sdgs"]
SKILLS: list[dict[str, Any]] = _SEED["skills"]
ROLES: list[dict[str, Any]] = _SEED["roles"]
TASKS: list[dict[str, Any]] = _SEED["tasks"]
RESOURCES: list[dict[str, Any]] = _SEED["resources"]
SIGNALS: list[dict[str, Any]] = _SEED["signals"]
DEMO_PERSONA: dict[str, Any] = _SEED["demoPersona"]

SKILL_BY_ID: dict[str, dict[str, Any]] = {item["id"]: item for item in SKILLS}
ROLE_BY_ID: dict[str, dict[str, Any]] = {item["id"]: item for item in ROLES}
TASK_BY_ID: dict[str, dict[str, Any]] = {item["id"]: item for item in TASKS}

TASKS_BY_ROLE: dict[str, list[dict[str, Any]]] = {}
for _task in TASKS:
    TASKS_BY_ROLE.setdefault(_task["roleId"], []).append(_task)

SEED_PAYLOAD: dict[str, Any] = {
    "version": SEED_VERSION,
    "asOf": DATA_AS_OF,
    "roles": ROLES,
    "tasks": TASKS,
    "skills": SKILLS,
    "signals": SIGNALS,
    "resources": RESOURCES,
    "scenarios": SCENARIOS,
    "sdgs": SDGS,
    "demoPersona": DEMO_PERSONA,
}
