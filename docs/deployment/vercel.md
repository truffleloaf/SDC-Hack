# Deploy Pivott as one Vercel project

Import `truffleloaf/SDC-Hack` as a single Vercel project with its Root Directory
set to the repository root (leave it blank in the dashboard). The root
`vercel.json` declares **one** Next.js service:

| Service | Framework | Public paths |
| --- | --- | --- |
| `pivott-web-application-design` | Next.js | All paths, including `/` and `/api/*` |

There is no FastAPI service in this deployment. `vercel.json` only has a
catch-all rewrite to the Next service, so `/api/*` is handled by the Route
Handlers in `pivott-web-application-design/app/api/*`.

## Live snapshot, not a second backend

The root layout and every Route Handler call `getCatalog()`. When
`PIVOTT_API_BASE` is unset (the Vercel case), it applies the committed snapshot:

```text
pivott-web-application-design/lib/data/live-seed.json
pivott-web-application-design/lib/data/live-meta.json
```

This is the code-only deployment path: no private Vercel environment variables,
external API host or database is required. The deployed catalogue adds the
reviewed supplement to the imported snapshot, producing 20 roles, 100 tasks,
18 skills, 17 SDGs and 3 scenarios. The 24 October 2026 snapshot has 347
matched Arbeitnow postings in `jobs.live.json` and metadata.

To refresh it, start the root FastAPI in live mode and run:

```bash
node scripts/data/export-live-seed.mjs http://127.0.0.1:8001
```

Commit both JSON files and push; Vercel redeploys automatically.

## Account saving

`next.config.mjs` contains public fallbacks for
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The
publishable/anon key is designed to be public and is protected by RLS; never
put a service-role key in this repository. The values may be overridden with
real environment variables if they are ever rotated.

Email confirmation, password reset and OAuth still need the Vercel domain in Supabase
**Authentication → URL Configuration** (Site URL and redirect allow-list);
that setting is in the Supabase dashboard, not in this repository.

## Local development

Use Node.js 24 and pnpm 12.3.4. From `pivott-web-application-design`:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Standalone `pnpm dev` uses the Next API handlers. To use the root live FastAPI
instead of the committed snapshot, set `PIVOTT_API_BASE` in `.env.local` (for
example `http://127.0.0.1:8001`). If the external API is down, `getCatalog()`
falls back to the committed snapshot.

`backend/` is the optional FastAPI service and public-data importer. It can be
deployed separately, but it is not part of the Vercel service in `vercel.json`.

## Checks

```bash
cd pivott-web-application-design
pnpm test
pnpm exec tsc --noEmit --incremental false
pnpm build
```

Manual checks after deploy:

- `/` and `/start` show the dated catalogue banner and O*NET occupations.
- `/api/health` reports the active supplemented catalogue.
- `/api/seed` has `demoPersona: null`.
- `/api/roles/bookkeeping-clerk/tasks` returns 200.
- `/api/analysis` works for a live role.
- `/signin` offers password, email-code and Google sign-in when Supabase is configured.
