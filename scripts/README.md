# Repository scripts

This index explains each data, browser and repository check script, how to run it from the repository root, and any required environment variables.

Browser checks expect a running production or development web server. They use `PIVOTT_TEST_ORIGIN` when set and otherwise use the default declared in each script. Set `PLAYWRIGHT_MODULE` when Playwright is installed outside the frontend package; `CHROMIUM_MODULE` or `PIVOTT_CHROMIUM_EXECUTABLE` can select another Chromium installation. Checks using Axe also accept `AXE_PLAYWRIGHT_MODULE`.

## Data scripts

| Script | Purpose | Command | Environment |
|---|---|---|---|
| [`data/generate-data.mjs`](data/generate-data.mjs) | Generate or compare backend seed and golden files from the TypeScript source. | `node scripts/data/generate-data.mjs --check` | None |
| [`data/export-live-seed.mjs`](data/export-live-seed.mjs) | Export a running live FastAPI catalogue into the committed Next.js snapshot. | `node scripts/data/export-live-seed.mjs http://127.0.0.1:8001` | Optional `PIVOTT_API_BASE` or `NEXT_PUBLIC_API_BASE` |
| [`data/demo-rankings.mjs`](data/demo-rankings.mjs) | Print deterministic demo role rankings for the supported scenarios. | `node scripts/data/demo-rankings.mjs` | None |
| [`data/frontend-modules.mjs`](data/frontend-modules.mjs) | Load TypeScript seed and engine modules for the other data scripts. | Imported helper; no direct command | None |

## Browser scripts

| Script | Purpose | Command | Environment |
|---|---|---|---|
| [`browser/helpers.cjs`](browser/helpers.cjs) | Launch Chromium for browser checks. | Imported helper; no direct command | `PLAYWRIGHT_MODULE`; optional `CHROMIUM_MODULE`, `PIVOTT_CHROMIUM_EXECUTABLE` |
| [`browser/account-sync.cjs`](browser/account-sync.cjs) | Check sign-in methods, account sync, backups, conflicts and deletion with intercepted responses. | `node scripts/browser/account-sync.cjs` | Browser variables above; optional `AXE_PLAYWRIGHT_MODULE`, `PIVOTT_TEST_ORIGIN` |
| [`browser/resume-import.cjs`](browser/resume-import.cjs) | Check local PDF/DOCX extraction, review, limits and privacy boundaries. | `node scripts/browser/resume-import.cjs` | Browser variables above; optional `PIVOTT_TEST_ORIGIN` |
| [`browser/personal-workspace.cjs`](browser/personal-workspace.cjs) | Check the full personal flow, task editing, routes, plans and responsive layouts. | `node scripts/browser/personal-workspace.cjs` | Browser variables above; optional `PIVOTT_TEST_ORIGIN`, `PIVOTT_SCREENSHOT_DIR` |
| [`browser/domain1-must-haves.cjs`](browser/domain1-must-haves.cjs) | Check Domain 1 routes, catalogue controls, accessibility and layout. | `node scripts/browser/domain1-must-haves.cjs` | Browser variables above; optional `AXE_PLAYWRIGHT_MODULE`, `PIVOTT_TEST_ORIGIN`, `PIVOTT_SCREENSHOT_DIR` |
| [`browser/reduced-motion.cjs`](browser/reduced-motion.cjs) | Check hero, scenario and transient feedback behavior across motion preferences. | `node scripts/browser/reduced-motion.cjs` | Browser variables above; optional `PIVOTT_TEST_ORIGIN` |
| [`browser/responsive-pages.cjs`](browser/responsive-pages.cjs) | Check primary pages in mobile/desktop, light/dark and Axe combinations. | `node scripts/browser/responsive-pages.cjs` | Browser variables above; optional `AXE_PLAYWRIGHT_MODULE`, `PIVOTT_TEST_ORIGIN`, `PIVOTT_SCREENSHOT_DIR` |
| [`browser/task-and-route-interactions.cjs`](browser/task-and-route-interactions.cjs) | Check task edits, map details, route ranges, signals and the missing-page flow. | `node scripts/browser/task-and-route-interactions.cjs` | Browser variables above; optional `PIVOTT_TEST_ORIGIN` |
| [`browser/keyboard-interactions.cjs`](browser/keyboard-interactions.cjs) | Check keyboard controls for previews, skills, time allocation and signals. | `node scripts/browser/keyboard-interactions.cjs` | Browser variables above; optional `AXE_PLAYWRIGHT_MODULE`, `PIVOTT_TEST_ORIGIN` |
| [`browser/skill-and-task-controls.cjs`](browser/skill-and-task-controls.cjs) | Check skill ratings, task filters, unlisted roles and plan progress. | `node scripts/browser/skill-and-task-controls.cjs` | Browser variables above; optional `AXE_PLAYWRIGHT_MODULE`, `PIVOTT_TEST_ORIGIN` |
| [`browser/legal-jobs-and-performance.cjs`](browser/legal-jobs-and-performance.cjs) | Check legal pages, authentication, job notifications, 404 behavior, accessibility and performance budgets. | `node scripts/browser/legal-jobs-and-performance.cjs` | Browser variables above; optional `AXE_PLAYWRIGHT_MODULE`, `PIVOTT_TEST_ORIGIN` |

## Repository checks

| Script | Purpose | Command | Environment |
|---|---|---|---|
| [`checks/lint-copy.mjs`](checks/lint-copy.mjs) | Reject disallowed UI phrases and native browser prompts. | `node scripts/checks/lint-copy.mjs` | None |
| [`checks/test-backend-schema.mjs`](checks/test-backend-schema.mjs) | Exercise backend schema and migrations in isolated PostgreSQL-compatible storage. | `node scripts/checks/test-backend-schema.mjs` | Optional `PGLITE_MODULE` |
| [`checks/test-supabase-policies.mjs`](checks/test-supabase-policies.mjs) | Exercise web account RLS and revision behavior in isolation. | `node scripts/checks/test-supabase-policies.mjs` | Optional `PGLITE_MODULE` |
| [`checks/smoke_vercel.py`](checks/smoke_vercel.py) | Check deployed Next.js pages, API contracts, scenarios and 404 routing. | `python scripts/checks/smoke_vercel.py http://127.0.0.1:3000` | Optional URL argument |

The Markdown link checker is documented here after it is introduced in the repository-checking change.
