"""Process-level dataset metadata loaded from the ``meta`` table.

The scoring formulas need ``data_as_of`` and the API reports ``seedVersion``.
Both belong to the dataset, not to the process, so they are read from ``meta``
once at startup. Until then the config fallbacks (demo defaults) apply.
"""

from __future__ import annotations

import json
from datetime import date

from sqlmodel import Session, select

from app import config
from app.models import Meta

_as_of: date = date.fromisoformat(config.DATA_AS_OF)
_seed_version: str = config.SEED_VERSION
_demo_persona: dict | None = None


def configure(
    *,
    data_as_of: str | None = None,
    seed_version: str | None = None,
    demo_persona: dict | None = None,
) -> None:
    """Override the runtime metadata (called at startup and after a reset)."""
    global _as_of, _seed_version, _demo_persona
    if data_as_of:
        try:
            _as_of = date.fromisoformat(data_as_of)
        except ValueError:
            _as_of = date.fromisoformat(config.DATA_AS_OF)
    else:
        _as_of = date.fromisoformat(config.DATA_AS_OF)
    _seed_version = seed_version or config.SEED_VERSION
    _demo_persona = demo_persona


def configure_from_session(session: Session) -> None:
    rows = {row.key: row.value for row in session.exec(select(Meta)).all()}
    persona: dict | None = None
    raw_persona = rows.get("demo_persona")
    if raw_persona:
        try:
            loaded = json.loads(raw_persona)
        except json.JSONDecodeError:
            loaded = None
        if isinstance(loaded, dict):
            persona = loaded
    configure(
        data_as_of=rows.get("data_as_of"),
        seed_version=rows.get("seed_version"),
        demo_persona=persona,
    )


def as_of_date() -> date:
    return _as_of


def as_of_iso() -> str:
    return _as_of.isoformat()


def seed_version() -> str:
    return _seed_version


def demo_persona() -> dict | None:
    return dict(_demo_persona) if _demo_persona is not None else None
