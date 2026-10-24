Historical log. Not maintained.

# P1-6: Quality and delivery

This archived work package established repeatable tests, documentation, and deployment checks.

## Scope

- Run formula, API, database, authentication, and golden-output tests.
- Verify PostgreSQL migrations and RLS separately from fast SQLite tests.
- Document local setup, deployment, data limits, and demo operation.
- Run frontend and backend checks in root GitHub workflows.

## Acceptance

CI is reproducible from a clean checkout, generated fixtures are current, documentation links resolve, secrets are absent from tracked files, and deployment defaults protect live data.
