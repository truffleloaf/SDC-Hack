-- Pivott catalogue schema (12 tables + meta).
--
-- Matches docs/data-model.md and app/models.py. Pathways are computed in the
-- request and are deliberately not stored; the signed-in user's profile lives
-- in migrations/202610231200_profiles.sql because it depends on Supabase's
-- auth.users table.
--
-- `meta.dataset` marks whether this database holds the demo or live catalogue;
-- app/seed.py refuses to write the demo rows into a live database.
--
-- `job_postings` is empty in the demo dataset; the live importer fills it with
-- the real openings behind each role's demand score.
--
-- Run in Supabase SQL Editor. The script is idempotent.

create table if not exists public.skills (
    id                text primary key,
    name              text not null,
    category          text not null check (category in ('Technical', 'Analytical', 'Communication', 'Operational')),
    sdgs              jsonb not null default '[4]'::jsonb,
    hours_per_level   integer not null check (hours_per_level > 0),
    deliverable       text not null,
    why               text not null,
    sort_order        integer not null default 0 check (sort_order >= 0)
);

create table if not exists public.roles (
    id      text primary key,
    title   text not null,
    family  text not null,
    demand  integer not null check (demand between 0 and 100),
    sort_order integer not null default 0 check (sort_order >= 0)
);

create table if not exists public.sdgs (
    id     integer primary key check (id between 1 and 17),
    name   text not null,
    color  text not null,
    sort_order integer not null default 0 check (sort_order >= 0)
);

create table if not exists public.scenarios (
    id           text primary key check (id in ('slow', 'normal', 'fast')),
    label        text not null,
    multiplier   numeric(4, 3) not null check (multiplier > 0),
    description  text not null
);

create table if not exists public.tasks (
    id                text primary key,
    role_id           text not null references public.roles(id) on delete cascade,
    name              text not null,
    description       text not null,
    base_exposure     numeric(4, 3) not null check (base_exposure between 0 and 1),
    human_judgment    numeric(4, 3) not null check (human_judgment between 0 and 1),
    default_share     integer not null check (default_share between 1 and 100),
    try_this_week     text not null,
    sort_order        integer not null default 0 check (sort_order >= 0)
);

create index if not exists tasks_role_id_idx on public.tasks(role_id);

create table if not exists public.role_requirements (
    role_id         text not null references public.roles(id) on delete cascade,
    skill_id        text not null references public.skills(id) on delete cascade,
    required_level  integer not null check (required_level between 1 and 4),
    importance      integer not null check (importance between 1 and 5),
    position        integer not null default 0 check (position >= 0),
    primary key (role_id, skill_id)
);

create table if not exists public.role_sdgs (
    role_id  text not null references public.roles(id) on delete cascade,
    sdg_id   integer not null references public.sdgs(id) on delete cascade,
    position integer not null default 0 check (position >= 0),
    primary key (role_id, sdg_id)
);

create table if not exists public.task_skills (
    task_id   text not null references public.tasks(id) on delete cascade,
    skill_id  text not null references public.skills(id) on delete cascade,
    position  integer not null default 0 check (position >= 0),
    primary key (task_id, skill_id)
);

create table if not exists public.signals (
    id            text primary key,
    date          date not null,
    headline      text not null,
    source_name   text not null,
    source_url    text not null,
    direction     smallint not null check (direction in (-1, 1)),
    strength      numeric(4, 3) not null check (strength between 0 and 1),
    explanation   text not null,
    evidence      text not null check (evidence in ('verified', 'illustrative', 'assumption', 'user'))
);

create index if not exists signals_date_idx on public.signals(date);
create index if not exists signals_evidence_idx on public.signals(evidence);

create table if not exists public.signal_task_impacts (
    signal_id  text not null references public.signals(id) on delete cascade,
    task_id    text not null references public.tasks(id) on delete cascade,
    impact     numeric(4, 3) not null check (impact between 0 and 0.4),
    primary key (signal_id, task_id)
);

create table if not exists public.resources (
    cost text,
    hrd_corp boolean not null default false,
    verified_at text,
    claim_source text,
    id        text primary key,
    skill_id  text not null references public.skills(id) on delete cascade,
    title     text not null,
    provider  text not null,
    url       text not null,
    free      boolean not null default true,
    sort_order integer not null default 0 check (sort_order >= 0)
);

create index if not exists resources_skill_id_idx on public.resources(skill_id);

-- Sample of the live job postings behind each role's demand score. The demo
-- dataset leaves this table empty; a live sync replaces its rows on every run.
create table if not exists public.job_postings (
    id             text primary key,
    role_id        text not null references public.roles(id) on delete cascade,
    title          text not null,
    company        text not null default '',
    location       text not null default '',
    url            text not null default '',
    posted_at      date not null,
    remote         boolean not null default false,
    tags           text not null default '',
    matched_title  text not null default ''
);

create index if not exists job_postings_role_id_idx on public.job_postings(role_id);
create index if not exists job_postings_posted_at_idx on public.job_postings(posted_at);

-- Dataset marker + metadata (dataset=demo|live, seed_version, data_as_of,
-- demo_persona). Internal table: RLS enabled without a policy, so the anon /
-- authenticated PostgREST roles cannot read it; the API uses the service role.
create table if not exists public.meta (
    key   text primary key,
    value text not null
);

-- Read-only catalogue for anon/auth roles. Writes go through the service role
-- (which bypasses RLS); no write policies are created on purpose.

alter table public.skills enable row level security;
alter table public.roles enable row level security;
alter table public.sdgs enable row level security;
alter table public.scenarios enable row level security;
alter table public.tasks enable row level security;
alter table public.role_requirements enable row level security;
alter table public.role_sdgs enable row level security;
alter table public.task_skills enable row level security;
alter table public.signals enable row level security;
alter table public.signal_task_impacts enable row level security;
alter table public.resources enable row level security;
alter table public.job_postings enable row level security;
alter table public.meta enable row level security;

drop policy if exists "public read skills" on public.skills;
create policy "public read skills" on public.skills for select using (true);

drop policy if exists "public read roles" on public.roles;
create policy "public read roles" on public.roles for select using (true);

drop policy if exists "public read sdgs" on public.sdgs;
create policy "public read sdgs" on public.sdgs for select using (true);

drop policy if exists "public read scenarios" on public.scenarios;
create policy "public read scenarios" on public.scenarios for select using (true);

drop policy if exists "public read tasks" on public.tasks;
create policy "public read tasks" on public.tasks for select using (true);

drop policy if exists "public read role_requirements" on public.role_requirements;
create policy "public read role_requirements" on public.role_requirements for select using (true);

drop policy if exists "public read role_sdgs" on public.role_sdgs;
create policy "public read role_sdgs" on public.role_sdgs for select using (true);

drop policy if exists "public read task_skills" on public.task_skills;
create policy "public read task_skills" on public.task_skills for select using (true);

drop policy if exists "public read signals" on public.signals;
create policy "public read signals" on public.signals for select using (true);

drop policy if exists "public read signal_task_impacts" on public.signal_task_impacts;
create policy "public read signal_task_impacts" on public.signal_task_impacts for select using (true);

drop policy if exists "public read resources" on public.resources;
create policy "public read resources" on public.resources for select using (true);

drop policy if exists "public read job_postings" on public.job_postings;
create policy "public read job_postings" on public.job_postings for select using (true);
