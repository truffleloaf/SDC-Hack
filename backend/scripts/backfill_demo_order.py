#!/usr/bin/env python
"""Backfill display order and dataset metadata for an existing demo database.

The dataset-separation change moved display order out of ``app/seed_data.py``
into ``sort_order`` / ``position`` columns, and added the ``meta`` table. Fresh
databases get those values from ``python -m app.seed``. An existing demo
database keeps its rows but needs them filled in once:

    python scripts/backfill_demo_order.py

It only UPDATEs existing rows (plus ``meta``); it never inserts or deletes
catalogue rows. Run the schema migration first:

    supabase/migrations/202610221915_dataset_separation.sql

For a disposable demo database, ``python -m app.seed --reset`` is simpler.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy.exc import OperationalError, ProgrammingError  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app import seed_data  # noqa: E402
from app.config import is_demo  # noqa: E402
from app.db import engine  # noqa: E402
from app.models import (  # noqa: E402
    Meta,
    Resource,
    Role,
    RoleRequirement,
    RoleSDG,
    SDG,
    Skill,
    Task,
    TaskSkill,
)
from app.seed import meta_rows  # noqa: E402


def main() -> int:
    if not is_demo():
        print("refusing to run: this backfill is demo-only (PIVOTT_DATASET=demo)")
        return 2

    missing: list[str] = []
    updated = 0

    try:
        with Session(engine) as session:
            marker = session.get(Meta, "dataset")
            if marker is not None and marker.value != "demo":
                print(
                    f"refusing to run: database is marked {marker.value!r}, "
                    "not 'demo'"
                )
                return 2

            for index, row in enumerate(seed_data.SKILLS):
                obj = session.get(Skill, row["id"])
                if obj is None:
                    missing.append(f"skill:{row['id']}")
                    continue
                obj.sort_order = index
                updated += 1

            for index, row in enumerate(seed_data.ROLES):
                obj = session.get(Role, row["id"])
                if obj is None:
                    missing.append(f"role:{row['id']}")
                    continue
                obj.sort_order = index
                updated += 1

            for index, row in enumerate(seed_data.SDGS):
                obj = session.get(SDG, row["id"])
                if obj is None:
                    missing.append(f"sdg:{row['id']}")
                    continue
                obj.sort_order = index
                updated += 1

            for index, row in enumerate(seed_data.TASKS):
                obj = session.get(Task, row["id"])
                if obj is None:
                    missing.append(f"task:{row['id']}")
                    continue
                obj.sort_order = index
                updated += 1

            for index, row in enumerate(seed_data.RESOURCES):
                obj = session.get(Resource, row["id"])
                if obj is None:
                    missing.append(f"resource:{row['id']}")
                    continue
                obj.sort_order = index
                updated += 1

            counters: dict[str, int] = {}
            for row in seed_data.ROLE_REQUIREMENTS:
                position = counters.get(row["role_id"], 0)
                counters[row["role_id"]] = position + 1
                obj = session.get(
                    RoleRequirement, (row["role_id"], row["skill_id"])
                )
                if obj is None:
                    missing.append(
                        f"role_requirement:{row['role_id']}/{row['skill_id']}"
                    )
                    continue
                obj.position = position
                updated += 1

            counters = {}
            for row in seed_data.TASK_SKILLS:
                position = counters.get(row["task_id"], 0)
                counters[row["task_id"]] = position + 1
                obj = session.get(TaskSkill, (row["task_id"], row["skill_id"]))
                if obj is None:
                    missing.append(
                        f"task_skill:{row['task_id']}/{row['skill_id']}"
                    )
                    continue
                obj.position = position
                updated += 1

            for role in seed_data.ROLES:
                for position, sdg_id in enumerate(role["sdgs"]):
                    obj = session.get(RoleSDG, (role["id"], sdg_id))
                    if obj is None:
                        missing.append(f"role_sdg:{role['id']}/{sdg_id}")
                        continue
                    obj.position = position
                    updated += 1

            for key, value in meta_rows().items():
                session.merge(Meta(key=key, value=value))

            session.commit()
    except (ProgrammingError, OperationalError) as exc:
        print(f"schema is missing the new columns/table: {exc.orig}")
        print(
            "run supabase/migrations/202610221915_dataset_separation.sql first"
        )
        return 1

    print(f"updated {updated} demo rows; meta written")
    if missing:
        print(f"missing seed rows ({len(missing)}):")
        for item in sorted(missing):
            print(f"  {item}")
        print("the database is not a complete demo seed; re-seed before using it")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
