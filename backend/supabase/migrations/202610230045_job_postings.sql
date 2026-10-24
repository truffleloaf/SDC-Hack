-- Add the live job postings table.
--
-- Safe for an existing demo or live database: the table starts empty and the
-- demo seeder never writes to it. Run in the Supabase SQL Editor after
-- 202610221930_skill_name_unique.sql.

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

alter table public.job_postings enable row level security;

drop policy if exists "public read job_postings" on public.job_postings;
create policy "public read job_postings" on public.job_postings for select using (true);
