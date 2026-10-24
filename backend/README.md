# Pivott FastAPI backend

This optional service mirrors Pivott's deterministic TypeScript scoring contract and supports catalogue imports, PostgreSQL verification, authenticated profile APIs, and cross-engine checks.

The deployed Vercel product uses the Next.js route handlers in [web/app/api](../web/app/api). You can run the web app without this backend.

## Run locally

From the backend directory:

    python -m venv .venv
    .venv/bin/python -m pip install -r requirements.txt
    PYTHONPATH=. .venv/bin/python -m uvicorn app.main:app --reload --port 8001

Open http://127.0.0.1:8001/docs or request http://127.0.0.1:8001/api/health.

## Test

    PYTHONPATH=. .venv/bin/python -m pytest -q

The full PostgreSQL schema, migrations, seed, RLS, and API verification is:

    python scripts/verify_pg.py --url postgresql://postgres:postgres@localhost:5432/postgres

## Datasets

PIVOTT_DATASET selects demo or live. Demo defaults to a local SQLite database and uses the generated catalogue in app/data/seed.json. Live requires an explicit database URL and is populated through app/live from O*NET 31.0 and public job feeds.

Demo and live databases must remain separate. The meta.dataset marker prevents the demo seeder from writing into a live database.

## Documentation

- [Documentation index](docs/README.md)
- [API contract](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)
- [Authentication](docs/auth.md)
- [Live data](docs/live-data.md)
- [Deployment](docs/deploy.md)
- [Local PostgreSQL verification](docs/local-postgres.md)
- [Three-minute demo script](docs/demo-script.md)

## Security boundary

Supabase handles passwords and sessions. The FastAPI service verifies access tokens and derives user identity from the token subject. Browser clients receive only the Supabase URL and publishable key. Never expose a database URL or service-role key to the browser.

Scores are deterministic estimates. Task exposure is not a probability of job loss, and route scores are not hiring decisions.
