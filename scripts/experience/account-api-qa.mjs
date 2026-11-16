// Uses short-lived, confirmed QA identities. Never sends an email or inquiry.
// UI mode retains the two test identities for inspection; --cleanup removes only those exact QA users.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
nextEnv.loadEnvConfig(process.cwd());
const file='/private/tmp/experience-account-qa.json';
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function cleanup(users) {
  for(const user of users) {
    assert.ok(user.email.startsWith('qa-experience-') && user.email.endsWith('@example.invalid'));
    const {data,error}=await admin.auth.admin.getUserById(user.id);
    if(error) { if(error.status===404) {console.warn('[qa-cleanup] Test identity already absent.');continue;} throw error; }
    assert.equal(data.user.email,user.email);
    for (const [table,column,value] of [['experience_trips','user_id',user.id],['email_lifecycle_jobs','recipient_email',user.email],['customers','id',user.id]]) {
      const {error:removal}=await admin.from(table).delete().eq(column,value);
      if(removal) throw new Error('[qa-cleanup] '+table+': '+removal.code);
    }
    const {error:deletion}=await admin.auth.admin.deleteUser(user.id);
    if(deletion) throw deletion;
  }
}
if(process.argv.includes('--cleanup')) {
  const state=JSON.parse(fs.readFileSync(file,'utf8'));
  await cleanup(state.users);fs.unlinkSync(file);console.log('Experience QA identities and their itineraries removed.');process.exit(0);
}
const base=process.env.EXPERIENCE_TEST_BASE || 'http://localhost:3012';
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base),'Only a local application may be tested.');
if(fs.existsSync(file)) throw new Error('QA identities already exist. Run --cleanup first.');
const users=[];let keep=false;let checks=0;
try {
  const anon=await fetch(base+'/api/experience/trips');assert.equal(anon.status,401);checks++;
  const csrf=await fetch(base+'/api/experience/trips',{method:'POST',headers:{origin:'https://unrelated.example','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);checks++;
  for(let i=0;i<2;i++) {
    const email=`qa-experience-${crypto.randomUUID()}@example.invalid`;const password=crypto.randomBytes(30).toString('base64url');
    const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Experience QA',qa_experience:true}});
    if(error)throw error;
    users.push({id:data.user.id,email,password});
  }
  async function session(user) {
    const jar=new Map();
    const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cookies=>cookies.forEach(cookie=>jar.set(cookie.name,cookie.value))}});
    const {error}=await client.auth.signInWithPassword({email:user.email,password:user.password});if(error)throw error;
    const request=(path='',init={})=>fetch(base+'/api/experience/trips'+path,{...init,headers:{origin:base,'Content-Type':'application/json',cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; '),...init.headers}});
    return {client,request};
  }
  const a=await session(users[0]);const b=await session(users[1]);
  const payload={version:1,ids:['activity:silk','boat:captain'],lake:'Lago di Como',details:{arrival:'',departure:'',guests:2,budget:'',experienceStyle:'private',arrivalPoint:'',hotel:'',stops:[],notes:'Technical QA itinerary; not a customer request.'}};
  const created=await a.request('',{method:'POST',body:JSON.stringify({title:'[QA] Como · seta e navigazione',payload})});assert.equal(created.status,201,await created.clone().text());const {trip}=await created.json();checks++;
  const own=await a.request();assert.equal((await own.json()).trips.length,1);checks++;
  const foreign=await b.request('?id='+trip.id);assert.equal(foreign.status,404);checks++;
  const forged=await b.request('',{method:'POST',body:JSON.stringify({id:trip.id,title:'Forbidden',payload,updated_at:trip.updated_at})});assert.equal(forged.status,409);checks++;
  const direct=await b.client.from('experience_trips').select('id').eq('id',trip.id);assert.equal(direct.data.length,0);checks++;
  const injected=await a.request('',{method:'POST',body:JSON.stringify({title:'Fake',payload,total_cents:1})});assert.equal(injected.status,400);checks++;
  const unknown=await a.request('',{method:'POST',body:JSON.stringify({title:'Fake',payload:{...payload,ids:['activity:unknown']}})});assert.equal(unknown.status,400);checks++;
  const updatedResponse=await a.request('',{method:'POST',body:JSON.stringify({id:trip.id,updated_at:trip.updated_at,title:'[QA] Il mio viaggio a Como',payload})});assert.equal(updatedResponse.status,200);const updated=(await updatedResponse.json()).trip;checks++;
  const stale=await a.request('',{method:'POST',body:JSON.stringify({id:trip.id,updated_at:trip.updated_at,title:'Stale',payload})});assert.equal(stale.status,409);checks++;
  const q={trip_id:trip.id,total_cents:79000,currency:'EUR',conditions:'Esempio tecnico riservato al collaudo. Non è un’offerta commerciale.',inclusions:['Navigazione con capitano','Visita produttiva da concordare'],exclusions:['Trasferimenti'],trip_updated_at:updated.updated_at};
  const {error:draftError}=await admin.from('experience_quotes').insert({...q,status:'draft'});if(draftError)throw draftError;
  const hidden=await a.request('?id='+trip.id);assert.equal((await hidden.json()).trips[0].experience_quotes.length,0);checks++;
  const {error:sentError}=await admin.from('experience_quotes').insert({...q,status:'sent'});if(sentError)throw sentError;
  const visible=await a.request('?id='+trip.id);assert.equal((await visible.json()).trips[0].experience_quotes.length,1);checks++;
  const priceTamper=await a.client.from('experience_quotes').update({total_cents:1}).eq('trip_id',trip.id);assert.ok(priceTamper.error);checks++;
  const quoteForeign=await b.client.from('experience_quotes').select('id');assert.equal(quoteForeign.data.length,0);checks++;
  const exported=await fetch(base+'/api/account/export',{headers:{cookie:''}});assert.equal(exported.status,401);checks++;
  if(process.argv.includes('--keep')){fs.writeFileSync(file,JSON.stringify({users,tripId:trip.id}),{mode:0o600});keep=true;}
  console.log(`Experience account API: ${checks} authenticated/privacy checks passed. No messages sent.`);
} finally {if(!keep)await cleanup(users);}
