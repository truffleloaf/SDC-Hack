# Pivott architecture (aligned with the demo)

This document explains the backend architecture, data flow, formulas, security boundaries, deployment model, and recorded implementation status.

The canonical data model and API contract are [data-model.md](data-model.md) and [api-design.md](api-design.md). The backend was migrated to those contracts: 12 catalogue/signal tables plus `meta`, 43 tests, and the Aisyah 62% / 76.4% golden cases passed at the time of writing. Section 9 records that point-in-time status. `live` is built by `app/live/` from O*NET 31.0 and Arbeitnow rather than from the demo seed; see [live-data.md](live-data.md).

Demo and live use separate databases and deployments. `PIVOTT_DATASET=demo|live` selects the dataset, and `meta.dataset` prevents a process from writing the wrong dataset.

## 1. Goals and non-goals

Pivott answers four questions:

1. Which tasks in a role may be affected by AI (`exposure`, 0–1)?
2. What is the role's duration-weighted overall exposure (`roleExposure`)?
3. Which adjacent roles reuse current skills (`fit`, `score` and `gaps`)?
4. What is the shortest credible weekly learning path from the current level to the target role?

Non-goals recorded by the source document:

- It does not train or fine-tune an LLM; every score uses a deterministic formula.
- It does not scrape job boards or news in real time.
- It does not provide payments or direct recruiting integration.
- It does not output a probability of job loss; `roleExposure` is duration-weighted task exposure.

## 2. Components

| Component | Recorded state | Description |
|---|---|---|
| Frontend | Next.js 16 App Router, React 19 and TypeScript | Six main pages plus landing, example, passport and style guide |
| In-page calculation | `lib/engine.ts` calculates in the browser | Retained for offline/demo use |
| HTTP layer | Next Route Handlers and FastAPI | Two implementations of the same JSON contract |
| API service | FastAPI and SQLModel | Implemented against [api-design.md](api-design.md) |
| Sign-in | Supabase Auth and JWKS verification | Supabase manages passwords/sessions; FastAPI verifies access tokens |
| Database | Demo: local SQLite `pivott.db` or dedicated Supabase; live: separate Postgres | `PIVOTT_DATASET` selects the dataset; guest profiles use localStorage and signed-in profiles use `profiles` |
| Scoring engine | Python port of TypeScript `lib/engine.ts` | Matches the recorded Aisyah 62% / 76.4% cases |

```text
┌──────────────────────────────┐        ┌──────────────────────┐
│ Browser (Next.js 16)         │        │ Supabase Auth        │
│  pages + landing + example   │◀──────▶│ sign-in / JWT        │
│  localStorage: profile       │        └──────────┬───────────┘
│  lib/engine.ts: local scores │                   │ access token
└──────────────┬───────────────┘                   │
               │ same JSON contract               │
               ├──────────────────────────────┐    │
               ▼                              ▼    ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│ Next Route Handlers          │   │ FastAPI                  │
│ app/api/* (demo default)     │   │ app/main.py + JWKS       │
└──────────────────────────────┘   └────────────┬─────────────┘
                                                │ optional
                                                ▼
                                     ┌──────────────────────┐
                                     │ SQLite / Supabase    │
                                     │ catalogue + signals  │
                                     │ + signed-in profiles │
                                     └──────────────────────┘
```

The key principle is that the demo runs without a database. The database stores catalogue data, signals and signed-in profiles; scoring does not happen in SQL.

## 3. One analysis request

```text
POST /api/analysis  { ProfileInput }
  │
  ├─ 1. Validate roleId; remove unknown tasks and skills
  ├─ 2. Normalize selections into time shares
  ├─ 3. Read seed tasks + 20 signals (+ applied user signals)
  ├─ 4. Per task: recency → signal_adjustment → exposure → classification
  ├─ 5. Weight by share → roleExposure
  ├─ 6. For the other five roles: coverage + task_similarity → fit
  ├─ 7. Target default shares → targetExposure → route score
  └─ 8. Return tasks[] + routes[] + confidence, without an envelope
```

The frontend keeps the same `ProfileInput` in localStorage. `POST /api/profiles` validates and echoes it without persistence. Signed-in users separately write to Supabase with `PUT /api/me/profile`; see [auth.md](auth.md).

## 4. Data model

See [data-model.md](data-model.md) for fields, constraints and the demo profile. The source document records:

| Group | Entities | Count |
|---|---|---:|
| Catalogue | Skill / Role / RoleRequirement / Task / TaskSkill | 15 / 6 / 36 / 31 / 73 |
| Open roles | JobPosting, live only | 0 in demo |
| Learning | Resource | 24 |
| Signals | Signal / SignalTaskImpact / Scenario | 20 / 41 / 2 |
| SDGs | SDG / RoleSDG | 4 / 10 |
| Guest data | Profile / Selection / SkillLevel / CustomTask / CustomSignal | 1 / ≤20 / 15 / ≤20 / unlimited |
| Signed-in data | Profile, with selections/skills/custom fields in JSONB | One row per auth user |

TaskSkill 73 is the total number of skill links for 31 tasks. RoleSDG 10 is the sum of each role's SDG array (1+2+2+1+2+2).

## 5. API contract

See [api-design.md](api-design.md) for endpoints and examples. Key points:

- Ten demo methods: health, seed (GET/POST), profiles, analysis, pathways (POST/GET), roles/{id}/tasks, signals (GET), and SDGs.
- Two demo control methods: `POST /api/signals` and `POST /api/analysis/recompute`.
- Ten account methods: `GET /api/auth/config`; `POST /api/auth/signin|signup|refresh|signout|password/reset`; `GET /api/auth/me`; and `GET/PUT/DELETE /api/me/profile`.
- Requests use inline `ProfileInput` and have no `profile_id`; a signed-in user ID comes only from the token `sub`.
- Responses have no `{data, meta, sources}` wrapper; errors use `{error}`.
- Paths are recalculated rather than persisted. `pathway.id` is base64url input.
- User signals are stored but are not applied by `POST /api/analysis` until `recompute`.

## 6. Scoring engine

The TypeScript engine is `lib/engine.ts`; the Python implementation follows the same formulas, with weights in `app/config.py`.

| Module | Responsibility |
|---|---|
| `exposure.py` | `recency`, `signal_adjustment`, `exposure`, `role_exposure`, `classification` |
| `matching.py` | `skill_coverage`, `task_similarity`, `fit`, `gaps`, `route_score` |
| `pathway.py` | Gap to resource to weekly plan |
| `catalog.py` | Read-only serialization; no scoring |

```text
recency           = 0.5 ^ (age_days / 180)
signal_adjustment = clamp(Σ(strength × direction × recency × impact), −0.2, +0.2)
exposure          = clamp(base_exposure × scenario.multiplier + signal_adjustment, 0, 1)
role_exposure     = Σ(time_share × exposure)
classification    = Automate if exposure ≥ 0.65 and human_judgment < 0.4
                    Protect  if human_judgment ≥ 0.65
                    Augment  otherwise
skill_coverage    = Σ(importance × min(level / required, 1)) / Σ importance
fit               = 100 × (0.8 × coverage + 0.2 × similarity)
                    # falls back to coverage when similarity is empty
gap_priority      = gap × importance × (role_demand / 100)
weeks             = ceil(Σ gap_hours / hours_per_week)
route_score       = 0.7 × fit + 0.3 × 100 × (1 − target_exposure)
```

Requirements:

- Deterministic: identical inputs and seed version produce bit-for-bit identical results.
- Explainable: the Why sheet shows substituted values for coverage, similarity, fit, gap priority, weeks and route score.
- Testable: each formula has unit tests; Normal and Fast must change the ranking.
- No LLM scoring: an LLM may only generate explanatory copy and must have a template fallback.

## 7. Security and privacy

- Guest demo use needs no account; profile, progress and custom signals stay in browser key `pivott:v1`.
- Supabase Auth handles sign-in. FastAPI checks token signature, issuer, audience, expiry and `role=authenticated`.
- Direct browser-to-Supabase access is recommended. An optional `/api/auth/signin` bridge forwards the password once and does not store or log it; public use needs separate rate limiting.
- The browser receives only the Supabase URL and anon key, never the database URL or service-role key.
- Catalogue tables are public read-only. `profiles` uses four RLS policies requiring `auth.uid() = user_id`; anonymous access is denied by default.
- The backend owner connection bypasses RLS, but `/api/me/*` always filters by the verified token `sub`; request bodies contain no user ID.
- Names have control characters and `<>` removed, whitespace collapsed and an 80-character limit, and are rendered as text.
- Signals declare `verified`, `illustrative` or `user` evidence and the frontend distinguishes them.
- Demo data is synthetic and stores no real personal information.

## 8. Deployment

| Part | Recommendation in the source | Notes |
|---|---|---|
| Web and route handlers | Vercel / Node | `pnpm build && pnpm start`; no environment variables required |
| FastAPI | Render / Railway / Fly.io | `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, or the Dockerfile |
| Optional database | Supabase Singapore | Session pooler on 5432 |
| CI | GitHub Actions | Frontend `pnpm test`; backend `pytest -q` plus a seed smoke test |

See [deploy.md](deploy.md) for full steps. Local defaults are `PIVOTT_DATASET=demo` and `sqlite:///./pivott.db`.

```text
PIVOTT_DATASET=demo|live
PIVOTT_DB=sqlite:///./demo.db
PIVOTT_DB=postgresql+psycopg://...
DATABASE_URL=postgresql+psycopg://...
PIVOTT_AUTO_SEED=true
ALLOW_DEMO_RESET=true
PIVOTT_SEED_VERSION=2026.10.1
PIVOTT_DATA_AS_OF=2026-10-01
CORS_ORIGINS=*
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<publishable key>
# SUPABASE_JWT_SECRET=  # legacy HS256 projects only
```

## 9. Status recorded by the source

This section translates the point-in-time status and does not update its figures.

| Item | Recorded status |
|---|---|
| This document | Aligned with the frontend demo seed, engine and route handlers; dataset separation added |
| `app/models.py` | 12 catalogue/signal tables plus `profiles` and `meta`, including `job_postings` |
| `app/schemas.py` | Inline `ProfileInput`, `roleExposure`, `route.score`, no response envelope; health adds `dataset` |
| `app/seed_data.py` | 6 roles / 31 tasks / 15 skills / 36 requirements / 24 resources / 20 signals / 4 SDGs / 2 scenarios |
| `app/seed.py` | Demo-only idempotent seeder; records `meta.dataset`; `--reset` resets it |
| `app/runtime.py` | Reads `data_as_of`, `seed_version` and `demoPersona` from `meta` at startup |
| `app/errors.py` | Consistent handling for HTTP, validation, ProfileError, database 503 and fallback 500 errors |
| `supabase/schema.sql` | 12 tables plus `meta`, indexes and read-only RLS policies |
| `supabase/migrations/202610221915_dataset_separation.sql` | Adds ordering fields and `meta` to an existing database |
| `supabase/migrations/202610231200_profiles.sql` | `profiles`, four owner RLS policies and authenticated grants |
| `scripts/backfill_demo_order.py` | Backfills ordering and metadata in an old demo database; UPDATE only |
| `app/auth.py` | Supabase JWKS ES256/RS256 verification with a legacy HS256 fallback |
| `supabase/check_connection.py` | Expected 14 tables and the recorded row counts 15 / 6 / 4 / 2 / 31 / 36 / 10 / 73 / 20 / 41 / 24 / 0 / 0 / 4 |
| Supabase demo database | All migrations applied; profile RLS and owner isolation verified in local PostgreSQL |
| `Dockerfile` | Python 3.12 slim, health check, demo defaults and reset disabled |
| `docs/deploy.md` | Separate demo/live deployments, Supabase and persistent SQLite volume |
| `app/live/` | O*NET parsing, signal model, Arbeitnow/Adzuna demand and live importer; 10 roles / 60 tasks / 85 postings |
| Tests | 85 passed at the source document's recorded point |
| Frontend | Recorded as a separate repository with sign-in UI not yet connected to Supabase JS |

The source lists these optional follow-ups: connect frontend sign-in to Supabase directly or through the FastAPI bridge, complete the live data importer, make scoring weights configurable, and optionally adopt Alembic. A frontend using FastAPI sets `NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000`; the field and error shapes remain the same.
