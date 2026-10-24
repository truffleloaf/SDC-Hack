-- Signed-in user profiles (Supabase Auth).
--
-- One row per Supabase auth user. The backend writes this table with the
-- project owner connection (which bypasses RLS) but always filters by the
-- verified token's `sub`; the policies below are the second line of defence for
-- a browser that talks to PostgREST directly.
--
-- Run in the Supabase SQL Editor after the other migrations. Safe to re-run.

create table if not exists public.profiles (
    user_id         uuid primary key references auth.users(id) on delete cascade,
    email           text,
    name            text not null default '',
    role_id         text not null references public.roles(id),
    scenario        text not null default 'normal'
                    check (scenario in ('normal', 'fast')),
    hours_per_week  integer not null default 6
                    check (hours_per_week between 1 and 40),
    free_only       boolean not null default false,
    target_role_id  text references public.roles(id),
    selections      jsonb not null default '[]'::jsonb,
    skills          jsonb not null default '{}'::jsonb,
    completed_steps jsonb not null default '[]'::jsonb,
    custom_tasks    jsonb not null default '[]'::jsonb,
    custom_signals  jsonb not null default '[]'::jsonb,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists profiles_updated_at_idx on public.profiles(updated_at);

alter table public.profiles enable row level security;

drop policy if exists "profiles owner read" on public.profiles;
create policy "profiles owner read" on public.profiles
    for select to authenticated
    using (auth.uid() = user_id);

drop policy if exists "profiles owner insert" on public.profiles;
create policy "profiles owner insert" on public.profiles
    for insert to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update" on public.profiles
    for update to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "profiles owner delete" on public.profiles;
create policy "profiles owner delete" on public.profiles
    for delete to authenticated
    using (auth.uid() = user_id);

grant select, insert, update, delete on public.profiles to authenticated;

-- FastAPI sets updated_at on every write; this trigger keeps it correct if a
-- row is ever changed through the Supabase client instead.
create or replace function public.profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.profiles_set_updated_at();
