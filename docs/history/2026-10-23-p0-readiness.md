Historical log. Not maintained.

# P0 hackathon-readiness report

Scope: P0.1–P0.5 only, in order, one commit per task. P1 and P2 have not been started. The original palette, components, browser storage model and deterministic formulas are preserved.

## P0.1 — Demo story: completed

Confirmed the mismatch by executing the TypeScript `computeRoutes` implementation using the actual demo persona in both scenarios (`node scripts/data/demo-rankings.mjs`):

| Scenario | First route / score | Second route / score |
| --- | --- | --- |
| Normal | Operations Coordinator / 58.78912 | Finance Systems Analyst / 58.28684 |
| Fast | Finance Systems Analyst / 55.49684 | Operations Coordinator / 55.14412 |

Changed `lib/demo.ts`, `lib/store.ts`, `components/landing/career-route.tsx`, `lib/workflow.test.ts`, `vitest.config.ts`, `scripts/data/demo-rankings.mjs`, and `scripts/data/frontend-modules.mjs`. The landing destination and demo use shared defaults. The regression test checks the rendered landing story against the top route. The default journey through `/example`, `/map`, `/routes`, `/pathway`, and `/passport` was also checked in a browser: Normal consistently leads to Operations Coordinator unless a different route is intentionally selected.

After-task verification: 22 frontend tests passed; explicit TypeScript check and build passed; 31 backend tests passed. No score formula or seed change was needed. Commit: `4bfdb75`.

## P0.2 — Enforced type checking: completed

Confirmed `next.config.mjs` had `typescript.ignoreBuildErrors: true`; removed that block. No existing TypeScript errors were found, and no `any` or `@ts-ignore` workaround was introduced.

After-task verification: 22 frontend tests, explicit TypeScript check, enforced Next.js build, and 31 backend tests passed. Commit: `9312b21`.

## P0.3 — Free-only resource coverage: completed

Confirmed Data analysis had only paid resources. Added Microsoft's free Working with Data lessons after checking the GitHub URL returned HTTP 200 and reading the module description. Resource URL: https://github.com/microsoft/Data-Science-For-Beginners/tree/main/2-Working-With-Data.

Changed `lib/data/seed.ts`, generated `backend/app/data/seed.json` and `backend/tests/golden.json`, `scripts/data/generate-data.mjs`, the frontend workflow tests and backend engine/API tests. Updated resource/version documentation in the frontend/backend READMEs, backend seed module/docs, and `docs/deployment/vercel.md`. The seed now has 25 resources and version `2026.10.2`; the scoring cut-off and all formulas are unchanged. Generation uses the TypeScript seed and engine, not hand-edited JSON. Both suites assert free-resource coverage for every skill.

After-task verification: 37 frontend tests, TypeScript, build, and 46 backend tests passed. Export/golden `--check` passed. Commit: `f2b9b82`.

## P0.4 — Real API verification and custom parity: completed

Confirmed both API implementations excluded custom tasks/applied custom signals while the client included them. Added the typed opt-in `lib/remote.ts` request, `components/map/verify-analysis.tsx`, and the map control. Verification compares task exposures, weighted role exposure and ordered route IDs with a `1e-9` floating-point tolerance. Input changes invalidate old results; requests have cancellation/timeout handling, and failure preserves local results.

Updated `lib/api.ts`, new `lib/custom-inputs.ts`, the Next analysis handler, `backend/app/parsing.py`, and `backend/app/routers/analysis.py`. Both validate custom inputs, protect seed IDs, apply editor-range clamps, and force custom evidence to `user`. Aligned a pre-existing zero-hours fallback discrepancy: both parsers now use 6 hours. Expanded shared goldens and TypeScript/Python tests for custom inputs in Normal/Fast, validation, network errors and privacy of the request payload. The API omits display name, progress, cookies and pending signals and does not persist submitted profiles. The API control explains that task and skill inputs are sent when clicked.

`backend/app/main.py` now has explicit deployed/local CORS origins, configurable through `PIVOTT_CORS_ORIGINS`. Updated frontend/backend READMEs and `docs/deployment/vercel.md` with CORS, stateless verification, and rate-limit limitations. No internal service binding is needed because the browser calls a same-origin public API, not another service from server-side code.

After-task verification: 49 frontend tests, TypeScript, enforced build and 64 backend tests passed. Browser checks passed on standalone Next.js and combined `vercel dev --local`: default destination through passport; no automatic verification request; Normal/Fast verification with seed/custom tasks; a real signal added through Admin, recomputed and verified in both scenarios; offline error and continued use of local scenario/list controls; mobile overflow check. Combined routing smoke passed for pages/assets, FastAPI health/analysis/query parameters/pathway round trip/404.

Local runner note: use its printed `localhost` address. The attempted browser check through `127.0.0.1` hit Next.js's dev-origin protection; using the supported printed origin passed. Direct HTTP routing checks also passed. Commit: `47cd9e5`.

## P0.5 — Repository front door and CI: completed

Rewrote root `README.md` with pitch, owner-confirmed live address, real screenshot (`docs/screenshots/home-desktop.png`), architecture diagram, local/combined run commands, verification, data maintenance, privacy and honest limits. Renamed the frontend package to `pivott-web`; frozen installation passed without lockfile changes.

Added English architecture and demo-script documentation, corrected the earlier architecture claim that root CI was missing, and updated stale versions, counts, demo-story details, and README descriptions. Added `.github/workflows/frontend.yml` with frozen install, tests, an explicit TypeScript check, and a build. The existing backend workflow was retained. This report is part of the documentation task.

After-task verification: frozen pnpm 12.3.4 install, 49 frontend tests, explicit TypeScript, enforced production build, and 64 backend tests passed. Workflow YAML parses; relative documentation links and generated seed/golden checks pass. GitHub-hosted CI execution is pending a PR or qualifying push; local results do not establish a hosted CI pass. The combined runner had been stopped after P0.4, so its smoke check was not repeated for documentation/package-name-only changes.

## Limits, refutations and deliberately skipped work

- No pre-existing type errors were found after removing the build bypass. All other P0 findings were confirmed.
- Direct requests to the live deployment are blocked by this environment's network policy. The owner confirmed the provided live address loads Pivott. Local validation is not a production-deployment check.
- GitHub API requests return Forbidden in this environment. Git fetch/push works; automatic PR creation and hosted CI status checks are unavailable through that API.
- Existing upstream warnings remain: FastAPI/Starlette's httpx TestClient deprecation and Vite's notice about future config-loader defaults. They do not cause test/build failures.
- No application authentication/rate limiter was added; hosting-edge abuse controls remain necessary. CORS is not a substitute.
- The old decorative passport reference/QR, small role catalogue, methodology expansion, fake recompute delay, error pages, Open Graph, browser-test infrastructure and Lighthouse work are P1/P2 and deliberately untouched. Browser smoke checks were executed for P0, not added as the deferred P2 Playwright suite.
- No merge or deployment is performed by these commits. Stop here and review P0 before authorizing P1.
