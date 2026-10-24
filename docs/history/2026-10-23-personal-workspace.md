Historical log. Not maintained.

# Personal workspace integration

Implemented on `codex/pivott-personal-tool`, based on the merged P0 work.

## Changes

- System typography, the existing teal palette, charcoal dark surfaces and selective glass with opaque/reduced-transparency fallbacks. Removed decorative movement and whole-page entrance animation. The homepage preview now uses the same Finance Admin data and Normal calculations as the example.
- Role → tasks → initial map, followed by skill ratings and routes. Work / Routes / Plan navigation and a returning-user workspace support one active profile and plan.
- Personal title, reference template, expandable task editing, numeric/slider time shares, removal with Undo, confirmed defaults restoration, optional career goal and weekly hours. Resetting the demo preserves personal work.
- Unknown skill ratings remain unknown; explicit zero means no experience. Rated requirements alone contribute to coverage and gaps. With no rated requirements, provisional route ordering uses task similarity and target exposure. Partial routes, learning estimates and passports are labeled accordingly.
- Custom tasks remain unassessed, including legacy custom inputs with numeric assumptions. Exposure normalizes over assessed reference tasks; the selected-time coverage is shown separately. Map and List expose the same task details. Mobile details use a closable bottom sheet.
- Route descriptions, transferable skills, gaps and learning assumptions are easier to inspect. Save up to three routes. Existing scenarios, signals, API verification, comparisons, calendar export and passport tools remain available.
- Optional Supabase email-link sign-in and explicit account saves. Guest/account choices never automatically merge ratings. Database-stamped revisions prevent stale saves from overwriting newer work. Account settings are separate from the workspace; sign-out and account deletion preserve the stated device copy.

The TypeScript and Python engines were changed together. Seed contents/cut-off are unchanged, generated golden outputs were refreshed, and the fully rated demo still ranks Operations Coordinator first in Normal and Finance Systems Analyst first in Fast.

## Verification

- Frontend: 59 tests passed; production build (including TypeScript) passed.
- Backend: 66 tests passed. Existing Starlette test-client deprecation warning remains.
- Generated seed/golden checks and demo ranking check passed.
- Combined `vercel dev --local`: Next.js pages/assets, FastAPI health and both scenarios, query parameters, pathway round trip and API 404 routing passed.
- Production browser checks: desktop and mobile personal workflow, edits/rebalancing/Undo, unsupported custom tasks, Map/List details, API parity, zero versus unknown ratings, partial recommendations/plans, route saving, refresh/return, guest account fallback, dark/reduced-motion layouts, defaults restoration and demo isolation passed without page errors. The homepage had no horizontal overflow at 320px with 100%, 125% and 200% root font sizes.
- Calendar, PNG and PDF downloads were exercised; calendar content and image/PDF file signatures were checked.
- The actual SQL migration passed isolated PGlite checks for owner-only access, anonymous denial, revision stamping, stale updates and own-account deletion/cascade.
- Browser tests using the real Supabase SDK with **synthetic intercepted responses** passed explicit saving, deferred/conflicting profiles, stale revision recovery, offline save/retry, deletion, email request/cooldown, callback return path and sign-out. These are not live Supabase tests.

Reusable optional browser scripts are under `scripts/check-*-browser.cjs`; policy checks are in `scripts/test-supabase-policies.mjs`. Screenshots under `docs/` show the production build. Browser checks are local headless checks, not physical-device, email-delivery or performance benchmarks.

## Deployment prerequisites

Guest mode works without account configuration. To enable live accounts:

1. Apply [the Supabase migration](../../supabase/migrations/202610230001_profiles.sql).
2. Configure email authentication and allowed `/signin` callback URLs for the intended deployment origins.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` before rebuilding the Next.js service. Never use a service-role key in the frontend. The cloud environment draft records these variable requirements; values still need secure configuration. Saving a draft does not publish settings or configure Vercel.
4. Follow the two-account/device live checks in [Supabase setup](../../supabase/README.md), including email delivery, expiry, conflict handling and deletion.

No live Supabase project was available for those checks. This branch does not itself merge or deploy production. Direct verification of the live Vercel site remains unavailable from this environment; the owner's earlier confirmation is separate from the local results above.
