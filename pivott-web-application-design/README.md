# Pivott web application

This directory contains the Next.js application, browser state, deterministic scoring engine and same-origin API route handlers. Start with the [repository README](../README.md) for the product, sources and limits.

## Requirements

- Node.js 24
- pnpm 12.3.4, pinned in `package.json`

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Guest use requires no environment variables or database.

## Checks

```bash
pnpm lint
pnpm test
pnpm build
```

`pnpm lint` runs TypeScript and the repository copy checks. Vitest covers the engine, workflows, catalogue overlay, persistence, authentication, résumé matching, public-job parsing and notification matching.

## Runtime catalogue

`app/layout.tsx` calls `getCatalog()` in `lib/catalog.ts`, and `CatalogBoot` applies the same payload before pages render.

- The normal Vercel deployment uses the committed `lib/data/live-seed.json` snapshot plus `lib/data/catalog-supplement.ts`: 20 roles, 100 tasks, 18 skills, 3 scenarios and 17 SDGs as of 24 October 2026.
- The imported snapshot itself contains 10 O*NET roles, 60 tasks and 17 skills. The supplement adds 10 engineering, science, health and digital-design roles and one skill.
- `lib/data/jobs.live.json` contains 347 matched public listings from the dated Arbeitnow snapshot.
- If the server-only `PIVOTT_API_BASE` is configured, the app can read a separately deployed FastAPI catalogue. A failed request falls back to the committed catalogue.
- `PIVOTT_CATALOG_MODE=demo` selects the built-in deterministic demo during local work. The demo has 8 roles, 39 tasks, 15 skills, 20 signals, 25 resources, 3 scenarios and 17 SDGs as of 1 October 2026.

Refresh the public-data snapshot through the backend importer and scheduled workflow; see the [root data-source notes](../README.md#data-sources-and-licences). Do not hand-edit generated JSON.

## Main code paths

| Path | Responsibility |
| --- | --- |
| `app/` | Pages and Next.js route handlers |
| `components/` | Product flows and shared UI |
| `lib/data/seed.ts` | Built-in demo catalogue and catalogue contract |
| `lib/catalog.ts` | Committed snapshot and optional FastAPI loading |
| `lib/engine.ts` | Deterministic exposure, fit and pathway formulas |
| `lib/store.ts` | Device profile and progress persistence |
| `lib/resume/` | Local PDF/DOCX extraction and catalogue matching |
| `lib/jobs.ts` | Public listing validation, matching and filters |
| `lib/job-notifications.ts` | Device-local listing-change detection and preferences |

## API route handlers

The Vercel project contains one Next.js service. These handlers run in that service:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/analysis` | Validate inputs and calculate task and route results |
| `POST` | `/api/pathways` | Build a learning pathway |
| `GET` | `/api/roles/{id}/tasks` | Return scored tasks for a role |
| `GET` | `/api/signals` | Return dated signals and assumptions |
| `GET` | `/api/sdgs` | Return the SDG catalogue |
| `GET` | `/api/seed` | Return the active catalogue |
| `GET` | `/api/live/status` | Return source and snapshot metadata |
| `GET` | `/api/live/jobs` | Return or refresh matched public listings |
| `GET` | `/api/health` | Return status and catalogue version |

The handlers and browser use `lib/engine.ts`. The optional FastAPI service mirrors formulas for parity checks.

## Accounts and privacy

Guest profiles remain in browser storage. Optional Supabase accounts support password, email-code and Google sign-in with owner-only row policies. Follow the [Supabase setup](../supabase/README.md) for migrations, redirect URLs and live provider checks.

Résumé files are parsed locally and discarded after review. Job-update preferences and listing fingerprints are device-local. Vercel Analytics loads only after consent. The complete policy is available at `/privacy`.

## Data changes

After changing `lib/data/seed.ts`, run from the repository root:

```bash
node scripts/generate-data.mjs
```

This regenerates `backend/app/data/seed.json` and `backend/tests/golden.json`. Formula changes must be implemented in both TypeScript and Python before regenerating and running both test suites.

## Design and component reference

- [`DESIGN.md`](DESIGN.md) defines visual and copy rules.
- `/styleguide` renders shared components and states.
- The [documentation index](../docs/README.md) links architecture, deployment and verification notes.
