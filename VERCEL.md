# Deploy Pivott as one Vercel project

Import `truffleloaf/SDC-Hack` as a single Vercel project with its Root Directory set to the repository root (leave it blank in the dashboard). The root `vercel.json` declares two services, each built from its own directory:

| Service | Framework | Public paths |
| --- | --- | --- |
| `backend` | FastAPI; entrypoint `app.main:app` | `/api` and `/api/*` |
| `pivott-web-application-design` | Next.js | All other paths, including `/`, application pages, and `/_next/*` |

The `entrypoint` must use Vercel's Python `module:attribute` form
(`app.main:app`, resolved inside the `backend/` service root), not a file path
such as `app/main.py`. A file path is valid only for Node.js services; with it,
every `/api/*` request fails before FastAPI runs and the browser sees Vercel's
generic `{"error":{"code":"500","message":"A server error has occurred"}}`.

The API rewrite comes first. It preserves the `/api` prefix, which FastAPI already uses for its routers. The frontend catch-all comes last; directing that catch-all to the backend would hide the website. Frameworks and entrypoint are declared per service, with routing at the project level. The Next.js service explicitly uses pnpm 12.3.4 and a frozen lockfile for installation, rather than relying on Vercel’s lockfile-version heuristic to choose pnpm.

## Calls and bindings

There are no existing cross-service calls, hardcoded service hostnames, or frontend API base URLs to replace. Pivott's browser workflow computes scores and pathways locally using `lib/engine.ts` and browser state. The opt-in Verify with API control sends task/skill inputs to same-origin `/api/analysis`; under services routing this reaches FastAPI. Next.js also has standalone API handlers; in the combined deployment, public `/api/*` traffic goes to FastAPI instead. Plain `pnpm dev` continues to provide the standalone Next.js API.

No binding is necessary for this topology. Supabase public build variables are optional for account saving and are unrelated to service bindings. Do not add a dummy binding, expose an internal URL with a `NEXT_PUBLIC_*` variable, or set a binding variable manually. If server-side Next.js functions later call an internal backend, declare a service binding on the Next.js service and read its injected URL at request time. Browser-side calls should use same-origin `/api/*` paths.

FastAPI's `/docs`, `/redoc`, `/openapi.json`, and `/` are not publicly routed in this proposal. These paths currently go to Next.js. Exposing API documentation would require explicit rewrites to `backend` before the frontend catch-all.

## Backend storage on Vercel

Vercel Functions get a read-only checkout; only `/tmp` is writable. When the
backend service has no `PIVOTT_DB` or `DATABASE_URL`, the API now falls back to
an ephemeral SQLite file under `/tmp` and reseeds the demo catalogue whenever a
new instance starts. Catalogue, analysis and pathway endpoints work in that
mode, but saved profiles and user-created signals do not survive an instance.

For persistent data — and for `/api/me/profile`, which stores rows per Supabase
user — set `DATABASE_URL` on the backend service to the Supabase Session pooler
string, and run `backend/supabase/schema.sql` plus every file in
`backend/supabase/migrations/` before deploying. See
[Supabase setup](backend/supabase/README.md) and
[backend auth docs](backend/docs/auth.md).

## Local multi-service development

Use Node.js 24, Python 3.12, and the frontend's pinned pnpm version, 12.3.4. Ensure `pnpm --version` reports `12.3.4` in the shell running Vercel; the local runner resolves pnpm from PATH. Install frontend dependencies with `pnpm install --frozen-lockfile` in `pivott-web-application-design`; install `backend/requirements.txt` in a Python virtual environment. Guest mode needs no database or application secrets. For optional account saving, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on the Next.js service before building, apply the included Supabase migration, and configure email callback URLs. See [Supabase setup](supabase/README.md). Never expose a service-role key.

From the repository root, run:

```bash
npx vercel@65.1.0 dev --local
```

`--local` runs without authentication or creating a Vercel project. To pull project environment variables, omit `--local` and link to your existing project. Use Vercel's secure login flow or environment settings; do not put tokens in source files. `vercel dev` runs both services; starting only `pnpm dev` does not test the root service routing. Stop any existing server using the selected local port first, or pass `--listen 3002`.

Run the automated routing check against the printed local origin:

```bash
python scripts/smoke_vercel.py http://localhost:3000
```

Use the printed `localhost` hostname for browser checks; Next.js rejects dev-only requests from unconfigured host aliases. The check exercises page/asset routing, FastAPI analysis in both scenarios, query parameters, pathway creation/retrieval, and the FastAPI 404 response. It uses only Python’s standard library. You can also check manually:

- `/` renders Pivott's landing page.
- `/_next/*` assets and the retained local font assets load from Next.js.
- `/api/health` returns `status: "ok"`, seed version `2026.10.1`, and counts including 6 roles and 31 tasks.
- `/api/analysis` and `/api/pathways` accept the documented payloads in `backend/README.md`.
- Open the demo and complete map → routes → pathway → passport; verify signals, scenario controls and export tools remain available.

## Troubleshooting: every `/api/*` returns 500

A generic Vercel 500 — `{"error":{"code":"500","message":"A server error has occurred"}}` —
means the FastAPI service failed before the application could answer, so CORS
and the `{"error": ...}` envelope never run. Check these in order:

1. `services.backend.entrypoint` is `app.main:app` (`module:attribute`), not a
   file path like `app/main.py`; a file path is only valid for Node.js.
2. `services.backend.root` is `backend` and `backend/app/__init__.py` exists,
   so `app.main` is importable from the service root.
3. The backend service logs show the startup exception (Vercel → Project →
   Logs → Functions). Reproduce with `pytest` and `uvicorn app.main:app`.
4. If `DATABASE_URL` is set, the database is reachable and every migration in
   `backend/supabase/migrations/` has run. If it is not set, the API uses the
   ephemeral `/tmp` SQLite database; no further configuration is required.

Independent checks remain `pnpm test` and `pnpm build` in the frontend, `pnpm exec tsc --noEmit --incremental false` for explicit type checking, and `python -m pytest -q` in `backend`.

## Review before deploying

Confirm both service names, public path assignments, whether API documentation should be public, and the absence of bindings (no current server-to-server calls). This configuration does not create a Vercel project, link an account, or publish a deployment by itself.
