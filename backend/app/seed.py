"""Seed and guard the demo dataset.

The catalogue lives in ``app/seed_data.py`` and is generated from the frontend
demo's ``lib/data/seed.ts``. Only a process started with
``PIVOTT_DATASET=demo`` may write it, and only into a database whose ``meta``
table says ``dataset = demo``. The live dataset is populated by its own importer
and is never touched by this module.

Seeding is idempotent: if the skills table already has rows, nothing is
inserted.
"""

from __future__ import annotations

import json
from datetime import date

from sqlmodel import Session, select

from app import runtime, seed_data
from app.config import DATASET, DATA_AS_OF, SEED_VERSION, is_demo
from app.db import engine, reset_database
from app.models import (
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


def _numbered(rows: list[dict]) -> list[dict]:
    """Attach the seed's display order to catalogue rows."""
    return [{**row, "sort_order": index} for index, row in enumerate(rows)]


def _positioned(rows: list[dict], group_key: str) -> list[dict]:
    """Attach a per-group order (skills of a task, SDGs of a role, ...)."""
    counters: dict[str, int] = {}
    positioned: list[dict] = []
    for row in rows:
        group = row[group_key]
        position = counters.get(group, 0)
        counters[group] = position + 1
        positioned.append({**row, "position": position})
    return positioned


def meta_rows() -> dict[str, str]:
    """Dataset metadata written into ``meta``."""
    rows = {
        "dataset": DATASET,
        "seed_version": SEED_VERSION,
        "data_as_of": DATA_AS_OF,
    }
    if is_demo():
        rows["demo_persona"] = json.dumps(
            seed_data.DEMO_PERSONA, ensure_ascii=False, sort_keys=True
        )
    return rows


def ensure_dataset(session: Session) -> None:
    """Make sure the database belongs to the configured dataset.

    - marker matches ``PIVOTT_DATASET`` -> ok
    - no marker, demo process -> write the demo marker (existing rows are
      assumed to be the demo catalogue)
    - no marker, live process with an empty database -> write the live marker;
      the live importer fills the catalogue later
    - no marker, live process with rows -> refuse: this is most likely a demo
      database accidentally pointed at by the live deployment
    """
    marker = session.get(Meta, "dataset")
    has_rows = session.exec(select(Skill)).first() is not None

    if marker is not None:
        if marker.value != DATASET:
            raise RuntimeError(
                f"refusing to start: database is marked {marker.value!r} but "
                f"PIVOTT_DATASET={DATASET!r}. Point the process at its own "
                "database, or fix PIVOTT_DATASET."
            )
        return

    if not is_demo() and has_rows:
        raise RuntimeError(
            "refusing to start: the database has catalogue rows but no "
            "meta.dataset marker. It looks like a demo database; set "
            "PIVOTT_DATASET=demo to use it, or import the live dataset with "
            "PIVOTT_DATASET=live."
        )

    for key, value in meta_rows().items():
        session.merge(Meta(key=key, value=value))
    session.commit()


def _write_meta(session: Session) -> None:
    for key, value in meta_rows().items():
        session.merge(Meta(key=key, value=value))


def seed_database(session: Session) -> bool:
    """Insert the demo dataset into an empty database.

    Returns True when data was inserted, False when the database already has it.
    Call ``reset_database()`` first if you need to replace existing data.
    """
    if not is_demo():
        raise RuntimeError(
            "the built-in seed is demo-only; a live database must be filled by "
            "the real-data importer"
        )

    marker = session.get(Meta, "dataset")
    if marker is not None and marker.value != "demo":
        raise RuntimeError(
            f"refusing to seed the demo catalogue into a {marker.value!r} database"
        )

    if session.exec(select(Skill)).first() is not None:
        return False

    session.add_all([Skill(**row) for row in _numbered(seed_data.SKILLS)])
    session.add_all([Role(**row) for row in _numbered(seed_data.ROLES)])
    session.add_all([SDG(**row) for row in _numbered(seed_data.SDGS)])
    session.add_all([Scenario(**row) for row in seed_data.SCENARIOS])
    session.flush()

    role_sdgs = [
        RoleSDG(role_id=role["id"], sdg_id=sdg_id, position=position)
        for role in seed_data.ROLES
        for position, sdg_id in enumerate(role["sdgs"])
    ]
    session.add_all(role_sdgs)
    session.add_all(
        [
            RoleRequirement(**row)
            for row in _positioned(seed_data.ROLE_REQUIREMENTS, "role_id")
        ]
    )
    session.add_all([Task(**row) for row in _numbered(seed_data.TASKS)])
    session.flush()
    session.add_all(
        [TaskSkill(**row) for row in _positioned(seed_data.TASK_SKILLS, "task_id")]
    )
    session.add_all(
        [Resource(**row) for row in _numbered(seed_data.RESOURCES)]
    )

    for row in seed_data.SIGNALS:
        signal = Signal(
            id=row["id"],
            date=date.fromisoformat(row["date"]),
            headline=row["headline"],
            source_name=row["source_name"],
            source_url=row["source_url"],
            direction=row["direction"],
            strength=row["strength"],
            explanation=row["explanation"],
            evidence=row["evidence"],
        )
        session.add(signal)
        session.flush()
        for impact in row["impacts"]:
            session.add(
                SignalTaskImpact(
                    signal_id=signal.id,
                    task_id=impact["task_id"],
                    impact=impact["impact"],
                )
            )

    _write_meta(session)
    session.commit()
    return True


def seed_if_empty(session: Session) -> bool:
    return seed_database(session)


def reset_and_seed() -> None:
    if not is_demo():
        raise RuntimeError("reset is demo-only; the live dataset is never reset here")
    reset_database()
    with Session(engine) as session:
        ensure_dataset(session)
        seed_database(session)
        runtime.configure_from_session(session)


if __name__ == "__main__":
    import argparse

    from sqlalchemy.exc import OperationalError, ProgrammingError

    parser = argparse.ArgumentParser(description="Seed the Pivott demo dataset.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="drop existing tables and recreate them before seeding",
    )
    args = parser.parse_args()

    try:
        if args.reset:
            reset_and_seed()
            print("reset + seeded")
        else:
            with Session(engine) as session:
                ensure_dataset(session)
                inserted = seed_database(session)
            print("seeded" if inserted else "already seeded")
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        raise SystemExit(
            "database schema is out of date (missing meta/sort_order). Run "
            "supabase/migrations/202610221915_dataset_separation.sql first, "
            "or delete the local SQLite file and re-seed."
        ) from exc
