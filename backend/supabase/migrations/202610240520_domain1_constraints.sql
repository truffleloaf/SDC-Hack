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

-- Product constants and generated canonical team tags for existing catalogues.
insert into public.scenarios(id,label,multiplier,description) values ('slow','Slow',0.75,'Team assumption: 0.75 times baseline exposure. Not a forecast.') on conflict(id) do nothing;
insert into public.sdgs(id,name,color,sort_order) values (1,'No Poverty', '#E5243B',0) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (2,'Zero Hunger', '#DDA63A',1) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (3,'Good Health and Well-being', '#4C9F38',2) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (4,'Quality Education', '#C5192D',3) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (5,'Gender Equality', '#FF3A21',4) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (6,'Clean Water and Sanitation', '#26BDE2',5) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (7,'Affordable and Clean Energy', '#FCC30B',6) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (8,'Decent Work and Economic Growth', '#A21942',7) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (9,'Industry, Innovation and Infrastructure', '#FD6925',8) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (10,'Reduced Inequalities', '#DD1367',9) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (11,'Sustainable Cities and Communities', '#FD9D24',10) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (12,'Responsible Consumption and Production', '#BF8B2E',11) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (13,'Climate Action', '#3F7E44',12) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (14,'Life Below Water', '#0A97D9',13) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (15,'Life on Land', '#56C02B',14) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (16,'Peace, Justice and Strong Institutions', '#00689D',15) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
insert into public.sdgs(id,name,color,sort_order) values (17,'Partnerships for the Goals', '#19486A',16) on conflict(id) do update set name=excluded.name,color=excluded.color,sort_order=excluded.sort_order;
update public.skills set sdgs='[4, 9]'::jsonb where id='excel';
update public.skills set sdgs='[4, 9]'::jsonb where id='erp';
update public.skills set sdgs='[4, 9]'::jsonb where id='sql';
update public.skills set sdgs='[4, 9]'::jsonb where id='python';
update public.skills set sdgs='[4, 9]'::jsonb where id='bi';
update public.skills set sdgs='[4, 9]'::jsonb where id='automation';
update public.skills set sdgs='[4, 9]'::jsonb where id='ai';
update public.skills set sdgs='[4, 9]'::jsonb where id='analysis';
update public.skills set sdgs='[4, 9]'::jsonb where id='stats';
update public.skills set sdgs='[4, 9]'::jsonb where id='controls';
update public.skills set sdgs='[4, 10]'::jsonb where id='stakeholder';
update public.skills set sdgs='[4, 10]'::jsonb where id='writing';
update public.skills set sdgs='[4, 10]'::jsonb where id='empathy';
update public.skills set sdgs='[4, 8]'::jsonb where id='process';
update public.skills set sdgs='[4, 10]'::jsonb where id='coordination';
update public.skills set sdgs='[4, 9]'::jsonb where id='programming';
update public.skills set sdgs='[4, 9]'::jsonb where id='active-learning';
update public.skills set sdgs='[4, 9]'::jsonb where id='complex-problem-solving';
update public.skills set sdgs='[4, 9]'::jsonb where id='critical-thinking';
update public.skills set sdgs='[4, 9]'::jsonb where id='judgment-and-decision-making';
update public.skills set sdgs='[4, 9]'::jsonb where id='mathematics';
update public.skills set sdgs='[4, 9]'::jsonb where id='monitoring';
update public.skills set sdgs='[4, 10]'::jsonb where id='active-listening';
update public.skills set sdgs='[4, 10]'::jsonb where id='reading-comprehension';
update public.skills set sdgs='[4, 10]'::jsonb where id='service-orientation';
update public.skills set sdgs='[4, 10]'::jsonb where id='social-perceptiveness';
update public.skills set sdgs='[4, 10]'::jsonb where id='speaking';
update public.skills set sdgs='[4, 8]'::jsonb where id='management-of-financial-resources';
update public.skills set sdgs='[4, 8]'::jsonb where id='management-of-personnel-resources';
update public.skills set sdgs='[4, 8]'::jsonb where id='time-management';
