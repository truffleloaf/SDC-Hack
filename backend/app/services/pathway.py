"""Build a pathway from skill gaps.

The demo does not persist pathways. ``POST /api/pathways`` computes the steps
and encodes its inputs into a base64url id; ``GET /api/pathways/{id}`` decodes
and recomputes them.
"""

from __future__ import annotations

from math import ceil, floor
from typing import Sequence

from sqlmodel import Session

from app.models import Resource, Skill
from app.schemas import PathwayStep, ResourceLink
from app.services.catalog import list_resources
from app.services.matching import learning_weeks, skill_gaps


def _resource_for_skill(
    resources: Sequence[Resource], skill_id: str, free_only: bool
) -> Resource | None:
    options = [resource for resource in resources if resource.skill_id == skill_id]
    if free_only:
        return next((resource for resource in options if resource.free), None)
    return options[0] if options else None


def build_pathway(
    session: Session,
    *,
    target_role_id: str,
    levels: dict[str, int],
    hours_per_week: int,
    free_only: bool,
) -> tuple[list[PathwayStep], int, int] | None:
    from app.models import Role

    role = session.get(Role, target_role_id)
    if role is None:
        return None

    gaps = skill_gaps(session, role, levels)
    resources = list_resources(session)

    steps: list[PathwayStep] = []
    cursor = 0
    weekly = max(1, hours_per_week)
    for gap in gaps:
        resource = _resource_for_skill(resources, gap.skillId, free_only)
        skill = session.get(Skill, gap.skillId)
        start_hours = cursor
        cursor += gap.hours
        steps.append(
            PathwayStep(
                id=f"{target_role_id}:{gap.skillId}",
                skillId=gap.skillId,
                title=("Start" if gap.current == 0 else "Level up") + f": {gap.name}",
                skills=[gap.skillId],
                resource=(
                    ResourceLink(
                        title=resource.title,
                        provider=resource.provider,
                        url=resource.url,
                        free=resource.free,
                    )
                    if resource
                    else None
                ),
                hours=gap.hours,
                startWeek=floor(start_hours / weekly) + 1,
                endWeek=max(1, ceil(cursor / weekly)),
                deliverable=skill.deliverable if skill else "A small practical project",
                why=skill.why if skill else "",
            )
        )

    return steps, cursor, learning_weeks(cursor, hours_per_week)
