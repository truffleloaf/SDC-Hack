"""Database setup for the demo and live datasets.

Set ``PIVOTT_DB`` to override the database URL, for example:
    PIVOTT_DB=sqlite:///./demo.db

``DATABASE_URL`` is the fallback name. A live process
(``PIVOTT_DATASET=live``) must set one of them explicitly; it never falls back
to the demo SQLite file. Tests use an in-memory SQLite database (``sqlite://``)
with StaticPool so every request shares the same connection.
"""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.config import is_demo

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logger = logging.getLogger("pivott.db")


def _serverless() -> bool:
    """Whether this process runs where the repository checkout is read-only.

    Vercel sets ``VERCEL`` and only mounts ``/tmp`` writable; AWS Lambda uses
    ``AWS_LAMBDA_FUNCTION_NAME``. Both rebuild a function instance from scratch,
    so a file beside the code cannot survive (or even be created).
    """
    return bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))


def _demo_database_url() -> str:
    """SQLite fallback for a demo process with no configured database.

    Locally that is the repository file used by the README. On a serverless
    host the checkout is read-only, so the demo catalogue lives in an ephemeral
    file under the temp directory and is reseeded whenever a new instance
    starts. Set ``PIVOTT_DB`` or ``DATABASE_URL`` to persist user data.
    """
    if not _serverless():
        return "sqlite:///./pivott.db"

    path = Path(tempfile.gettempdir(), "pivott.db")
    logger.warning(
        "no database configured; using ephemeral SQLite at %s "
        "(saved profiles and user signals are lost when the instance stops)",
        path,
    )
    return f"sqlite:///{path.as_posix()}"


def resolve_database_url() -> str:
    """Pick the database for the configured dataset.

    ``PIVOTT_DB`` wins over ``DATABASE_URL`` for backwards compatibility. A
    demo process falls back to the local SQLite file; a live process must be
    given an explicit database so it can never read or seed the demo file.
    """
    explicit = (
        os.getenv("PIVOTT_DB")
        or os.getenv("TASK_SHIFT_DB")
        or os.getenv("DATABASE_URL")
        or ""
    ).strip()
    if explicit:
        return explicit
    if is_demo():
        return _demo_database_url()
    raise RuntimeError(
        "PIVOTT_DATASET=live requires PIVOTT_DB or DATABASE_URL; "
        "a live process never falls back to the demo database."
    )


DATABASE_URL = resolve_database_url()

engine_kwargs: dict = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if DATABASE_URL in ("sqlite://", "sqlite:///:memory:"):
        engine_kwargs["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, **engine_kwargs)


def init_db() -> None:
    # Importing models registers every table on SQLModel.metadata.
    from app import models  # noqa: F401

    if engine.dialect.name == "postgresql":
        # PostgreSQL deployments own their DDL: schema.sql + migrations carry
        # RLS policies, checks and indexes. create_all would silently add
        # tables without those protections, so only verify the baseline exists.
        missing: list[str] = []
        with engine.connect() as connection:
            for table in SQLModel.metadata.sorted_tables:
                exists = connection.execute(
                    text("select to_regclass(:name)"),
                    {"name": f"public.{table.name}"},
                ).scalar()
                if exists is None:
                    missing.append(table.name)
        if missing:
            raise RuntimeError(
                "database schema is missing tables "
                f"{sorted(missing)}; run supabase/schema.sql and the migrations "
                "before starting the API"
            )
        return

    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def reset_database() -> None:
    """Clear the demo dataset without destroying a deployed schema.

    SQLite uses drop/create because it is a local, disposable file. Postgres
    (Supabase) is truncated instead: ``supabase/schema.sql`` owns the RLS
    policies, indexes and constraints, and drop/create would silently remove
    them. Used by the demo reset endpoint and tests.
    """
    if not is_demo():
        raise RuntimeError("reset is demo-only; the live dataset is never reset here")

    from app import models  # noqa: F401

    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            existing = set(
                connection.execute(
                    text(
                        "select table_name from information_schema.tables "
                        "where table_schema = 'public'"
                    )
                ).scalars()
            )
            names = [
                f'"{table.name}"'
                for table in SQLModel.metadata.sorted_tables
                if table.name in existing
            ]
            if names:
                connection.execute(
                    text(
                        "TRUNCATE TABLE "
                        + ", ".join(names)
                        + " RESTART IDENTITY CASCADE"
                    )
                )
        return

    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
