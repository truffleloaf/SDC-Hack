// Isolated PostgreSQL constraint/migration check; no live database connection.
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {PGlite}=require(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db=new PGlite()
try {
 await db.exec(`create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`)
 await db.exec(readFileSync(new URL('../../backend/supabase/schema.sql',import.meta.url),'utf8'))
 await db.exec(readFileSync(new URL('../../backend/supabase/migrations/202610231200_profiles.sql',import.meta.url),'utf8'))
 // Simulate an existing installation's original constraints.
 await db.exec(`alter table sdgs drop constraint sdgs_id_check;alter table sdgs add constraint sdgs_id_check check(id in(4,8,9,10));alter table scenarios drop constraint scenarios_id_check;alter table scenarios add constraint scenarios_id_check check(id in('normal','fast'));`)
 for(const name of ['202610240500_skill_sdgs.sql','202610240510_resource_provenance.sql','202610240520_domain1_constraints.sql'])await db.exec(readFileSync(new URL('../../backend/supabase/migrations/'+name,import.meta.url),'utf8'))
 await db.exec(`insert into skills(id,name,category,hours_per_level,deliverable,why,sdgs) values('fixture','Fixture','Technical',10,'Synthetic test','','[4,9]');insert into signals values('fixture','2026-10-24','Synthetic fixture','','',1,0.5,'Synthetic fixture','assumption');`)
 assert.equal((await db.query('select count(*) as n from sdgs')).rows[0].n,17)
 await db.exec(`insert into roles values('fixture','Fixture','Test',50,0);insert into auth.users values('00000000-0000-0000-0000-000000000001');insert into profiles(user_id,role_id,scenario) values('00000000-0000-0000-0000-000000000001','fixture','slow');`)
 await assert.rejects(()=>db.exec(`insert into sdgs values(18,'Invalid','#000000',0)`))
 console.log('PASS PostgreSQL schema, repeatable migrations, SDG 17, Slow, assumptions and invalid-goal rejection')
} finally {await db.close()}
