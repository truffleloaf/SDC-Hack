"""Fill the live dataset from O*NET and a live job feed.

The live database is never seeded from ``app.seed_data``: this module is the only
writer, and it refuses to touch a database marked ``demo``. A sync is a full
rebuild of the catalogue: roles, tasks, skills, requirements, sample postings
and the provenance in ``meta``, in one transaction.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import delete
from sqlmodel import Session

from app import runtime
from app.config import is_demo
from app.live import jobs as job_source
from app.live import roles as role_config
from app.live.build import LiveCatalog, build_catalog, seed_version
from app.live.jobs import MatchResult, build_title_index, demand_from_counts
from app.live.onet import OnetCatalog, load_catalog
from app.models import (
    JobPosting,
    Meta,
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


class LiveImportError(RuntimeError):
    """Raised when the live import cannot run safely."""


@dataclass
class ImportOptions:
    offline: bool = False
    pages: int = 5
    jobs: str = "auto"  # auto | arbeitnow | adzuna | none
    cache_dir: Path | str | None = None
    tasks_per_role: int = role_config.TASKS_PER_ROLE
    requirements_per_role: int = role_config.REQUIREMENTS_PER_ROLE
    postings_per_role: int = role_config.POSTINGS_PER_ROLE


@dataclass
class ImportResult:
    catalog: LiveCatalog
    onet: OnetCatalog
    version: str
    as_of: date


def _job_source_choice(requested: str) -> str:
    choice = (requested or "auto").strip().lower()
    if choice != "auto":
        return choice
    if os.getenv("ADZUNA_APP_ID") and os.getenv("ADZUNA_APP_KEY"):
        return "adzuna"
    return "arbeitnow"


def collect(options: ImportOptions | None = None) -> ImportResult:
    """Download/parse the sources and build the catalogue rows (no DB writes)."""
    options = options or ImportOptions()
    codes = [spec.code for spec in role_config.ROLES]
    onet = load_catalog(codes=codes, cache_dir=options.cache_dir, offline=options.offline)

    as_of = date.today()
    demand: dict[str, int] = {}
    matches: MatchResult | None = None
    source: dict = {}
    choice = _job_source_choice(options.jobs)
    role_ids = [spec.slug for spec in role_config.ROLES]

    if choice == "none":
        source = {"status": "skipped", "name": "none"}
    elif choice == "adzuna":
        terms = {
            spec.slug: spec.aliases or (onet.get(spec.code).title,)
            for spec in role_config.ROLES
        }
        counts = job_source.fetch_adzuna_counts(
            terms,
            country=os.getenv("ADZUNA_COUNTRY", job_source.DEFAULT_COUNTRY),
            cache_dir=options.cache_dir,
            offline=options.offline,
        )
        matches = MatchResult(
            counts=counts,
            postings_by_role={},
            matched=sum(counts.values()),
            unmatched=0,
            method="Adzuna result count for the role's search terms",
        )
        demand = demand_from_counts(counts, role_ids)
        source = {
            "name": "Adzuna",
            "url": job_source.ADZUNA_TERMS_URL,
            "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "country": os.getenv("ADZUNA_COUNTRY", job_source.DEFAULT_COUNTRY),
        }
    elif choice == "arbeitnow":
        postings = job_source.fetch_arbeitnow(
            pages=options.pages,
            cache_dir=options.cache_dir,
            offline=options.offline,
        )
        index = build_title_index(
            {spec.slug: onet.get(spec.code).job_titles for spec in role_config.ROLES},
            {spec.slug: spec.aliases for spec in role_config.ROLES},
        )
        matches = job_source.match_postings(postings, index)
        demand = demand_from_counts(matches.counts, role_ids)
        source = {
            "name": "Arbeitnow job board",
            "url": job_source.ARBEITNOW_URL,
            "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "pages": max(1, min(options.pages, 10)),
            "postings": len(postings),
        }
    else:
        raise LiveImportError(f"unknown job source {options.jobs!r}")

    catalog = build_catalog(
        onet,
        demand=demand,
        matches=matches,
        demand_source=source,
        tasks_per_role=options.tasks_per_role,
        requirements_per_role=options.requirements_per_role,
        postings_per_role=options.postings_per_role,
        generated_at=datetime.now(timezone.utc),
    )
    from app.live.trends import compute_trends
    matched_rows = [dict(p.to_row(), description=p.description, role_id=role_id) for role_id, pairs in (matches.postings_by_role.items() if matches else []) for p, _ in pairs]
    # Retain public observations across runs so baseline coverage can accumulate.
    archive = Path(__file__).resolve().parents[2] / 'data/postings.json'
    history = json.loads(archive.read_text()) if archive.exists() else []
    merged = {p['id']:p for p in history}
    merged.update({p['id']:p for p in matched_rows})
    catalog.observations = [p for p in merged.values() if 0 <= (as_of-date.fromisoformat(str(p['posted_at'])[:10])).days < 90]
    catalog.signals, catalog.provenance['trends'] = compute_trends(catalog.observations,catalog.roles,catalog.skills,catalog.tasks,catalog.task_skills,as_of)
    return ImportResult(
        catalog=catalog,
        onet=onet,
        version=seed_version(onet, choice if choice != "none" else "", as_of),
        as_of=as_of,
    )


def ensure_live_target(session: Session, *, allow_demo: bool = False) -> None:
    """Refuse to write the live catalogue into a demo process or database."""
    if is_demo() and not allow_demo:
        raise LiveImportError(
            "PIVOTT_DATASET=demo: the importer only fills the live dataset. "
            "Set PIVOTT_DATASET=live and PIVOTT_DB to the live database."
        )
    marker = session.get(Meta, "dataset")
    if marker is not None and marker.value != "live":
        raise LiveImportError(
            f"refusing to import into a database marked {marker.value!r}; "
            "point PIVOTT_DB at the live database"
        )
    if marker is None:
        session.merge(Meta(key="dataset", value="live"))
        session.commit()


def write_catalog(
    session: Session,
    result: ImportResult,
    *,
    allow_demo: bool = False,
) -> dict[str, int]:
    """Replace the live catalogue in one transaction."""
    ensure_live_target(session, allow_demo=allow_demo)
    catalog = result.catalog

    # Child rows first, then parents. User-added signals are demo-only, so a
    # sync clears the whole signal layer and says so in the docs.
    session.exec(delete(JobPosting))
    session.exec(delete(SignalTaskImpact))
    session.exec(delete(Signal))
    session.exec(delete(Resource))
    session.exec(delete(TaskSkill))
    session.exec(delete(Task))
    session.exec(delete(RoleSDG))
    session.exec(delete(RoleRequirement))
    session.exec(delete(Role))
    session.exec(delete(Skill))
    session.exec(delete(SDG))
    session.exec(delete(Scenario))
    session.flush()

    session.add_all([SDG(**row) for row in role_config.SDGS])
    session.add_all([Scenario(**row) for row in role_config.SCENARIOS])
    session.add_all([Skill(**row) for row in catalog.skills])
    session.flush()
    session.add_all([Role(**row) for row in catalog.roles])
    session.flush()
    session.add_all([RoleSDG(**row) for row in catalog.role_sdgs])
    session.add_all([RoleRequirement(**row) for row in catalog.role_requirements])
    session.add_all([Task(**row) for row in catalog.tasks])
    session.flush()
    session.add_all([TaskSkill(**row) for row in catalog.task_skills])
    session.add_all([JobPosting(**row) for row in catalog.postings])
    for signal in catalog.signals:
        row = dict(signal)
        impacts = row.pop('impacts')
        row['date'] = date.fromisoformat(row['date'])
        row['source_name'] = row.pop('sourceName'); row['source_url'] = row.pop('sourceUrl')
        session.add(Signal(**row)); session.flush()
        session.add_all([SignalTaskImpact(signal_id=row['id'],task_id=i['taskId'],impact=i['impact']) for i in impacts])

    provenance = {
        "dataset": "live",
        "seedVersion": result.version,
        "dataAsOf": result.as_of.isoformat(),
        **catalog.provenance,
    }
    for key, value in (
        ("dataset", "live"),
        ("seed_version", result.version),
        ("data_as_of", result.as_of.isoformat()),
        ("live_source", json.dumps(provenance, ensure_ascii=False, sort_keys=True)),
    ):
        session.merge(Meta(key=key, value=value))
    demo_persona = session.get(Meta, "demo_persona")
    if demo_persona is not None:
        session.delete(demo_persona)

    session.commit()
    runtime.configure_from_session(session)

    return {
        "roles": len(catalog.roles),
        "tasks": len(catalog.tasks),
        "skills": len(catalog.skills),
        "roleRequirements": len(catalog.role_requirements),
        "taskSkills": len(catalog.task_skills),
        "postings": len(catalog.postings),
    }


def live_meta(session: Session) -> dict:
    """Return the provenance stored by the last import, if any."""
    row = session.get(Meta, "live_source")
    if row is None:
        return {}
    try:
        return json.loads(row.value)
    except json.JSONDecodeError:
        return {}


