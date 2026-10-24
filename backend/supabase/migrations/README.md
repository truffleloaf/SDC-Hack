# Backend Supabase migrations

This directory contains ordered, append-only migrations for the optional FastAPI database.

## Naming

Use UTC timestamps followed by a concise snake-case description:

    YYYYMMDDHHMM_description.sql

Applied migration filenames are immutable. Never rename or edit a migration that may already have run; add a new migration instead.

## Rules

- Keep backend migrations separate from the root supabase account-sync migrations.
- Update schema.sql only as the clean-install baseline.
- Make migrations safe to review and rerun where practical.
- Do not apply unreviewed changes directly in the Supabase dashboard.
- Test migrations on a branch database or disposable PostgreSQL first.

## Apply and verify

Apply schema.sql to a new database, then run migration files in filename order. Verify the complete path with:

    python scripts/verify_pg.py --url postgresql://postgres:postgres@localhost:5432/postgres

The isolated JavaScript constraint check is:

    PGLITE_MODULE=/path/to/@electric-sql/pglite node scripts/checks/test-backend-schema.mjs

## Current groups

The migration history covers dataset separation, skill-name uniqueness, live job postings, authenticated profiles, skill-to-SDG mappings, resource provenance, and Domain 1 constraints.

Rollback is performed with a reviewed forward migration. Do not delete applied history.
