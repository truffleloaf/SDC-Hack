"""Check the Supabase connection and the Pivott demo schema.

Usage:
    .\\.venv\\Scripts\\python.exe supabase\\check_connection.py

Reads DATABASE_URL from the project-root .env. Normalises the common
``postgres://`` / ``postgresql://`` prefixes to the psycopg driver.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

url = os.getenv("DATABASE_URL", "").strip()
if not url:
    sys.exit(
        "DATABASE_URL is missing. Copy .env.example to .env and paste the "
        "Supabase Session pooler connection string."
    )

if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql+psycopg://", 1)
elif url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+psycopg://", 1)

expected = {
    "skills": 15,
    "roles": 6,
    "sdgs": 4,
    "scenarios": 2,
    "tasks": 31,
    "role_requirements": 36,
    "role_sdgs": 10,
    "task_skills": 73,
    "signals": 20,
    "signal_task_impacts": 41,
    "resources": 24,
    "job_postings": 0,
    "profiles": 0,
    "meta": 4,
}

try:
    engine = create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 15},
    )
    with engine.connect() as conn:
        tables = conn.execute(
            text(
                "select table_name from information_schema.tables "
                "where table_schema = 'public' order by table_name"
            )
        ).scalars().all()
        rows = {
            table: conn.execute(text(f'select count(*) from public."{table}"')).scalar()
            for table in expected
            if table in tables
        }
except Exception as exc:  # noqa: BLE001 - surface the driver message verbatim
    print(f"connection failed: {type(exc).__name__}: {exc}")
    print("\nChecklist:")
    print("  1. Is DATABASE_URL the Session pooler string (port 5432)?")
    print("  2. Is the database password URL-encoded?")
    print("  3. Did you run the new supabase/schema.sql in the SQL Editor?")
    raise SystemExit(1) from exc

print("connected")
print(f"tables: {len(tables)} (expected {len(expected)})")
print("row counts:")
for table, count in rows.items():
    mark = "ok" if count == expected[table] else f"expected {expected[table]}"
    print(f"  {table:<22} {count:>3}  {mark}")

missing = sorted(set(expected) - set(rows))
if missing:
    print(f"missing tables: {', '.join(missing)} — run supabase/schema.sql first")
    raise SystemExit(1)

mismatched = [table for table, count in rows.items() if count != expected[table]]
if mismatched:
    print(f"row count mismatch: {', '.join(sorted(mismatched))} — run the seeder")
    raise SystemExit(1)

print("schema and seed counts are consistent")
