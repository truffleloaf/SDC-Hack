# Pivott API

FastAPI backend for **Pivott** — task-level AI exposure, adjacent-role matching and reskilling pathways.

This is a **1:1 contract port** of the Next.js Route Handlers in
[`../pivott-web-application-design/app/api/*`](../pivott-web-application-design/app/api).
It uses the same seed data, the same formulas and the same response shapes, so the
frontend can point its API base URL at this service without UI changes.

## Status

- Deterministic scoring engine — **no LLM, no randomness**
- Versioned seed dataset exported from
  [`pivott-web-application-design/lib/data/seed.ts`](../pivott-web-application-design/lib/data/seed.ts)
- 10 `/api` endpoints across 8 route groups; Swagger at `/docs`
- **31 tests**, including golden-output parity with the frontend engine
- Stateless by design (same as the frontend API): no login, no database, no secrets

## Data

| Dataset | Count |
|---|---:|
| Roles | 6 |
| Tasks | 31 |
| Skills | 15 |
| Dated signals | 20 |
| SDGs | 4 |
| Learning resources | 25 |
| Scenarios | 2 (Normal / Fast) |
| Demo persona | Aisyah, Finance Admin |

The data lives in [`app/data/seed.json`](app/data/seed.json) and is loaded by
[`app/seed.py`](app/seed.py). It is a direct export of the frontend seed; do not
hand-edit it. Regenerate it from `seed.ts` if the frontend data changes.

## Quick start

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open <http://127.0.0.1:8000/docs> for Swagger, or
<http://127.0.0.1:8000/api/health> for a quick check.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Status, seed version, data cut-off, counts |
| GET | `/api/seed` | Full versioned seed dataset |
| POST | `/api/seed` | Stateless reset (returns the demo persona) |
| POST | `/api/profiles` | Validate and echo a profile; returns an opaque id |
| POST | `/api/analysis` | Task exposure, classifications, confidence, ranked routes |
| POST | `/api/pathways` | Build a week-by-week pathway for a target role |
| GET | `/api/pathways/{id}` | Rebuild a pathway from its opaque id |
| GET | `/api/roles/{id}/tasks?scenario=normal\|fast` | Scored tasks for a role |
| GET | `/api/signals` | Dated signals with recency weights |
| GET | `/api/sdgs` | SDG references and the roles mapped to each |

The request/response contract is the same as the frontend's routes. Examples:

### Analysis

```powershell
$body = @{
  roleId = "finance-admin"
  selections = @(
    @{ taskId = "fa-invoice"; share = 30 },
    @{ taskId = "fa-recon"; share = 20 },
    @{ taskId = "fa-exception"; share = 15 },
    @{ taskId = "fa-reporting"; share = 15 },
    @{ taskId = "fa-comms"; share = 10 },
    @{ taskId = "fa-expense"; share = 10 }
  )
  skills = @{ excel = 3; erp = 3; controls = 3; sql = 0 }
  scenario = "normal"
  hoursPerWeek = 8
  freeOnly = $false
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/analysis `
  -ContentType "application/json" -Body $body
```

### Pathway

```powershell
$body = @{
  roleId = "finance-admin"
  selections = @()
  skills = @{ excel = 3; erp = 3; controls = 3; sql = 0 }
  scenario = "normal"
  hoursPerWeek = 8
  freeOnly = $false
  targetRoleId = "finance-systems-analyst"
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/pathways `
  -ContentType "application/json" -Body $body
```

## Scoring

The engine is a function-by-function port of
[`lib/engine.ts`](../pivott-web-application-design/lib/engine.ts):

```text
recency           = 0.5 ^ (age_days / 180)
signal_adjustment = clamp(sum(strength × direction × recency × impact), -0.2, 0.2)
exposure          = clamp(base_exposure × scenario.multiplier + signal_adjustment, 0, 1)
role_exposure     = sum(time_share × exposure)
classification    = Automate if exposure >= 0.65 and human_judgment < 0.4
                    Protect  if human_judgment >= 0.65
                    Augment  otherwise
skill_coverage    = sum(importance × min(current / required, 1)) / sum(importance)
fit               = 100 × (0.8 × coverage + 0.2 × task_similarity)  (falls back to coverage)
gap               = max(0, required - current)
gap_priority      = gap × importance × (role_demand / 100)
weeks             = ceil(sum(gap_hours) / hours_per_week)
route_score       = 0.7 × fit + 0.3 × 100 × (1 - target_exposure)
```

All formulas live in [`app/engine.py`](app/engine.py). Weight-like values are
derived from the same seed fields as the frontend (`demand`, `importance`,
`hoursPerLevel`, `requiredLevel`).

## Tests

```powershell
pytest -q
```

```text
31 passed
```

[`tests/golden.json`](tests/golden.json) is generated from the frontend
`engine.ts`. `tests/test_engine.py` deep-compares the Python engine against it:

- Normal and Fast analysis: task exposure, adjustments, classifications,
  role exposure, confidence and route order
- `finance-admin` role task map
- Paid and free-only pathways: steps, hours, weeks, weeks ranges and resources

`tests/test_api.py` covers the HTTP contract: validation errors, opaqueness of
pathway ids, 404s, clamp behaviour, signal recency and SDG role mapping.

## Project layout

```text
backend/
├─ app/
│  ├─ main.py            FastAPI app, CORS, router wiring
│  ├─ seed.py            Loads app/data/seed.json, builds lookups
│  ├─ engine.py          Deterministic scoring engine (port of lib/engine.ts)
│  ├─ parsing.py         Profile validation, base64url ids (port of lib/api.ts)
│  ├─ data/seed.json     Canonical seed dataset
│  └─ routers/           One module per route group
├─ tests/
│  ├─ golden.json        Outputs generated from the frontend engine
│  ├─ test_engine.py     Formula + golden parity tests
│  └─ test_api.py        HTTP contract tests
├─ requirements.txt
└─ pytest.ini
```

## Design notes

- **Stateless on purpose.** The frontend API stores no profiles or pathways;
  pathway ids encode their input. The FastAPI port keeps that contract, which
  makes the demo reproducible and removes database/secrets setup.
- **No LLM.** Every number is deterministic and testable.
- **CORS** is open for local development; tighten it before a public deployment.
- **No auth.** Demo only. Do not expose it publicly without authentication and
  rate limiting.
- **Data is illustrative.** Signals carry `evidence: "verified" | "illustrative"`;
  role/SDG mappings are directional, not measured impact. Task exposure is not a
  probability of job loss.

## Optional next steps

- Add Supabase persistence for profiles and pathway progress (the current
  contract is stateless, so this is an extension, not a fix).
- Add a root-level GitHub Actions workflow that runs `pytest -q` in `backend/`.
- Add admin endpoints for injecting signals and diffing recomputed exposure.
