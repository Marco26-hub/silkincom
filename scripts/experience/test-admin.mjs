// Database verification in isolated Postgres; no production users or records.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();let checks=0;
const owner='11111111-1111-4111-8111-111111111111';const other='22222222-2222-4222-8222-222222222222';
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${owner}'),('${other}');create table public.profiles(id uuid primary key,role text);insert into profiles values('${owner}','customer'),('${other}','admin');grant select on profiles to authenticated;create table public.contacts(id bigint generated always as identity primary key,messaggio text);insert into contacts(messaggio)values('Private QA request');alter table contacts enable row level security;grant select on contacts to authenticated;create policy contacts_admin on contacts for select to authenticated using(exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin'));`);
await db.exec(fs.readFileSync('supabase/migrations/057_experience_trips.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/058_experience_admin.sql','utf8'));checks++;
async function role(name,uid=''){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${uid}',false);set role ${name};`);}
await role('authenticated',owner);
const trip=(await db.query('insert into experience_trips(user_id,title,payload) values($1,$2,$3) returning id,updated_at::text',[owner,'QA',JSON.stringify({version:1,ids:['boat:aperitif'],lake:'Lago di Como'})])).rows[0];
for(const table of ['experience_suppliers','experience_services','experience_quote_details']){await assert.rejects(db.query(`select * from ${table}`));checks++;}
assert.equal((await db.query('select * from contacts')).rows.length,0);checks++;
await role('authenticated',other);assert.equal((await db.query('select * from contacts')).rows.length,1);checks++;
const args=[null,trip.id,trip.updated_at,null,JSON.stringify([{label:'QA boat',quantity:2,cost_cents:7000,price_cents:10000,service_id:null,supplier_id:null}]),['Navigazione'],['Trasferimenti'],'QA conditions',new Date(Date.now()+86400000).toISOString(),'PRIVATE QA COST NOTES',false];
const sql='select public.admin_save_experience_quote($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as id';
await assert.rejects(db.query(sql,args));checks++;
await role('service_role');
const id=(await db.query(sql,args)).rows[0].id;checks++;
const draft=(await db.query('select * from experience_quotes where id=$1',[id])).rows[0];assert.equal(draft.total_cents,20000);assert.equal(draft.status,'draft');checks++;
assert.equal((await db.query('select * from experience_quote_details where quote_id=$1',[id])).rows[0].internal_notes,'PRIVATE QA COST NOTES');checks++;
await role('authenticated',owner);assert.equal((await db.query('select * from experience_quotes')).rows.length,0);checks++;
await role('service_role');
await assert.rejects(db.query(sql,[id,trip.id,'2000-01-01T00:00:00Z',draft.updated_at,...args.slice(4,10),true]));checks++;
await assert.rejects(db.query(sql,[id,trip.id,trip.updated_at,'2000-01-01T00:00:00Z',...args.slice(4,10),true]));checks++;
await assert.rejects(db.query(sql,[null,trip.id,trip.updated_at,null,JSON.stringify([{label:'Invalid',quantity:0,cost_cents:0,price_cents:100}]),...args.slice(5)]));checks++;
await assert.rejects(db.query(sql,[null,trip.id,trip.updated_at,null,JSON.stringify([{label:'Invalid',quantity:1,cost_cents:null,price_cents:null}]),...args.slice(5)]));checks++;
await assert.rejects(db.query(sql,[null,trip.id,trip.updated_at,null,...args.slice(4,8),null,args[9],true]));checks++;
await db.query(sql,[id,trip.id,trip.updated_at,draft.updated_at,...args.slice(4,10),true]);checks++;
await role('authenticated',owner);assert.equal((await db.query('select * from experience_quotes')).rows.length,1);checks++;
await role('authenticated',other);assert.equal((await db.query('select * from experience_quotes')).rows.length,0);checks++;
await role('service_role');const sent=(await db.query('select * from experience_quotes where id=$1',[id])).rows[0];await assert.rejects(db.query(sql,[id,trip.id,trip.updated_at,sent.updated_at,...args.slice(4)]));checks++;
const unknownCost=[{label:'Unknown cost',quantity:1,cost_cents:null,price_cents:10000,service_id:null,supplier_id:null}];await db.query(sql,[null,trip.id,trip.updated_at,null,JSON.stringify(unknownCost),...args.slice(5)]);checks++;
await role('anon');await assert.rejects(db.query('select * from experience_quote_details'));checks++;
await db.close();console.log(`Experience admin: ${checks} isolated permissions, pricing and concurrency checks passed.`);
