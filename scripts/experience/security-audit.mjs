// Security checks against only the identities created by account-api-qa.mjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
const require=createRequire(import.meta.url);
function compiled(file,dependencies={}) {
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require:id=>dependencies[id] || require(id),URL});return module.exports;
}
let checks=0;
const {safeAuthRedirect}=compiled('src/lib/auth-redirect.ts');
for(const input of ['https://evil.example','//evil.example','javascript:alert(1)','/\\evil.example','/%2f%2fevil.example','/%5cevil.example','/\n/evil.example','/%00evil','%not-a-url','/..//evil.example','/a/..//evil.example','/%2e%2e//evil.example']) {assert.equal(safeAuthRedirect(input),'/account');checks++;}
assert.equal(safeAuthRedirect('/experience?trip=123#richiesta'),'/experience?trip=123#richiesta');checks++;
const content=compiled('src/data/experience-content.ts');
const {tripWriteSchema,savedTripSchema}=compiled('src/lib/experience-trips.ts',{'@/data/experience-content':content});
const valid={title:'QA',payload:{version:1,ids:['activity:silk'],lake:'Lago di Como'}};
assert.ok(tripWriteSchema.safeParse(valid).success);checks++;
for(const value of [{...valid,user_id:'forged'},{...valid,total_cents:1},{...valid,payload:{...valid.payload,ids:['activity:unknown']}},{...valid,payload:{...valid.payload,ids:['boat:captain','boat:freedom']}},{...valid,payload:{...valid.payload,ids:['activity:silk','activity:silk']}},{...valid,title:'a'.repeat(81)},{...valid,payload:{...valid.payload,quote:{total:1}}}]) {assert.ok(!tripWriteSchema.safeParse(value).success);checks++;}
nextEnv.loadEnvConfig(process.cwd());
const state=JSON.parse(fs.readFileSync('/private/tmp/experience-account-qa.json','utf8'));
const base='http://localhost:3012';const jar=new Map();
const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cookies=>cookies.forEach(cookie=>jar.set(cookie.name,cookie.value))}});
const {error}=await client.auth.signInWithPassword({email:state.users[0].email,password:state.users[0].password});if(error)throw error;
const headers={cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; '),origin:base,'Content-Type':'application/json'};
const oversized=await fetch(base+'/api/experience/trips',{method:'POST',headers,body:' '.repeat(33000)});assert.equal(oversized.status,413);checks++;
const malformed=await fetch(base+'/api/experience/trips',{method:'POST',headers,body:'{broken'});assert.equal(malformed.status,400);checks++;
const anonymous=await fetch(base+'/api/experience/trips',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify(valid)});assert.equal(anonymous.status,401);checks++;
const list=await fetch(base+'/api/experience/trips',{headers});assert.ok(list.headers.get('cache-control').includes('no-store'));checks++;
const exportedResponse=await fetch(base+'/api/account/export',{headers});assert.equal(exportedResponse.status,200);const exported=await exportedResponse.json();const exportedTrip=exported.experience_trips.find(trip=>trip.id===state.tripId);assert.ok(exportedTrip);assert.equal(exportedTrip.experience_quotes.length,1);checks++;
const wrongPassword=await fetch(base+'/api/account/delete',{method:'DELETE',headers,body:JSON.stringify({password:'wrong-qa-password'})});assert.equal(wrongPassword.status,401);checks++;
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const user=await admin.auth.admin.getUserById(state.users[0].id);assert.equal(user.data.user.id,state.users[0].id);checks++;
// A write response must have the complete shape consumed by SaveTripAccount.
const ownTrips=await (await fetch(base+'/api/experience/trips',{headers})).json();const ownTrip=ownTrips.trips.find(trip=>trip.id===state.tripId);assert.ok(ownTrip);
const writeBody={id:ownTrip.id,updated_at:ownTrip.updated_at,title:ownTrip.title,payload:ownTrip.payload};
const write=await fetch(base+'/api/experience/trips',{method:'POST',headers,body:JSON.stringify(writeBody)});assert.equal(write.status,200);assert.ok(savedTripSchema.safeParse((await write.json()).trip).success);checks++;
const conflict=await fetch(base+'/api/experience/trips',{method:'POST',headers,body:JSON.stringify(writeBody)});assert.equal(conflict.status,409);checks++;
// Invalid trip references must be rejected before contacts are inserted or email is sent.
const before=await admin.from('contacts').select('id',{count:'exact',head:true}).eq('email',state.users[0].email);if(before.error)throw before.error;
const tokenResponse=await fetch(base+'/api/antibot/token');assert.equal(tokenResponse.status,200);const {token}=await tokenResponse.json();
await new Promise(resolve=>setTimeout(resolve,2100));
const contact={email:state.users[0].email,messaggio:'QA rejection check. This message must never be submitted.',antibot_token:token,experienceTripId:state.tripId,experienceTripVersion:'2000-01-01T00:00:00Z'};
const unauthContact=await fetch(base+'/api/contatti',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify(contact)});assert.equal(unauthContact.status,401);checks++;
const foreignContact=await fetch(base+'/api/contatti',{method:'POST',headers,body:JSON.stringify({...contact,experienceTripId:'00000000-0000-4000-8000-000000000001'})});assert.equal(foreignContact.status,404);checks++;
const outdatedContact=await fetch(base+'/api/contatti',{method:'POST',headers,body:JSON.stringify(contact)});assert.equal(outdatedContact.status,409);checks++;
const after=await admin.from('contacts').select('id',{count:'exact',head:true}).eq('email',state.users[0].email);if(after.error)throw after.error;assert.equal(after.count,before.count);checks++;
console.log(`Experience security: ${checks} validation, redirect, privacy and account checks passed.`);
