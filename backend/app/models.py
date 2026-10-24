"""Database tables for the Pivott catalogue.

The schema mirrors ``docs/data-model.md``: 12 catalogue/signal tables plus a
``meta`` table that marks which dataset the database holds (demo or live).
``profiles`` is the optional signed-in user's saved state: one row per Supabase
``auth.users`` id, written only by the authenticated ``/api/me/profile`` routes.

Keep the public API in camelCase (``schemas.py``); this module is the internal
snake_case storage layer.
"""

from __future__ import annotations

from datetime import date as date_type
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Index, Uuid, func
from sqlmodel import Field, SQLModel


class Skill(SQLModel, table=True):
    __tablename__ = "skills"

    id: str = Field(primary_key=True)
    name: str
    category: str
    sdgs: list[int] = Field(default_factory=list, sa_column=Column(JSON))
    hours_per_level: int = Field(ge=1)
    deliverable: str
    why: str
    sort_order: int = Field(default=0, ge=0)


# Case-insensitive uniqueness for skills.name. Keep the name and expression in
# sync with supabase/migrations/202610221930_skill_name_unique.sql.
Index("skills_name_key", func.lower(Skill.__table__.c.name), unique=True)


class Role(SQLModel, table=True):
    __tablename__ = "roles"

    id: str = Field(primary_key=True)
    title: str
    family: str
    demand: int = Field(ge=0, le=100)
    sort_order: int = Field(default=0, ge=0)


class SDG(SQLModel, table=True):
    __tablename__ = "sdgs"

    id: int = Field(primary_key=True)
    name: str
    color: str
    sort_order: int = Field(default=0, ge=0)


class RoleSDG(SQLModel, table=True):
    __tablename__ = "role_sdgs"

    role_id: str = Field(foreign_key="roles.id", primary_key=True)
    sdg_id: int = Field(foreign_key="sdgs.id", primary_key=True)
    position: int = Field(default=0, ge=0)


class RoleRequirement(SQLModel, table=True):
    __tablename__ = "role_requirements"

    role_id: str = Field(foreign_key="roles.id", primary_key=True)
    skill_id: str = Field(foreign_key="skills.id", primary_key=True)
    required_level: int = Field(ge=1, le=4)
    importance: int = Field(ge=1, le=5)
    position: int = Field(default=0, ge=0)


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: str = Field(primary_key=True)
    role_id: str = Field(foreign_key="roles.id", index=True)
    name: str
    description: str
    base_exposure: float = Field(ge=0.0, le=1.0)
    human_judgment: float = Field(ge=0.0, le=1.0)
    default_share: int = Field(ge=1, le=100)
    try_this_week: str
    sort_order: int = Field(default=0, ge=0)


class TaskSkill(SQLModel, table=True):
    __tablename__ = "task_skills"

    task_id: str = Field(foreign_key="tasks.id", primary_key=True)
    skill_id: str = Field(foreign_key="skills.id", primary_key=True)
    position: int = Field(default=0, ge=0)


class Scenario(SQLModel, table=True):
    __tablename__ = "scenarios"

    id: str = Field(primary_key=True)
    label: str
    multiplier: float = Field(gt=0.0)
    description: str


class Signal(SQLModel, table=True):
    __tablename__ = "signals"

    id: str = Field(primary_key=True)
    date: date_type = Field(index=True)
    headline: str
    source_name: str
    source_url: str
    direction: int = Field(description="+1 raises exposure, -1 lowers exposure")
    strength: float = Field(ge=0.0, le=1.0)
    explanation: str
    evidence: str = Field(index=True, description="verified / illustrative / user")


class SignalTaskImpact(SQLModel, table=True):
    __tablename__ = "signal_task_impacts"

    signal_id: str = Field(foreign_key="signals.id", primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", primary_key=True)
    impact: float = Field(ge=0.0, le=0.4)


class Resource(SQLModel, table=True):
    __tablename__ = "resources"

    id: str = Field(primary_key=True)
    skill_id: str = Field(foreign_key="skills.id", index=True)
    title: str
    provider: str
    url: str
    free: bool = Field(default=True)
    sort_order: int = Field(default=0, ge=0)


class JobPosting(SQLModel, table=True):
    """A live job posting matched to a role (empty in the demo dataset).

    The row keeps a sample of the postings behind a role's ``demand`` score so
    the API can show the real openings, their company and their link instead of
    an unexplained number.
    """

    __tablename__ = "job_postings"

    id: str = Field(primary_key=True)
    role_id: str = Field(foreign_key="roles.id", index=True)
    title: str
    company: str = ""
    location: str = ""
    url: str = ""
    posted_at: date_type = Field(index=True)
    remote: bool = Field(default=False)
    tags: str = ""
    matched_title: str = ""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Profile(SQLModel, table=True):
    """Saved state for one signed-in Supabase user.

    ``user_id`` is the ``sub`` claim of the access token and, on Supabase, a
    foreign key to ``auth.users(id)`` with ``on delete cascade`` (see
    ``supabase/migrations/202610231200_profiles.sql``). The local SQLite schema
    has no ``auth`` schema, so the foreign key exists only in the Supabase DDL.

    Task shares, skill levels and the demo's custom signals/tasks are JSON
    documents: the backend only needs the exact input to recompute the
    deterministic analysis, and a single-row read keeps the endpoint simple.
    """

    __tablename__ = "profiles"

    # ``Uuid(as_uuid=False)`` keeps the Python side a plain string (the JWT
    # ``sub``) while PostgreSQL binds it as a real uuid. A plain String column
    # would compile to VARCHAR and fail on ``profiles.user_id = $1::VARCHAR``.
    user_id: str = Field(
        sa_column=Column(Uuid(as_uuid=False), primary_key=True, nullable=False)
    )
    email: str | None = Field(default=None, max_length=320)
    name: str = Field(default="", max_length=80)
    role_id: str = Field(foreign_key="roles.id")
    scenario: str = Field(default="normal")
    hours_per_week: int = Field(default=6, ge=1, le=40)
    free_only: bool = Field(default=False)
    target_role_id: str | None = Field(default=None, foreign_key="roles.id")
    selections: list[dict[str, Any]] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    skills: dict[str, int] = Field(
        default_factory=dict, sa_column=Column(JSON, nullable=False)
    )
    completed_steps: list[str] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    custom_tasks: list[dict[str, Any]] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    custom_signals: list[dict[str, Any]] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False)
    )
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class Meta(SQLModel, table=True):
    """Dataset-level key/value rows (dataset marker, seed version, as-of date).

    The ``dataset`` row is the guard rail: a process refuses to start when the
    database says ``live`` but the process was configured as ``demo`` (and vice
    versa), so the synthetic seed can never be written into the live database.
    """

    __tablename__ = "meta"

    key: str = Field(primary_key=True)
    value: str
