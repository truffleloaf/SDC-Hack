-- Existing installations: widen old catalogue constraints without deleting rows.
alter table public.sdgs drop constraint if exists sdgs_id_check;
alter table public.sdgs add constraint sdgs_id_check check (id between 1 and 17);
alter table public.scenarios drop constraint if exists scenarios_id_check;
alter table public.scenarios add constraint scenarios_id_check check (id in ('slow','normal','fast'));
alter table public.signals drop constraint if exists signals_evidence_check;
alter table public.signals add constraint signals_evidence_check check (evidence in ('verified','illustrative','assumption','user'));
-- The optional saved-profile migration may not be installed yet.
do $$ begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles drop constraint if exists profiles_scenario_check;
    alter table public.profiles add constraint profiles_scenario_check check (scenario in ('slow','normal','fast'));
  end if;
end $$;
