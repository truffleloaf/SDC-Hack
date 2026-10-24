# Local PostgreSQL verification

This guide runs the backend schema, seed, migrations, RLS, and API checks against disposable PostgreSQL.

## Command

Start an empty PostgreSQL database, then run from backend:

    python scripts/verify_pg.py --url postgresql://postgres:postgres@localhost:5432/postgres

The script expects a disposable database because it creates, migrates, seeds, truncates, and verifies tables.

## What it checks

- Base schema creation
- Migrations in filename order
- Demo seed counts and idempotence
- PostgreSQL-specific JSON, numeric, date, and foreign-key behavior
- Dataset markers and reset behavior
- Profile RLS and cross-user isolation
- API reads and writes against PostgreSQL

## When to run it

Run this check after changes to backend/supabase, app/models.py, app/seed_data.py, reset behavior, auth profiles, or PostgreSQL-specific queries. The root [backend workflow](../../.github/workflows/backend-tests.yml) runs the same verification with a PostgreSQL 17 service.

The normal pytest suite uses in-memory SQLite for speed and does not replace this check.
