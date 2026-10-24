-- Dataset separation: explicit display order + meta table.
--
-- Why: the demo catalogue and the live catalogue now live in separate
-- databases, and the API no longer reads ordering / task-skills / role-SDGs
-- from app/seed_data.py. Those facts are rows now.
--
-- Safe to run more than once. Run it BEFORE deploying the matching app version:
-- the new code selects sort_order/position columns and the meta table.
--
-- After running this on an existing DEMO database, re-seed so the new columns
-- get the demo's display order:
--
--     python -m app.seed --reset
--
-- (TRUNCATE + seed; the demo dataset is disposable.) A live database should be
-- filled by the real-data importer, which must set sort_order/position and the
-- meta.dataset = 'live' row.

alter table public.skills
    add column if not exists sort_order integer not null default 0
    check (sort_order >= 0);

alter table public.roles
    add column if not exists sort_order integer not null default 0
    check (sort_order >= 0);

alter table public.sdgs
    add column if not exists sort_order integer not null default 0
    check (sort_order >= 0);

alter table public.tasks
    add column if not exists sort_order integer not null default 0
    check (sort_order >= 0);

alter table public.resources
    add column if not exists sort_order integer not null default 0
    check (sort_order >= 0);

alter table public.role_requirements
    add column if not exists position integer not null default 0
    check (position >= 0);

alter table public.role_sdgs
    add column if not exists position integer not null default 0
    check (position >= 0);

alter table public.task_skills
    add column if not exists position integer not null default 0
    check (position >= 0);

create table if not exists public.meta (
    key   text primary key,
    value text not null
);

alter table public.meta enable row level security;
