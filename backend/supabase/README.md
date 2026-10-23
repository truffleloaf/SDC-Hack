# Supabase setup

The FastAPI layer is the only client of the database. The browser only receives
the publishable/anon key for Supabase Auth (and the API base URL); it never
receives the database connection string or the service role key.

```text
Next.js demo  ──sign in──▶  Supabase Auth  ──JWKS──▶  FastAPI (scoring engine)
     │                          │                         │
     └────────────── HTTP ──────┴─────────────────────────┘
                                                           │ SQL
                                                           ▼
                                              Supabase Postgres (owner connection)
                                              catalogue + signals + profiles
```

The schema is 12 catalogue/signal tables, `meta` (the dataset marker) and the
signed-in user's `profiles` table. It matches
[`../docs/data-model.md`](../docs/data-model.md), [`./schema.sql`](./schema.sql)
and [`../docs/auth.md`](../docs/auth.md). Pathways are still computed on every
request and never stored.

> This project is for the **demo** dataset (`PIVOTT_DATASET=demo`). The live
> dataset needs its own Supabase project / database; never point both at the
> same tables.

## 1. Create the project

1. <https://supabase.com/dashboard> → **New project**
2. Region: **Southeast Asia (Singapore)** for Malaysian demo latency.
3. Save the database password somewhere safe.

Already have a project? Skip to step 2.

## 2. Create the tables

Open **SQL Editor → New query**, paste the whole of [`schema.sql`](./schema.sql),
and click **Run**. It is idempotent, so re-running it is safe.

Then run every file in [`migrations/`](./migrations/) in filename order. New
databases need these too: `schema.sql` is only the baseline and does not contain
later index or column changes.

Expected: `Success. No rows returned.`

Then check:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

You should see 14 tables:

```text
job_postings, meta, profiles, resources, role_requirements, role_sdgs, roles,
scenarios, sdgs, signal_task_impacts, signals, skills, task_skills, tasks
```

## 3. Get the connection string

**Project Settings → Database → Connection string → Session pooler** (port `5432`).

| Pooler | Port | Use |
|---|---|---|
| Session | 5432 | ✅ FastAPI (long-lived process, prepared statements work) |
| Transaction | 6543 | ⚠️ only if you disable prepared statements (`prepare_threshold=None`) |

Replace `[YOUR-PASSWORD]` with the database password. If the password contains
`@ : / ? # [ ] %`, URL-encode it first.

The SQLAlchemy URL must use the `psycopg` driver:

```text
postgresql+psycopg://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

## 4. Configure `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill in `DATABASE_URL` and set `PIVOTT_DATASET=demo`. `app/db.py` also reads
`PIVOTT_DB` first, so you can use a local SQLite file without touching `.env`.

## 5. Install, seed and verify

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app.seed --reset
.\.venv\Scripts\python.exe supabase\check_connection.py
```

Expected:

```text
connected
tables: 14 (expected 14)
row counts:
  skills                  15  ok
  roles                    6  ok
  sdgs                     4  ok
  scenarios                2  ok
  tasks                   31  ok
  role_requirements       36  ok
  role_sdgs               10  ok
  task_skills             73  ok
  signals                 20  ok
  signal_task_impacts     41  ok
  resources               24  ok
  job_postings             0  ok
  profiles                 0  ok
  meta                     4  ok
schema and seed counts are consistent
```

Existing project from before the dataset-separation change? Run
[`migrations/202610221915_dataset_separation.sql`](./migrations/202610221915_dataset_separation.sql),
then `python scripts/backfill_demo_order.py` (or re-seed). For the skill-name
uniqueness change, also run
[`migrations/202610221930_skill_name_unique.sql`](./migrations/202610221930_skill_name_unique.sql).
For the live job postings table, run
[`migrations/202610230045_job_postings.sql`](./migrations/202610230045_job_postings.sql).
For signed-in users, run
[`migrations/202610231200_profiles.sql`](./migrations/202610231200_profiles.sql)
(last, it depends on the catalogue tables and `auth.users`).

## 6. Run the API

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

`GET /api/health` should return counts `6 / 31 / 15 / 20`.

For sign-in, copy the **Publishable key** (`sb_publishable_...`) or the legacy
**anon** key (`eyJ...`) from **Project Settings → API Keys** into `.env` as
`SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`); `GET /api/auth/config`
should then return `signInEnabled: true`. Full flow: [`../docs/auth.md`](../docs/auth.md).

## Security notes

- RLS is enabled on all 14 tables. The 12 catalogue/signal tables have a public
  `select` policy; `meta` has **no** policy (service role only); `profiles` has
  four owner-only policies (`select` / `insert` / `update` / `delete` with
  `auth.uid() = user_id`). The catalogue has no write policies, so catalogue
  writes require the service role / project owner.
- FastAPI connects as the project owner (`postgres`), which bypasses RLS. That is
  why the connection string must stay server-side. Every `/api/me/*` query still
  filters by the verified token's `sub`.
- The browser only receives the Supabase URL and the publishable/anon key. The
  service role key is never sent to the frontend.
- `.env` is in `.gitignore`. Do not commit it.
- `POST /api/seed` is a demo control: set `ALLOW_DEMO_RESET=false` on a public
  deployment. On Postgres it truncates all tables (including `profiles`) instead
  of dropping the schema, so RLS policies and indexes survive a reset.
- Demo profiles without an account still live in the browser's localStorage;
  signed-in profiles live in `public.profiles`.
