-- Apply in the Supabase SQL editor before enabling account saving.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object' and octet_length(profile::text) <= 262144),
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon;
grant select, insert, update, delete on public.user_profiles to authenticated;

create policy "Read own profile" on public.user_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own profile" on public.user_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own profile" on public.user_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own profile" on public.user_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.stamp_profile_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then new.revision := 1;
  else new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;
create trigger profile_revision before insert or update on public.user_profiles
for each row execute function public.stamp_profile_revision();

-- No user-id parameter: the caller can delete only the identity from their JWT.
-- SECURITY DEFINER is needed solely to remove that row from auth.users.
create or replace function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = caller;
end;
$$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
