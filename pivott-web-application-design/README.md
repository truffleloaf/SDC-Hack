# Pivott

> Don't predict the job. Map the tasks. Route the skills.

Pivott shows how AI may affect the individual **tasks** in a job, then routes your existing skills toward lower-risk adjacent roles with a practical learning pathway. All scores are deterministic and computed from stored seed data. Nothing comes from an LLM.

**Important:** task exposure measures how much of the work AI could potentially handle. It does **not** predict job loss. All seeded roles, tasks, and signals are **illustrative demo data**.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- Framer Motion (motion), D3 force simulation (task map), Radix primitives, Lucide icons
- `html-to-image` (PNG) and `jspdf` (PDF) for Skill Passport export
- Next.js Route Handlers under `app/api/*` act as the API layer. They share the same scoring engine (`lib/engine.ts`) with the client, so results are identical on both sides.
- Vitest for unit and workflow tests

> The original brief proposed FastAPI + SQLite. To keep the hackathon build to one deployable app with no extra services, the API is implemented as Next.js Route Handlers over an in-memory seed. The endpoint contract is unchanged, so a FastAPI backend could replace it later without touching the UI.

## Setup

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

No environment variables, database, or login are required.

## Seed data and reset

- Seed data lives in `lib/data/seed.ts`: 6 roles, ~30 tasks, 13 skills, ~20 dated signals, 2 scenarios, SDG mappings, learning resources, and the demo persona **Aisyah (Finance Admin)**.
- `GET /api/seed` returns the seed version and counts. `POST /api/seed` resets server-side demo state (custom signals) back to the seed.
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
skill_coverage     = Σ importance × min(level / required, 1) / Σ importance
fit                = 100 × (0.8 × coverage + 0.2 × task_similarity)   (falls back to coverage)
gap                = max(0, required - level)
gap_priority       = gap × importance × (role_demand / 100)
weeks              = ceil(Σ gap_hours / hours_per_week)
```

Every route card has a **Why this score?** sheet that shows these values for the selected role.

## Tests

```bash
pnpm test
```

- `lib/engine.test.ts` covers each formula, the classification thresholds, scenario recalculation, and ranking changes between Normal and Fast.
- `lib/workflow.test.ts` covers the main workflows: share normalisation while adding, adjusting, and removing tasks; demo persona → map → routes → pathway; free-only resources; hours/week vs. duration; `.ics` export validity; and display-name sanitisation and fallbacks.

## Demo script (about 2 minutes)

1. **Landing**: hover the living task map. Click **See a 30-second example** to load Aisyah. A banner marks demo mode, and your own profile is kept aside untouched.
2. **Task map**: switch **Normal → Fast** and watch bubbles, the headline exposure, and classifications recalculate. Click a bubble to pin its details, then copy the "Try this week" tip. Toggle **List** to see the sortable table.
3. **Routes**: switch scenarios to watch the ranking reorder. Open **Why this score?** and try **Compare**.
4. **Pathway**: drag hours/week, toggle free-only, check off steps, then use **Add to calendar** to download the `.ics` file.
5. **Passport**: edit the name, then download a PNG or PDF, or copy the summary.
6. **Signals**: use **Admin → add a signal → Recompute map**. Changed tasks are highlighted on the map.
7. Leave the demo with **Exit demo** in the banner, or start fresh from **Map my job**.

## Display name

Your name is optional and is stored only in localStorage. You can set or edit it on the onboarding screen, in the header menu, or on the passport. When no name is set, greetings say "Hi there". Names are sanitised (no angle brackets or control characters, 40 characters max) and always rendered as text, never as HTML.

## Privacy

There is no login. Your profile and progress stay in your browser. The server routes are stateless apart from demo signals, which you can reset.

## Styleguide

Visit `/styleguide` to see every shared component and its states.
