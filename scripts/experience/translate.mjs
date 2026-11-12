// Scope: Experience only. Credentials stay in memory and are never written or logged.
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const directory = 'messages/experience';
const ui = JSON.parse(fs.readFileSync(`${directory}/ui-source.json`, 'utf8'));
const source = new Set(ui);
const humanFields = new Set(['label','description','title','location','summary','detail','format','audience','subtitle','stops','features']);
const javascript = ts.transpileModule(fs.readFileSync('src/data/experience-content.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const data = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
function collect(value, key='', all=false) {
  if (typeof value==='string') {if (all || humanFields.has(key)) source.add(value.trim());return;}
  if(Array.isArray(value)) {value.forEach(v=>collect(v,key,all));return;}
  if(value && typeof value==='object') Object.entries(value).forEach(([k,v])=>collect(v,k,all));
}
for(const key of ['EXPERIENCE_CATEGORIES','EXPERIENCES','BOAT_PACKAGES','JOURNEYS','LOGISTICS']) collect(data[key]);
collect(data.FAQ,'',true);
for(const file of ['src/lib/experience-maps.ts','src/app/[locale]/experience/page.tsx']) {
  const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  function visit(node) {
    if(ts.isStringLiteral(node)&&/[A-ZÀ-ÿ]|\s/.test(node.text)&&!/^https?:|^\//.test(node.text)) {
      source.add(node.text.trim());
      if(file.endsWith('experience-maps.ts')&&!ui.includes(node.text.trim()))ui.push(node.text.trim());
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
}
fs.writeFileSync(`${directory}/ui-source.json`,JSON.stringify([...new Set(ui)].sort(),null,2)+'\n');
const italian=Object.fromEntries([...source].filter(Boolean).sort().map(s=>[s,s]));
fs.writeFileSync(`${directory}/it.json`,JSON.stringify(italian,null,2)+'\n');
if(process.argv.includes('--extract')) {console.log(`Experience source: ${Object.keys(italian).length} strings.`);process.exit(0);}

async function apiKey() {
  if(process.env.OPENROUTER_API_KEY)return process.env.OPENROUTER_API_KEY;
  console.log('[experience-translate] Environment key absent; using the existing encrypted admin integration.');
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!service)throw new Error('Translation credentials are not configured.');
  const r=await fetch(`${base}/rest/v1/integrations?provider=eq.openrouter&select=access_token&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});
  if(!r.ok)throw new Error(`Admin integration lookup failed: HTTP ${r.status}`);
  const stored=(await r.json())[0]?.access_token;
  if(!stored?.startsWith('enc:v1:'))throw new Error('Encrypted OpenRouter integration is missing.');
  const [iv,tag,payload]=stored.slice('enc:v1:'.length).split(':');
  const cipher=crypto.createDecipheriv('aes-256-gcm',crypto.createHash('sha256').update(`${service}:openrouter-key`).digest(),Buffer.from(iv,'base64'));
  cipher.setAuthTag(Buffer.from(tag,'base64'));
  return Buffer.concat([cipher.update(Buffer.from(payload,'base64')),cipher.final()]).toString('utf8');
}
const key=await apiKey();
const model=process.env.TRANSLATE_MODEL || 'openai/gpt-4.1-mini';
const catalogResponse=await fetch('https://openrouter.ai/api/v1/models');
if(!catalogResponse.ok)throw new Error(`Model catalog failed: HTTP ${catalogResponse.status}`);
if(!(await catalogResponse.json()).data?.some(m=>m.id===model))throw new Error(`Configured translation model is unavailable: ${model}`);
console.log(`[experience-translate] Model: ${model}. Only public Experience copy is submitted.`);
const languages={en:'English (international, polished and natural)',es:'Spanish (formal usted)',fr:'French (formal vous)',de:'German (formal Sie)',pt:'European Portuguese (formal)',nl:'Dutch (formal u)'};
const placeholders=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
const BATCH=65;
async function translateLocale(locale) {
  const output=JSON.parse(fs.readFileSync(`${directory}/${locale}.json`,'utf8'));
  for(const text of Object.keys(italian)) if(!/[\p{L}]/u.test(text.replace(/\{\w+\}/g,'')))output[text]=text;
  const entries=Object.keys(italian).filter(s=>!output[s]);
  for(let i=0;i<entries.length;i+=BATCH) {
    const batch=entries.slice(i,i+BATCH);
    const payload=Object.fromEntries(batch.map((s,n)=>[`u${n}`,s]));
    let translated;
    for(let attempt=0;attempt<3;attempt++) {
      const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
        method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${key}`,'HTTP-Referer':'https://www.silkincom.com','X-Title':'SILKinCOM Experience translations'},
        body:JSON.stringify({model,temperature:0.1,max_tokens:14000,response_format:{type:'json_object'},messages:[
          {role:'system',content:`Translate an Italian luxury travel page for SILKinCOM into ${languages[locale]}. The offer covers Lake Como and Lake Maggiore: boat rental, captain, aperitif, villas, gourmet, Gin & Wine, golf, weaving/dyeing/showrooms, airport/railway pickup and a tailored inquiry form. Use clear, attractive, restrained and professional language. Keep SILKinCOM, Como Silk Experience, Gin & Wine Experience and proper place/operator names unchanged. Translate lake names naturally. Preserve the meaning of every availability, eligibility, no-license, optional-purchase, cost and booking qualification. Never add partners, prices, guarantees or certifications. Keep placeholders such as {value0}, {lake}, {interests} EXACTLY. Some strings are sentence fragments or labels: translate only that fragment, never add context or punctuation that is absent. Keep technical identifiers, URLs, email, CV and dates unchanged. Output ONLY JSON with exactly the input u-keys and translated string values.`},
          {role:'user',content:JSON.stringify(payload)}]})});
      if(!response.ok){console.error(`[experience-translate] ${locale} batch ${i}: HTTP ${response.status}, attempt ${attempt+1}.`);if(response.status===429&&attempt<2){await new Promise(r=>setTimeout(r,15000));continue;}throw new Error(`Translation request failed: HTTP ${response.status}`);}
      const result=await response.json();
      if(result.choices?.[0]?.finish_reason==='length')throw new Error(`Truncated translation rejected: ${locale} batch ${i}`);
      translated=JSON.parse(result.choices?.[0]?.message?.content?.replace(/^```(?:json)?\s*|\s*```$/g,'')||'{}');
      break;
    }
    batch.forEach((s,n)=>{const value=translated[`u${n}`];if(typeof value!=='string'||!value.trim()||placeholders(value)!==placeholders(s))throw new Error(`Invalid translation rejected: ${locale} u${n}, batch ${i}`);output[s]=value.trim();});
    fs.writeFileSync(`${directory}/${locale}.json`,JSON.stringify(output,null,2)+'\n');
    console.log(`[experience-translate] ${locale}: ${Math.min(i+BATCH,entries.length)}/${entries.length}.`);
  }
  const missing=Object.keys(italian).filter(s=>!output[s]);
  if(missing.length)throw new Error(`Missing ${locale} translations: ${missing.length}`);
  console.log(`[experience-translate] ${locale}: complete, ${Object.keys(italian).length} verified strings.`);
}
const locales=Object.keys(languages);
for(let i=0;i<locales.length;i+=2)await Promise.all(locales.slice(i,i+2).map(translateLocale));
