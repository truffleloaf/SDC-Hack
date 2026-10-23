"""Command line entry point for the live dataset.

Run it with the live dataset selected::

    $env:PIVOTT_DATASET = 'live'
    $env:PIVOTT_DB = 'sqlite:///./pivott-live.db'
    .venv\\Scripts\\python.exe -m app.live sync

``sync`` downloads O*NET 31.0 and one page-range of Arbeitnow postings, then
rebuilds the live catalogue. It never touches the demo database.

    .venv\\Scripts\\python.exe -m app.live status
"""

from __future__ import annotations

import argparse
import json
import sys

from sqlmodel import Session, func, select

from app.config import DATASET, is_demo
from app.db import engine, init_db
from app.live import roles as role_config
from app.live.importer import (
    ImportOptions,
    collect,
    live_meta,
    write_catalog,
)
from app.models import JobPosting, Role, Skill, Task


def _streams() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):  # pragma: no cover - non-tty
            pass


def _summary(result, session: Session | None = None) -> str:
    catalog = result.catalog
    lines = [
        f"version       {result.version}",
        f"as of         {result.as_of.isoformat()}",
        f"roles         {len(catalog.roles)}",
        f"tasks         {len(catalog.tasks)} ({len(catalog.tasks) / max(1, len(catalog.roles)):.1f} per role)",
        f"skills        {len(catalog.skills)}",
        f"requirements  {len(catalog.role_requirements)}",
        f"postings      {len(catalog.postings)}",
    ]
    demand = catalog.provenance.get("demand", {})
    if demand.get("status") == "live":
        counts = demand.get("counts", {})
        ranked = sorted(counts.items(), key=lambda item: -item[1])[:5]
        lines.append(
            "demand        " + ", ".join(f"{role} {count}" for role, count in ranked)
        )
    if catalog.skipped:
        lines.append("skipped       " + "; ".join(catalog.skipped))
    if session is not None:
        lines.append(f"database      {DATASET}")
    return "\n".join(lines)


def cmd_sync(args: argparse.Namespace) -> int:
    options = ImportOptions(
        offline=args.offline,
        pages=args.pages,
        jobs=args.jobs,
        cache_dir=args.cache_dir,
        tasks_per_role=args.tasks,
        requirements_per_role=args.requirements,
    )
    result = collect(options)
    print(_summary(result))
    if args.dry_run:
        print("\ndry run: nothing written")
        return 0

    init_db()
    with Session(engine) as session:
        counts = write_catalog(session, result, allow_demo=args.allow_demo)
    print("\nwrote " + json.dumps(counts, ensure_ascii=False))
    print(f"health: {args.base_url}/api/health")
    return 0


def cmd_status(_args: argparse.Namespace) -> int:
    init_db()
    with Session(engine) as session:
        meta = live_meta(session)
        roles = session.exec(select(func.count()).select_from(Role)).one()
        tasks = session.exec(select(func.count()).select_from(Task)).one()
        skills = session.exec(select(func.count()).select_from(Skill)).one()
        postings = session.exec(select(func.count()).select_from(JobPosting)).one()

    print(f"dataset       {DATASET}")
    if not meta:
        print("no live import in this database")
        return 0
    print(f"version       {meta.get('seedVersion')}")
    print(f"as of         {meta.get('dataAsOf')}")
    print(f"generated     {meta.get('generatedAt')}")
    print(f"roles/tasks   {roles} / {tasks}")
    print(f"skills        {skills}")
    print(f"postings      {postings}")
    catalog = meta.get("catalog", {})
    print(f"catalogue     {catalog.get('name')} ({catalog.get('license')})")
    demand = meta.get("demand", {})
    print(f"demand        {demand.get('name', demand.get('status'))}")
    if catalog.get("skipped"):
        print("skipped       " + "; ".join(catalog["skipped"]))
    return 0


def cmd_roles(_args: argparse.Namespace) -> int:
    for spec in role_config.ROLES:
        print(f"{spec.code}  {spec.slug:<26} {spec.family}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.live",
        description="Import the real (live) Pivott catalogue from O*NET and a job feed.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sync = sub.add_parser("sync", help="download sources and rebuild the live database")
    sync.add_argument("--offline", action="store_true", help="use cached downloads only")
    sync.add_argument("--pages", type=int, default=5, help="Arbeitnow pages, 1-10 (default 5)")
    sync.add_argument(
        "--jobs",
        choices=("auto", "arbeitnow", "adzuna", "none"),
        default="auto",
        help="demand source; auto picks Adzuna when ADZUNA_APP_ID/KEY are set",
    )
    sync.add_argument("--cache-dir", default=None, help="download cache (default .cache)")
    sync.add_argument("--tasks", type=int, default=role_config.TASKS_PER_ROLE)
    sync.add_argument("--requirements", type=int, default=role_config.REQUIREMENTS_PER_ROLE)
    sync.add_argument("--dry-run", action="store_true", help="build but do not write")
    sync.add_argument(
        "--allow-demo",
        action="store_true",
        help="development only: allow writing while PIVOTT_DATASET=demo",
    )
    sync.add_argument("--base-url", default="http://127.0.0.1:8001")
    sync.set_defaults(func=cmd_sync)

    status = sub.add_parser("status", help="show what the live database holds")
    status.set_defaults(func=cmd_status)

    roles = sub.add_parser("roles", help="list the configured O*NET occupations")
    roles.set_defaults(func=cmd_roles)
    return parser


def main(argv: list[str] | None = None) -> int:
    _streams()
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "sync" and is_demo() and not args.allow_demo:
        print(
            "PIVOTT_DATASET=demo: set PIVOTT_DATASET=live and PIVOTT_DB to the "
            "live database before syncing (the demo catalogue is never overwritten).",
            file=sys.stderr,
        )
        return 2
    try:
        return int(args.func(args))
    except Exception as exc:  # noqa: BLE001 - CLI boundary
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
