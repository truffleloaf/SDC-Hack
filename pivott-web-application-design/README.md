# Pivott

> Don't predict the job. Map the tasks. Route the skills.

Pivott shows how AI may affect the individual **tasks** in a job, then routes your existing skills toward possible adjacent roles with a practical learning pathway. All scores are deterministic and computed from stored seed data. Nothing comes from an LLM.

**Important:** task exposure measures how much of the work AI could potentially handle. It does **not** predict job loss. All seeded roles, tasks, and signals are **illustrative demo data**.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- Framer Motion (motion), D3 force simulation (task map), Radix primitives, Lucide icons
- `html-to-image` (PNG) and `jspdf` (PDF) for Skill Passport export
- Next.js Route Handlers under `app/api/*` act as the API layer. They share the same scoring engine (`lib/engine.ts`) with the client, with parity checks against the FastAPI port, including validated custom tasks and applied signals.
- Vitest for unit and workflow tests

> The repository includes a FastAPI port in `backend/`. In the multi-service Vercel deployment, `/api/*` routes to FastAPI; standalone `pnpm dev` uses the Next.js handlers. Browser scoring remains local, with an opt-in Verify with API control on the map.

## Setup

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Guest mode needs no environment variables or database. Optional Supabase email-link sign-in and account saving require [the migration and configuration](../supabase/README.md).

## Seed data and reset

- Seed data lives in `lib/data/seed.ts`: 6 roles, 31 tasks, 15 skills, 20 dated signals, 2 scenarios, 4 SDGs, 25 learning resources (at least one free option for each skill), and the demo persona **Aisyah (Finance Admin)**.
- `GET /api/seed` returns the seed version and counts. `POST /api/seed` returns the demo persona for a stateless reset; it does not store or clear browser-local custom signals.
- In the browser, **⋯ menu → Delete my data** clears your locally stored profile and progress (`pivott:v1` and `pivott:v1:personal` in localStorage).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/profiles` | Validate and echo a profile (role, tasks, skills) |
| POST | `/api/analysis` | Task exposure, classifications, and ranked routes |
| POST | `/api/pathways` | Build a learning pathway for a target role |
| GET | `/api/pathways/{id}` | Fetch a pathway (`{targetRoleId}`) with query params |
| GET | `/api/roles/{id}/tasks?scenario=normal\|fast` | Scored tasks for a role |
| GET | `/api/signals` | Dated signals with sources |
| GET | `/api/sdgs` | Sustainable Development Goal references |
| GET | `/api/health` | Health and seed version |

## Formulas (`lib/engine.ts`)

```
recency            = 0.5 ^ (age_days / 180)
signal_adjustment  = clamp(Σ strength × direction × recency × impact, -0.2, 0.2)
exposure           = clamp(base_exposure × scenario.multiplier + signal_adjustment, 0, 1)
role_exposure      = Σ time_share × exposure
classification     = Automate if exposure ≥ 0.65 and human_judgment < 0.4
                     Protect  if human_judgment ≥ 0.65
                     Augment  otherwise
skill_coverage     = Σ rated(importance × min(level / required, 1)) / Σ rated importance
fit                = 100 × (0.8 × coverage + 0.2 × task_similarity)   (falls back to coverage)
gap                = max(0, required - level)
gap_priority       = gap × importance × (role_demand / 100)
weeks              = ceil(Σ gap_hours / hours_per_week)
```

Unrated requirements are excluded from skill gaps and hours, not assigned level 0. With no ratings for a role, provisional fit uses task similarity only. Custom tasks are unassessed; role exposure normalizes over reference tasks, and assessment coverage is returned separately.

Every route card has a **View route** sheet that shows these values for the selected role.

## Tests

```bash
pnpm test
```

- `lib/engine.test.ts` covers each formula, the classification thresholds, scenario recalculation, and ranking changes between Normal and Fast.
- `lib/workflow.test.ts` covers the main workflows: share normalisation while adding, adjusting, and removing tasks; demo persona → map → routes → pathway; free-only resources; hours/week vs. duration; `.ics` export validity; and display-name sanitisation and fallbacks.

## Demo script (about 2 minutes)

1. **Landing**: hover the living task map. Click **View an example** to load Aisyah. A banner marks demo mode, and your own profile is kept aside untouched.
2. **Task map**: switch **Normal → Fast** and watch bubbles, the headline exposure, and classifications recalculate. Click a bubble to pin its details, then copy the "Try this week" tip. Toggle **List** to see the sortable table.
3. **Routes**: switch scenarios to watch the ranking reorder. Open **Why this score?** and try **Compare**.
4. **Pathway**: drag hours/week, toggle free-only, check off steps, then use **Add to calendar** to download the `.ics` file.
5. **Passport**: edit the name, then download a PNG or PDF, or copy the summary.
6. **Signals**: use **Admin → add a signal → Recompute map**. Changed tasks are highlighted on the map.
7. Leave the demo with **Exit demo** in the banner, or start fresh from **Map my work**.

## Display name

Your name is optional and stays in localStorage unless you explicitly save the profile to an account. You can set or edit it on the onboarding screen, in the header menu, or on the passport. When no name is set, greetings say "Hi there". Names are sanitised (no angle brackets or control characters, 40 characters max) and always rendered as text, never as HTML.

## Privacy

Guest profiles and progress stay in your browser. Optional Supabase accounts use email links, owner-only database policies, explicit saves and revision conflict checks. Signing in does not automatically upload or overwrite work. Use `/account` for account settings and deletion; deleting device data does not delete an account copy. Clicking **Verify with API** on the task map sends task selections, skill levels, custom tasks, and applied custom signals for a stateless comparison. It omits your display name, completion history, cookies, and pending signals. No check runs automatically; local results remain usable if the API is offline.

## Styleguide

Visit `/styleguide` to see every shared component and its states.

Regenerate backend seed and golden outputs after a seed change with `node scripts/generate-data.mjs` from the repository root. Use `--check` to verify the exports are current.

## Verify with API

On `/map`, click **Verify with API**. It checks task exposures, weighted role exposure, and ranked role IDs against same-origin `POST /api/analysis` (FastAPI under Vercel services; the Next handler under `pnpm dev`). A tolerance of `1e-9` accommodates JavaScript/Python floating-point differences. Failed checks do not change your results. Changing inputs invalidates an old verification result.

The API accepts up to 100 custom tasks, 100 selected tasks, and 100 applied custom signals, with at most 100 impacts per signal. Custom task IDs must start `custom-`; custom signal IDs must start `user-`. Seed IDs cannot be overridden. Legacy custom exposure/judgment fields are accepted and clamped to 0–1 but never used to assess custom tasks; signal strength to 0.1–1 and impact to 0.05–0.4, rounded to two decimals as in the editor. Dates must be real ISO dates no later than the seed cut-off, source URLs must use HTTPS, and custom evidence is always `user`. The same validation is implemented in both APIs.

The API is a public, unauthenticated demo. CORS is not authentication or rate limiting: configure abuse/rate controls at the hosting edge before wider use. The backend allows the deployed origin and localhost by default; see `backend/README.md` for explicit CORS configuration.
