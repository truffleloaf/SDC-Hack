"""Build Pivott catalogue rows from an O*NET release plus live demand.

Pure functions only: the result is plain dictionaries that the importer writes
with SQLModel. Keeping the mapping here means the numbers can be tested without
a database or the network.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timezone

from app.live import roles as role_config
from app.live.jobs import MatchResult
from app.live.onet import OnetCatalog, OnetOccupation, OnetTask
from app.live.scoring import MODEL_ID, score_task, short_task_name, try_this_week

TOTAL_SHARE = 100
CATEGORY_ORDER = ("Technical", "Analytical", "Communication", "Operational")


class BuildError(RuntimeError):
    """Raised when the live source cannot produce a usable catalogue."""


def slugify(value: str) -> str:
    text = value.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


@dataclass
class LiveCatalog:
    roles: list[dict] = field(default_factory=list)
    tasks: list[dict] = field(default_factory=list)
    skills: list[dict] = field(default_factory=list)
    role_requirements: list[dict] = field(default_factory=list)
    role_sdgs: list[dict] = field(default_factory=list)
    task_skills: list[dict] = field(default_factory=list)
    postings: list[dict] = field(default_factory=list)
    provenance: dict = field(default_factory=dict)
    skipped: list[str] = field(default_factory=list)


def allocate_shares(weights: list[float], total: int = TOTAL_SHARE) -> list[int]:
    """Turn positive weights into integers that sum exactly to ``total``."""
    if not weights:
        return []
    positive = [max(0.0001, weight) for weight in weights]
    scale = total / sum(positive)
    exact = [weight * scale for weight in positive]
    shares = [max(1, int(value)) for value in exact]
    remainder = total - sum(shares)
    if remainder > 0:
        order = sorted(
            range(len(exact)),
            key=lambda index: (-(exact[index] - int(exact[index])), -exact[index], index),
        )
        for index in order[:remainder]:
            shares[index] += 1
    elif remainder < 0:
        order = sorted(
            range(len(exact)),
            key=lambda index: (exact[index] - int(exact[index]), exact[index], index),
        )
        for index in order:
            if remainder == 0:
                break
            if shares[index] > 1:
                shares[index] -= 1
                remainder += 1
    return shares


def _required_level(onet_level: float) -> int:
    return max(1, min(4, round(onet_level / 7 * 4)))


def _importance(onet_importance: float) -> int:
    """Scale O*NET's compressed 1-5 importance onto Pivott's 1-5 weight."""
    return max(1, min(5, 1 + round((onet_importance - 1) * 4 / 3)))


def _task_name(task: OnetTask) -> str:
    return short_task_name(task.statement)


def _task_description(task: OnetTask, occupation: OnetOccupation) -> str:
    return (
        f"{task.statement} O*NET-SOC {occupation.code}, task {task.task_id}, "
        f"importance {task.importance:.1f}/5."
    )


def _skill_deliverable(name: str, category: str, family: str) -> str:
    template = role_config.DELIVERABLES.get(category, "{name}")
    return template.format(name=name, family=family.lower())


def build_catalog(
    catalog: OnetCatalog,
    *,
    demand: dict[str, int] | None = None,
    matches: MatchResult | None = None,
    demand_source: dict | None = None,
    specs: tuple[role_config.LiveRoleSpec, ...] | list[role_config.LiveRoleSpec] = role_config.ROLES,
    tasks_per_role: int = role_config.TASKS_PER_ROLE,
    requirements_per_role: int = role_config.REQUIREMENTS_PER_ROLE,
    postings_per_role: int = role_config.POSTINGS_PER_ROLE,
    generated_at: datetime | None = None,
) -> LiveCatalog:
    """Map the O*NET catalogue and live postings into Pivott rows."""
    demand = demand or {}
    generated_at = generated_at or datetime.now(timezone.utc)

    skill_usage: dict[str, list[tuple[str, str, float | None]]] = {}
    skill_names: dict[str, str] = {}
    role_rows: list[dict] = []
    task_rows: list[dict] = []
    requirement_rows: list[dict] = []
    role_sdg_rows: list[dict] = []
    task_skill_rows: list[dict] = []
    posting_rows: list[dict] = []
    used_codes: list[dict] = []
    skipped: list[str] = []

    for order_index, spec in enumerate(specs):
        occupation = catalog.occupations.get(spec.code)
        if occupation is None:
            skipped.append(f"{spec.code}: missing from the O*NET release")
            continue

        rated = [task for task in occupation.tasks if task.rated] or list(occupation.tasks)
        if not rated or not occupation.skills:
            skipped.append(
                f"{spec.code} {occupation.title}: no rated tasks or no skill ratings "
                "in this O*NET release"
            )
            continue

        selected = sorted(rated, key=lambda task: (-task.importance, task.task_id))[
            :tasks_per_role
        ]
        shares = allocate_shares([task.importance for task in selected])

        role_rows.append(
            {
                "id": spec.slug,
                "title": occupation.title,
                "family": spec.family,
                "demand": int(demand.get(spec.slug, 50)),
                "sort_order": len(role_rows),
            }
        )
        used_codes.append(
            {
                "code": occupation.code,
                "title": occupation.title,
                "slug": spec.slug,
            }
        )
        for position, sdg_id in enumerate(spec.sdgs):
            role_sdg_rows.append(
                {"role_id": spec.slug, "sdg_id": sdg_id, "position": position}
            )

        for task_index, (task, share) in enumerate(zip(selected, shares)):
            score = score_task(task.statement, occupation.job_zone)
            task_id = f"{spec.slug}-{task.task_id}"
            task_rows.append(
                {
                    "id": task_id,
                    "role_id": spec.slug,
                    "name": _task_name(task),
                    "description": _task_description(task, occupation),
                    "base_exposure": score.base_exposure,
                    "human_judgment": score.human_judgment,
                    "default_share": share,
                    "try_this_week": try_this_week(score),
                    "sort_order": task_index,
                }
            )
            for position, name in enumerate(occupation.task_skills.get(task.task_id, ())):
                skill_id = slugify(name)
                skill_names.setdefault(skill_id, name)
                skill_usage.setdefault(skill_id, []).append((spec.slug, spec.family, None))
                task_skill_rows.append(
                    {
                        "task_id": task_id,
                        "skill_id": skill_id,
                        "position": position,
                    }
                )

        requirements = sorted(
            occupation.skills, key=lambda skill: (-skill.importance, skill.name)
        )[:requirements_per_role]
        for position, skill in enumerate(requirements):
            skill_id = slugify(skill.name)
            skill_names.setdefault(skill_id, skill.name)
            usage = skill_usage.setdefault(skill_id, [])
            usage.append((spec.slug, spec.family, skill.importance))
            requirement_rows.append(
                {
                    "role_id": spec.slug,
                    "skill_id": skill_id,
                    "required_level": _required_level(skill.level),
                    "importance": _importance(skill.importance),
                    "position": position,
                    "_onet_importance": skill.importance,
                }
            )

        if matches and spec.slug in matches.postings_by_role:
            entries = sorted(
                matches.postings_by_role[spec.slug],
                key=lambda item: (item[0].posted_at, item[0].title),
                reverse=True,
            )[:postings_per_role]
            for posting, matched_title in entries:
                row = posting.to_row()
                row.update({"role_id": spec.slug, "matched_title": matched_title})
                posting_rows.append(row)

    if not role_rows:
        raise BuildError(
            "no usable occupations: " + "; ".join(skipped or ["unknown reason"])
        )

    skills: list[dict] = []
    for skill_id, name in sorted(skill_names.items()):
        category = role_config.SKILL_CATEGORIES.get(name, "Analytical")
        usage = skill_usage.get(skill_id, [])
        family = usage[0][1] if usage else "General"
        rated = [item for item in usage if item[2] is not None]
        top = max(rated, key=lambda item: item[2]) if rated else None
        top_role = top[0] if top else (usage[0][0] if usage else "")
        role_title = next(
            (row["title"] for row in role_rows if row["id"] == top_role), "this role"
        )
        if top is not None:
            why = (
                f"O*NET rates {name} {float(top[2]):.1f}/5 in importance for "
                f"{role_title}; the skill is required by "
                f"{len({item[0] for item in rated})} role(s) in this catalogue."
            )
        else:
            why = (
                f"O*NET links {name} to tasks in "
                f"{len({item[0] for item in usage})} role(s) in this catalogue."
            )
        skills.append(
            {
                "id": skill_id,
                "name": name,
                "category": category,
                "hours_per_level": role_config.HOURS_PER_LEVEL[category],
                "deliverable": _skill_deliverable(name, category, family),
                "why": why,
                "sort_order": 0,
            }
        )
    skills.sort(
        key=lambda row: (
            CATEGORY_ORDER.index(row["category"])
            if row["category"] in CATEGORY_ORDER
            else len(CATEGORY_ORDER),
            row["name"],
        )
    )
    for index, row in enumerate(skills):
        row["sort_order"] = index

    requirements = [
        {key: value for key, value in row.items() if not key.startswith("_")}
        for row in requirement_rows
    ]

    provenance = {
        "generatedAt": generated_at.isoformat(timespec="seconds"),
        "catalog": {
            **role_config.SOURCE_CATALOG,
            "release": catalog.release,
            "version": catalog.version,
            "occupations": used_codes,
            "skipped": skipped,
        },
        "demand": _demand_provenance(matches, demand, demand_source),
        "model": {
            "exposure": MODEL_ID,
            "defaultShare": "O*NET task importance, normalised to 100 per role",
            "taskSkills": (
                "O*NET crosswalk task -> detailed work activity -> generalized "
                "work activity -> essential skill (top 3)"
            ),
            "roleRequirements": (
                "O*NET essential/transferable skill importance and level; "
                "level/7 scaled to 1-4, importance rescaled from O*NET's "
                "compressed 1-5 range to 1-5"
            ),
            "demand": "share of matched live postings, 0-100 relative to the top role",
        },
    }

    return LiveCatalog(
        roles=role_rows,
        tasks=task_rows,
        skills=skills,
        role_requirements=requirements,
        role_sdgs=role_sdg_rows,
        task_skills=task_skill_rows,
        postings=posting_rows,
        provenance=provenance,
        skipped=skipped,
    )


def _demand_provenance(
    matches: MatchResult | None,
    demand: dict[str, int],
    source: dict | None = None,
) -> dict:
    if matches is None:
        return {
            "status": "unavailable",
            "note": "job feed skipped; every role keeps a neutral demand of 50",
            "demand": demand,
        }
    return {
        "status": "live",
        **(source or {}),
        "method": matches.method,
        "matched": matches.matched,
        "unmatched": matches.unmatched,
        "counts": matches.counts,
        "demand": demand,
    }


def seed_version(catalog: OnetCatalog, source: str, as_of: date) -> str:
    tag = f"{source}-{as_of.isoformat()}" if source else "no-jobs"
    return f"onet-{catalog.version}+{tag}"
