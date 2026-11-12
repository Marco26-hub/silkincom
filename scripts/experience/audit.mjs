import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://localhost:3012';
const expectIndex = process.argv.includes('--production');
const locales = ['it','en','es','fr','de','pt','nl'];
const source = JSON.parse(fs.readFileSync('messages/experience/it.json','utf8'));
const results=[];
for (const locale of locales) {
 const copy=JSON.parse(fs.readFileSync(`messages/experience/${locale}.json`,'utf8'));
 for (const key of Object.keys(source)) {
  assert.ok(copy[key],`${locale}: missing ${key}`);
  assert.deepEqual((copy[key].match(/\{\w+\}/g)||[]).sort(),(key.match(/\{\w+\}/g)||[]).sort(),`${locale}: placeholders`);
 }
 const path = `${locale==='it'?'':`/${locale}`}/experience`;
 const r=await fetch(base+path); const html=await r.text();
 assert.equal(r.status,200,`${locale}: HTTP`);
 assert.equal((html.match(/<h1\b/g)||[]).length,1,`${locale}: one H1`);
 assert.ok(html.includes('id="experience-form"'),`${locale}: form target`);
 assert.ok(html.includes('property="og:title" content="SILKinCOM VIP Experience"'),`${locale}: branded sharing title`);
 assert.ok(html.includes(`href="https://www.silkincom.com${path}"`),`${locale}: canonical`);
 for(const language of [...locales,'x-default'])assert.ok(html.includes(`hrefLang="${language}"`),`${locale}: alternate ${language}`);
 const jsonld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 function flatten(x){if(Array.isArray(x))return x.flatMap(flatten);if(x&&typeof x==='object')return [x,...Object.values(x).flatMap(flatten)];return [];}
 const nodes=jsonld.flatMap(flatten);
 const list=nodes.find(n=>n['@type']==='ItemList');
 assert.equal(list?.numberOfItems,19,`${locale}: schema activity count`);
 assert.ok(html.includes(expectIndex?'content="index, follow"':'content="noindex, nofollow"'),`${locale}: robots`);
 results.push({locale,status:r.status,strings:Object.keys(source).length,activities:list.numberOfItems,canonical:`https://www.silkincom.com${path}`,passed:true});
 console.log(`${locale}: HTTP 200, metadata, 19 schema entries, translation coverage passed`);
}
fs.writeFileSync('docs/experience/qa/http-audit.json',JSON.stringify({date:'2026-11-12',base,expectIndex,results},null,2)+'\n');
