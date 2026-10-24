# Deploy the optional Pivott API

This guide covers separate demo and live FastAPI deployments.

## Keep two deployments

Demo and live must use different databases and explicit PIVOTT_DATASET values. The meta.dataset marker blocks accidental cross-seeding.

| Deployment | Dataset | Database | Write behavior |
|---|---|---|---|
| Demo API | demo | SQLite volume or dedicated Supabase project | May seed on an empty database; public reset should stay disabled |
| Live API | live | PostgreSQL or Supabase | Populated only by the live importer; demo seeding is forbidden |

## Demo service

The smallest persistent deployment uses the included Dockerfile with a mounted SQLite volume.

    PIVOTT_DATASET=demo
    PIVOTT_DB=sqlite:////data/pivott.db
    PIVOTT_AUTO_SEED=true
    ALLOW_DEMO_RESET=false

A dedicated Supabase demo database is also supported. Apply backend/supabase/schema.sql and every migration in filename order before seeding.

## Live service

Live requires an explicit PostgreSQL URL:

    PIVOTT_DATASET=live
    PIVOTT_DB=postgresql+psycopg://...
    PIVOTT_AUTO_SEED=false
    ALLOW_DEMO_RESET=false

Run the importer separately with python -m app.live sync. Review source and count changes before replacing a production snapshot.

## Common variables

| Variable | Purpose |
|---|---|
| PIVOTT_DATASET | demo or live |
| PIVOTT_DB | Primary database URL |
| DATABASE_URL | Supported database URL fallback |
| PIVOTT_AUTO_SEED | Seed an empty demo database |
| ALLOW_DEMO_RESET | Enable the destructive demo reset endpoint |
| PIVOTT_CORS_ORIGINS | Comma-separated allowed web origins |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Publishable browser/auth-bridge key |

## Safeguards

- Keep demo and live databases separate.
- Keep reset disabled on public services.
- Restrict CORS to known web origins.
- Never send database or service-role credentials to the browser.
- Keep RLS enabled and test migrations on disposable PostgreSQL.
- Add application-level rate limiting before exposing the optional auth bridge publicly.

For the current Render setup, use [docs/deployment/render.md](../../docs/deployment/render.md).
