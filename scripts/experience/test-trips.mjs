// Isolated Postgres/RLS verification. No production users or records are used.
// npm install --prefix /private/tmp/experience-qa --no-save --ignore-scripts @electric-sql/pglite
// PGLITE_MODULE=/private/tmp/experience-qa/node_modules/@electric-sql/pglite/dist/index.js node scripts/experience/test-trips.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let checks = 0;
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
insert into auth.users values ('${owner}'),('${other}');`);
await db.exec(fs.readFileSync('supabase/migrations/057_experience_trips.sql','utf8'));
checks++;
async function role(name, uid='') { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${uid}',false); set role ${name};`); }
const payload = JSON.stringify({version:1,ids:['activity:silk'],lake:'Lago di Como'});
await role('authenticated', owner);
const first = (await db.query('insert into public.experience_trips(user_id,title,payload) values ($1,$2,$3) returning id,updated_at::text as updated_at',[owner,'Owner trip',payload])).rows[0]; checks++;
await assert.rejects(db.query('insert into public.experience_trips(user_id,title,payload) values ($1,$2,$3)',[other,'Forged owner',payload])); checks++;
await role('authenticated',other);
assert.equal((await db.query('select * from public.experience_trips')).rows.length,0); checks++;
assert.equal((await db.query('update public.experience_trips set title=$1 where id=$2 returning id',['Tampered',first.id])).rows.length,0); checks++;
await db.query('insert into public.experience_trips(user_id,title,payload) values ($1,$2,$3)',[other,'Other trip',payload]);
await role('authenticated',owner);
assert.equal((await db.query('select * from public.experience_trips')).rows.length,1); checks++;
await assert.rejects(db.query('update public.experience_trips set user_id=$1 where id=$2',[other,first.id])); checks++;
await role('postgres');
for(const status of ['draft','sent']) await db.query("insert into public.experience_quotes(trip_id,total_cents,conditions,status,trip_updated_at) values ($1,79000,'Test quote',$2,$3)",[first.id,status,first.updated_at]);
await role('authenticated',other);
assert.equal((await db.query('select * from public.experience_quotes')).rows.length,0); checks++;
await role('authenticated',owner);
assert.equal((await db.query('select * from public.experience_quotes')).rows.length,1); checks++;
await assert.rejects(db.query("update public.experience_quotes set total_cents=1")); checks++;
await assert.rejects(db.query("insert into public.experience_quotes(trip_id,total_cents,conditions,trip_updated_at) values ($1,1,'Fake price',now())",[first.id])); checks++;
const updated = (await db.query('update public.experience_trips set title=$1 where id=$2 and updated_at=$3 returning updated_at::text as updated_at',['Updated trip',first.id,first.updated_at])).rows[0];
assert.ok(updated);assert.notEqual(String(updated.updated_at),String(first.updated_at));checks++;
assert.equal((await db.query('update public.experience_trips set title=$1 where id=$2 and updated_at=$3 returning id',['Stale overwrite',first.id,first.updated_at])).rows.length,0);checks++;
await role('anon');
await assert.rejects(db.query('select * from public.experience_trips'));checks++;
await assert.rejects(db.query('select * from public.experience_quotes'));checks++;
await role('postgres');
await db.query('delete from auth.users where id=$1',[owner]);
assert.equal((await db.query('select * from public.experience_quotes')).rows.length,0);checks++;
await db.close();
console.log(`Experience trips: ${checks} isolated Postgres/privacy checks passed.`);
