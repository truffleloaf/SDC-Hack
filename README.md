# Pivott

Pivott helps people examine how AI could affect the tasks in their working week, identify adjacent roles that reuse their skills, and build a practical learning pathway. It uses deterministic formulas and a versioned sample dataset, without LLM scoring. Guest profiles and progress stay in your browser. Optional Supabase email-code or Google sign-in enables account sync; it requires project configuration and the included database migration. An optional **Verify with API** check compares local results with a stateless backend using task/skill inputs, without sending your display name or progress.

**[Live demo](https://pivottstudio.vercel.app)** · [Design direction](pivott-web-application-design/DESIGN.md) · [Vercel setup](VERCEL.md) · [English demo script](backend/docs/demo-script.en.md)

![Pivott homepage and interactive task map](docs/pivott-desktop.png)

## How it fits together

```mermaid
flowchart LR
  Browser[Browser UI] <--> Local[LocalStorage: profile and progress]
  Browser -->|Optional code or Google sign-in and sync| Supabase[Supabase Auth and owner-only profile storage]
  Browser --> TS[TypeScript scoring engine]
  Seed[seed.ts] --> TS
  Seed --> Export[generate-data.mjs]
  Export --> JSON[seed.json and golden outputs]
  JSON --> Python[Python scoring engine]
  Browser -->|Opt-in Verify with API| Router[Same-origin POST /api/analysis]
  Router -->|Standalone pnpm dev| Next[Next.js API handlers]
  Next --> TS
  Router -->|Vercel services| FastAPI[FastAPI service]
  FastAPI --> Python
```

The website is served by Next.js. Under Vercel services, `/api/*` goes to FastAPI; all other paths go to Next.js. There are no server-to-server service calls, so no internal service bindings are needed. See [architecture in English](backend/docs/architecture.en.md) or [中文架构](backend/docs/architecture.md).

## Run locally

Use Node.js 24 and pnpm 12.3.4 (pinned in the frontend package). For the standalone website, from the repository root:

```bash
cd pivott-web-application-design
npx --yes pnpm@12.3.4 install --frozen-lockfile
npx --yes pnpm@12.3.4 dev
```

Open the local address printed by Next.js. This mode includes the Next.js API implementation, so it needs no separate backend.

For both services, also use Python 3.12 and prepare the backend from the repository root:

```bash
python -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npx --yes --package=pnpm@12.3.4 --package=vercel@65.1.0 vercel dev --local
```

On Windows, use `backend\.venv\Scripts\python.exe` instead. The combined runner starts both services. Use its printed `localhost` address; unconfigured host aliases can be blocked by Next.js's development-origin checks. The Vercel project Root Directory must be the repository root. Full details are in [VERCEL.md](VERCEL.md).

## Verify

Run the following from the repository root:

```bash
(cd pivott-web-application-design && pnpm test && pnpm exec tsc --noEmit --incremental false && pnpm build)
(cd backend && .venv/bin/python -m pytest -q)
node scripts/generate-data.mjs --check
node scripts/demo-rankings.mjs
```

Use pnpm 12.3.4 on PATH (or substitute `npx --yes pnpm@12.3.4` for `pnpm`). Windows users can run the commands in each directory individually.

With `vercel dev` running, check the combined router (replace the origin if you chose another port):

```bash
python scripts/smoke_vercel.py http://localhost:3000
```

In the app, load **View an example**, open the map, and click **Verify with API**. Expect `Matches API: 6/6 tasks, role exposure matches, route order identical.` Repeat in Fast, then add a signal under Signals → Admin, recompute the map, and verify again. A network error leaves the local results usable. Verification is opt-in and sends task/skill inputs, custom tasks, and applied custom signals; the application does not store those request inputs.

Normal ranks **Operations Coordinator** first for Aisyah; Fast ranks **Finance Systems Analyst** first. The hero uses Finance Admin task assessments from the engine. Following the default Normal route gives 4 learning steps, 48 estimated hours, and 8 weeks at the default 6 hours/week. Selecting another role intentionally changes the destination.

Frontend and backend checks run in [.github/workflows](.github/workflows). The browser scripts `scripts/check-briefs-browser.cjs`, `scripts/check-briefs-interactions.cjs`, `scripts/check-interactive-browser.cjs`, `scripts/check-polish-browser.cjs` and `scripts/check-account-browser.cjs` use externally installed Playwright (set `PLAYWRIGHT_MODULE` and `PIVOTT_TEST_ORIGIN`; optionally `PIVOTT_CHROMIUM_EXECUTABLE`). The briefs check writes screenshots under `/tmp/pivott-briefs-screenshots` or `PIVOTT_SCREENSHOT_DIR`; run it against guest-mode Next.js or combined Vercel services. The account check uses synthetic Supabase responses; see [its setup](supabase/README.md).

The current suites cover formulas, the demo workflow, every skill's free-resource coverage, custom-input validation, cross-language goldens, API errors, and CORS.

## Résumé import

Start with a PDF or DOCX résumé to review local catalogue suggestions before changing your profile. Files are read in the browser; extracted text is discarded and new skills stay unrated. Manual setup remains available. See [supported files, privacy and tests](docs/resume-import.md).

## Personal workflow and account saving

Choose a reference role, confirm its tasks, then view the initial map before rating skills. A personal job title and task names do not change the template's illustrative scores. Time edits rebalance to 100%; task removal has Undo, and restoring defaults requires confirmation. Custom tasks remain **Not assessed yet**, including older custom tasks with numeric assumptions. Exposure is conditional on assessed reference tasks, with the assessed share shown separately.

**Not sure** is distinct from level 0 (**No experience**). Unanswered skills stay out of learning gaps. Fit is bounded by counting their contribution as zero (lower bound) or fully met (upper bound), using all requirement importance in the denominator. Routes rank by the lower bound; partial learning estimates include rated gaps only. Users can save up to three routes and resume one active profile/plan at `/workspace`.

Accounts are optional. Follow [Supabase setup](supabase/README.md) for owner-only RLS, public build variables, SMTP/OTP and Google settings. Signing in starts sync; different versions require a choice, replacements have a 30-second backup/undo, and stale revisions cannot overwrite another device silently. Account settings live at `/account`. No service-role key is used by the frontend.

## Data and maintenance

The dataset has 8 reference roles, 39 tasks, 15 skills, 8 published signals and 12 undated assumptions, 4 SDGs, 25 resources, and 2 scenarios. Every skill has at least one free resource. The data cut-off remains 1 October 2026; seed version is `2026.10.4`.

Edit `pivott-web-application-design/lib/data/seed.ts` and regenerate `backend/app/data/seed.json` and `backend/tests/golden.json` with:

```bash
node scripts/generate-data.mjs
```

Do not hand-edit the JSON. Formula changes must be mirrored in both engines, followed by regeneration and both test suites. [Backend documentation](backend/docs/README.md) includes English and Chinese guides.

## Limits and privacy

- Exposure measures potential task assistance or automation; it is **not a probability of job loss**. Base scores and role mappings are illustrative editorial inputs, not measured labour-market forecasts.
- The eight reference roles are a small sample catalogue; an own-task path supports other jobs without an assessment. Published signal references do not independently validate the assigned task scores. No live job/news feed or LLM is used.
- Learning durations are estimates; course availability, pricing, and external links can change.
- Guest work stays in this browser. With configured Supabase, signing in syncs profile fields, ratings, selected tasks, saved routes, signals and plan progress. Different device/account versions require a choice; ratings are never merged automatically. See [account setup and policies](supabase/README.md). Verification sends inputs only when clicked. Local calculation keeps working if verification fails; offline page reloads are not guaranteed because this is not a PWA.
- The public API has no authentication or application rate limiter. Apply hosting-edge abuse controls before wider use. CORS is restricted to explicit origins and is not an authentication or rate-limit mechanism.
- The passport is a personal planning summary, not a qualification or verifiable credential.

The live address was confirmed by the project owner; direct live-site requests are blocked from the development environment. Automated checks here validate local builds and the combined services router, not the current production deployment.

Presentation: Present in an incognito window, or open `/?welcome=1`. Returning visitors can stay on the landing page and continue their saved plan.


## Current deployment

Vercel serves the Next.js application and its route handlers. It uses the committed, dated O*NET/Arbeitnow catalogue when no optional external FastAPI URL is configured. FastAPI remains available for catalogue imports, PostgreSQL APIs and independent scoring checks. Demo fixtures are synthetic and separate from live data. See `docs/briefs-2-3-report.md` for the interaction and authentication changes.

## Domain 1 must-haves

| Requirement | Implementation | Current boundary |
| --- | --- | --- |
| Skills intake | `/start`, local PDF/DOCX/text review, `/skills` | Demo uses synthetic profiles only |
| Updatable signals | `/signals`, `backend/app/live/trends.py`, weekly/manual `refresh-live.yml` | Existing snapshot has no window history; real feed refresh must meet minimum counts |
| Explainable matching | `/routes`, fit bounds, baseline comparison, 3/5/10 choices | Model estimates, not hiring decisions |
| Reskilling | `/pathway`, priorities, hours/weeks, free filter and resource provenance | No live courses added without verifying exact pages; “No vetted resource yet” |
| SDGs | 17 goals, every role/skill tagged, focus bonus and contribution panels | Team mapping, not UN classification or measured impact |
| Uncertainty | Slow/Normal/Fast table, ranges, confidence inputs | Team assumptions, not predictions |

`docs/domain1-report.md` records validation and source limitations. The Vercel application works with committed snapshots and no FastAPI deployment. Optional FastAPI deployments must apply the new migrations before restarting. Configure the Supabase email template in `supabase/templates/magic-link-code.html` to send the six-digit sign-in code; UI changes cannot update project email templates without project-management access.
