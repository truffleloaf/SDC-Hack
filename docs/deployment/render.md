# Deploy the optional API on Render

This guide deploys FastAPI as a persistent Render service beside the public Vercel web application.

## Blueprint

1. Sign in to Render and create a Blueprint.
2. Connect this repository.
3. Select backend/render.yaml when Render asks for a Blueprint path.
4. Review the service name, region, plan, and environment variables.
5. Deploy and wait for /api/health to report ok.

## Manual web service

Use these settings when creating the service manually:

| Setting | Value |
|---|---|
| Root directory | backend |
| Runtime | Docker or Python 3.12 |
| Build command | pip install -r requirements.txt |
| Start command | uvicorn app.main:app --host 0.0.0.0 --port $PORT |
| Health path | /api/health |

For a demo service, set PIVOTT_DATASET=demo and use a persistent SQLite disk or dedicated PostgreSQL database. For a live service, set PIVOTT_DATASET=live and provide an explicit PostgreSQL URL. Keep ALLOW_DEMO_RESET=false on public services.

## Connect the web app

The current Vercel production deployment uses Next.js route handlers and does not require Render. If you intentionally switch browser API verification to FastAPI, set the documented public API base variable to the Render HTTPS origin and add the Vercel origin to PIVOTT_CORS_ORIGINS.

Do not place database credentials, JWT secrets, or service-role keys in public Vercel variables.

## Verify

Check:

    GET https://your-service.onrender.com/api/health
    GET https://your-service.onrender.com/api/auth/config

Then open /docs and test a read-only catalogue endpoint. If authentication is enabled, confirm signInEnabled is true and perform account checks with a non-production test user.

Render free services may sleep and produce a slow first request. SQLite needs a persistent disk; multiple instances require PostgreSQL.
