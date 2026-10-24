"""Read-model helpers: database rows → API-shaped camelCase objects.

Everything here is database-driven: display order comes from ``sort_order`` /
``position`` columns, task skills come from ``task_skills``, and role SDGs come
from ``role_sdgs``. No seed constants are imported, so the same code serves the
demo catalogue and the live catalogue.
"""

from __future__ import annotations

from datetime import date as date_type
from typing import Iterable, Optional

from sqlmodel import Session, select

from app import runtime
from app.config import HALF_LIFE_DAYS
from app.models import (
    Resource,
    Role,
    RoleRequirement,
    RoleSDG,
    Scenario,
    SDG,
    Signal,
    SignalTaskImpact,
    Skill,
    Task,
    TaskSkill,
)
from app.schemas import (
    DemoPersonaRead,
    ResourceRead,
    RoleRead,
    RoleRequirementRead,
    ScenarioRead,
    SDGRead,
    SignalImpactRead,
    SignalRead,
    SkillRead,
    TaskRead,
)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def recency_weight(published_at: date_type, as_of: date_type | None = None) -> float:
    as_of = as_of or runtime.as_of_date()
    age_days = max(0, (as_of - published_at).days)
    return 0.5 ** (age_days / HALF_LIFE_DAYS)


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------


def _catalog_order(model):
    return select(model).order_by(model.sort_order, model.id)


def list_skills(session: Session) -> list[Skill]:
    return list(session.exec(_catalog_order(Skill)).all())


def list_roles(session: Session) -> list[Role]:
    return list(session.exec(_catalog_order(Role)).all())


def list_tasks(session: Session) -> list[Task]:
    return list(session.exec(_catalog_order(Task)).all())


def tasks_for_role(session: Session, role_id: str) -> list[Task]:
    return [task for task in list_tasks(session) if task.role_id == role_id]


def requirements_for_role(session: Session, role_id: str) -> list[tuple[RoleRequirement, Skill]]:
    rows = session.exec(
        select(RoleRequirement, Skill)
        .join(Skill, RoleRequirement.skill_id == Skill.id)
        .where(RoleRequirement.role_id == role_id)
        .order_by(
            RoleRequirement.position,
            Skill.sort_order,
            Skill.id,
        )
    ).all()
    return list(rows)


def sdg_ids_for_role(session: Session, role_id: str) -> list[int]:
    rows = session.exec(
        select(RoleSDG)
        .where(RoleSDG.role_id == role_id)
        .order_by(RoleSDG.position, RoleSDG.sdg_id)
    ).all()
    return [row.sdg_id for row in rows]


def task_skill_ids(session: Session, task_id: str) -> list[str]:
    rows = session.exec(
        select(TaskSkill)
        .where(TaskSkill.task_id == task_id)
        .order_by(TaskSkill.position, TaskSkill.skill_id)
    ).all()
    return [row.skill_id for row in rows]


def task_skills_map(
    session: Session, task_ids: Iterable[str]
) -> dict[str, list[str]]:
    """Bulk variant of :func:`task_skill_ids` for scoring / seed payloads."""
    ids = list(task_ids)
    if not ids:
        return {}
    rows = session.exec(
        select(TaskSkill)
        .where(TaskSkill.task_id.in_(ids))
        .order_by(TaskSkill.task_id, TaskSkill.position, TaskSkill.skill_id)
    ).all()
    grouped: dict[str, list[str]] = {}
    for row in rows:
        grouped.setdefault(row.task_id, []).append(row.skill_id)
    return grouped


def skill_ids_for_role_tasks(session: Session, role_id: str) -> set[str]:
    task_ids = [task.id for task in tasks_for_role(session, role_id)]
    if not task_ids:
        return set()
    rows = session.exec(select(TaskSkill).where(TaskSkill.task_id.in_(task_ids))).all()
    return {row.skill_id for row in rows}


def serialize_skill(skill: Skill) -> SkillRead:
    from app.sdg import tags
    return SkillRead(
        sdgs=skill.sdgs or tags("skills", skill.id),
        id=skill.id,
        name=skill.name,
        category=skill.category,
        hoursPerLevel=skill.hours_per_level,
        deliverable=skill.deliverable,
    )


def serialize_task(
    session: Session, task: Task, skills: list[str] | None = None
) -> TaskRead:
    return TaskRead(
        id=task.id,
        roleId=task.role_id,
        name=task.name,
        description=task.description,
        baseExposure=task.base_exposure,
        humanJudgment=task.human_judgment,
        defaultShare=task.default_share,
        skills=skills if skills is not None else task_skill_ids(session, task.id),
        tryThisWeek=task.try_this_week,
    )


def serialize_role(session: Session, role: Role) -> RoleRead:
    requirements = [
        RoleRequirementRead(
            skillId=req.skill_id,
            requiredLevel=req.required_level,
            importance=req.importance,
        )
        for req, _skill in requirements_for_role(session, role.id)
    ]
    return RoleRead(
        id=role.id,
        title=role.title,
        family=role.family,
        demand=role.demand,
        sdgs=sdg_ids_for_role(session, role.id),
        requirements=requirements,
    )


def serialize_resource(resource: Resource) -> ResourceRead:
    return ResourceRead(
        id=resource.id,
        skillId=resource.skill_id,
        title=resource.title,
        provider=resource.provider,
        url=resource.url,
        free=resource.free,
    )


def serialize_scenario(scenario: Scenario) -> ScenarioRead:
    return ScenarioRead(
        id=scenario.id,
        label=scenario.label,
        multiplier=scenario.multiplier,
        description=scenario.description,
    )


def list_resources(session: Session) -> list[Resource]:
    return list(session.exec(_catalog_order(Resource)).all())


def list_scenarios(session: Session) -> list[Scenario]:
    rows = session.exec(select(Scenario)).all()
    return sorted(rows, key=lambda row: 0 if row.id == "normal" else 1)


def list_sdgs(session: Session) -> list[SDGRead]:
    rows = list(session.exec(_catalog_order(SDG)).all())
    roles = list(session.exec(_catalog_order(Role)).all())
    role_rank = {role.id: index for index, role in enumerate(roles)}

    links = session.exec(select(RoleSDG)).all()
    by_sdg: dict[int, list[str]] = {}
    for link in links:
        by_sdg.setdefault(link.sdg_id, []).append(link.role_id)
    return [
        SDGRead(
            id=row.id,
            name=row.name,
            color=row.color,
            roles=sorted(
                by_sdg.get(row.id, []),
                key=lambda role_id: role_rank.get(role_id, 999),
            ),
        )
        for row in rows
    ]


def demo_persona() -> DemoPersonaRead | None:
    persona = runtime.demo_persona()
    if not persona:
        return None
    return DemoPersonaRead(
        name=persona.get("name", ""),
        roleId=persona.get("role_id", ""),
        skills=dict(persona.get("skills", {})),
    )


# ---------------------------------------------------------------------------
# Signals
# ---------------------------------------------------------------------------


def _impacts_by_signal(
    session: Session, signal_ids: Iterable[str] | None = None
) -> dict[str, list[SignalTaskImpact]]:
    query = select(SignalTaskImpact).join(Task, SignalTaskImpact.task_id == Task.id)
    if signal_ids is not None:
        ids = list(signal_ids)
        if not ids:
            return {}
        query = query.where(SignalTaskImpact.signal_id.in_(ids))
    rows = session.exec(query.order_by(Task.sort_order, Task.id)).all()
    grouped: dict[str, list[SignalTaskImpact]] = {}
    for row in rows:
        grouped.setdefault(row.signal_id, []).append(row)
    return grouped


def serialize_signal(
    signal: Signal, impacts: list[SignalTaskImpact]
) -> SignalRead:
    assumption = signal.evidence in {"assumption", "illustrative"}
    from app.reference_seed import SIGNALS
    original = next((s for s in SIGNALS if s["id"] == signal.id), {}) if assumption else {}
    return SignalRead(
        id=signal.id,
        date=None if assumption else signal.date,
        headline=original.get("headline", signal.headline),
        sourceName=None if assumption else signal.source_name,
        sourceUrl=None if assumption else signal.source_url,
        assumptionWeight=original.get("assumptionWeight", signal.strength) if assumption else None,
        direction=signal.direction,
        strength=signal.strength,
        impacts=[
            SignalImpactRead(taskId=row.task_id, impact=row.impact)
            for row in impacts
        ],
        explanation=signal.explanation,
        evidence="assumption" if assumption else signal.evidence,  # type: ignore[arg-type]
        recency=None if assumption else round(recency_weight(signal.date), 4),
    )


def list_signals(session: Session, include_user: bool = True) -> list[SignalRead]:
    query = select(Signal)
    if not include_user:
        query = query.where(Signal.evidence != "user")
    rows = session.exec(query.order_by(Signal.date.desc(), Signal.id)).all()
    impacts = _impacts_by_signal(session, [row.id for row in rows])
    return [serialize_signal(row, impacts.get(row.id, [])) for row in rows]


def get_signal(session: Session, signal_id: str) -> SignalRead | None:
    signal = session.get(Signal, signal_id)
    if signal is None:
        return None
    impacts = _impacts_by_signal(session, [signal_id])
    return serialize_signal(signal, impacts.get(signal_id, []))


def seed_signals(session: Session) -> list[SignalRead]:
    """The immutable catalogue signals (everything except user additions)."""
    rows = session.exec(
        select(Signal)
        .where(Signal.evidence != "user")
        .order_by(Signal.date.desc(), Signal.id)
    ).all()
    impacts = _impacts_by_signal(session, [row.id for row in rows])
    return [serialize_signal(row, impacts.get(row.id, [])) for row in rows]


# ---------------------------------------------------------------------------
# Full seed payload
# ---------------------------------------------------------------------------


def seed_payload(session: Session) -> dict:
    """The full dataset served by ``GET /api/seed``.

    Works for both datasets; ``demoPersona`` is null when the catalogue is live.
    """
    tasks = list_tasks(session)
    skills_by_task = task_skills_map(session, [task.id for task in tasks])
    persona = demo_persona()
    return {
        "version": runtime.seed_version(),
        "asOf": runtime.as_of_iso(),
        "roles": [
            serialize_role(session, role).model_dump()
            for role in list_roles(session)
        ],
        "tasks": [
            serialize_task(session, task, skills_by_task.get(task.id, [])).model_dump()
            for task in tasks
        ],
        "skills": [
            serialize_skill(skill).model_dump() for skill in list_skills(session)
        ],
        "signals": [
            row.model_dump(exclude={"recency"}, exclude_none=True) for row in seed_signals(session)
        ],
        "resources": [
            serialize_resource(resource).model_dump()
            for resource in list_resources(session)
        ],
        "scenarios": [
            serialize_scenario(scenario).model_dump()
            for scenario in list_scenarios(session)
        ],
        "sdgs": [
            row.model_dump(exclude={"roles"}) for row in list_sdgs(session)
        ],
        "demoPersona": persona.model_dump() if persona else None,
    }


def find_role(session: Session, role_id: str) -> Optional[Role]:
    return session.get(Role, role_id)
