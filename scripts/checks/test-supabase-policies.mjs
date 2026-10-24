// Optional isolated PostgreSQL policy test. Never connects to a live project.
// Set PGLITE_MODULE to a locally installed @electric-sql/pglite module if needed.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const database = new PGlite()
try {
  await database.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
  `)
  await database.exec(readFileSync(new URL('../../supabase/migrations/202610230001_profiles.sql', import.meta.url), 'utf8'))
  await database.exec(`insert into public.user_profiles(user_id, profile) values ('00000000-0000-0000-0000-000000000002', '{"version":1}'); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);`)
  await database.exec(`insert into public.user_profiles(user_id, profile, revision) values ('00000000-0000-0000-0000-000000000001', '{"version":1}', 99);`)
  let result = await database.query('select user_id, revision from public.user_profiles')
  assert.equal(result.rows.length, 1); assert.equal(result.rows[0].revision, 1)
  await assert.rejects(database.exec(`insert into public.user_profiles(user_id, profile) values ('00000000-0000-0000-0000-000000000002', '{}')`), (error) => error.code === '42501')
  result = await database.query(`update public.user_profiles set profile='{}' where user_id='00000000-0000-0000-0000-000000000002' returning *`)
  assert.equal(result.rows.length, 0)
  result = await database.query(`delete from public.user_profiles where user_id='00000000-0000-0000-0000-000000000002' returning *`)
  assert.equal(result.rows.length, 0)
  result = await database.query(`update public.user_profiles set profile='{}', revision=99 where revision=1 returning revision`)
  assert.equal(result.rows[0].revision, 2)
  result = await database.query(`update public.user_profiles set profile='{}' where revision=1 returning *`)
  assert.equal(result.rows.length, 0, 'Stale revision must not overwrite newer work')
  await database.exec('reset role; set role anon;')
  await assert.rejects(database.exec('select * from public.user_profiles'), (error) => error.code === '42501')
  await assert.rejects(database.exec('select public.delete_own_account()'), (error) => error.code === '42501')
  await database.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); select public.delete_own_account(); reset role;`)
  result = await database.query('select id from auth.users')
  assert.equal(result.rows.length, 1); assert.ok(result.rows[0].id.endsWith('2'))
  result = await database.query('select user_id from public.user_profiles')
  assert.equal(result.rows.length, 1); assert.ok(result.rows[0].user_id.endsWith('2'))
  console.log('PASS: owner-only read/write/delete, anonymous denial, stamped revisions, stale-save protection, and owner-bound account deletion')
} finally { await database.close() }
