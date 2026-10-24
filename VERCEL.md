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

This is the code-only deployment path: no Vercel environment variables, no
external API host, no database. The snapshot currently has 10 O*NET roles,
60 tasks, 17 skills, 4 SDGs, 2 scenarios, 0 signals, 0 resources, and 85
Arbeitnow postings in the metadata.

To refresh it, start the root FastAPI in live mode and run:

```bash
node scripts/export-live-seed.mjs http://127.0.0.1:8001
```

Commit both JSON files and push; Vercel redeploys automatically.

## Account saving

`next.config.mjs` contains public fallbacks for
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The
publishable/anon key is designed to be public and is protected by RLS; never
put a service-role key in this repository. The values may be overridden with
real environment variables if they are ever rotated.

Magic-link sign-in still needs the Vercel domain in Supabase
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

`backend/` is the legacy stateless demo FastAPI used by older checks; it is not
part of the Vercel service in `vercel.json`.

## Checks

```bash
cd pivott-web-application-design
pnpm test
pnpm exec tsc --noEmit --incremental false
pnpm build
```

Manual checks after deploy:

- `/` and `/start` show the “Live catalogue” banner and O*NET occupations.
- `/api/health` reports 10 roles / 60 tasks / 17 skills / 0 signals.
- `/api/seed` has `demoPersona: null`.
- `/api/roles/bookkeeping-clerk/tasks` returns 200.
- `/api/analysis` works for a live role.
- `/signin` shows “Send sign-in link” when the Supabase defaults are active.
