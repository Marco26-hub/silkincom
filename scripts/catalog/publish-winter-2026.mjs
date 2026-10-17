import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const apply=process.argv.includes('--apply');
const expected=JSON.parse(await fs.readFile('src/data/winter-2026-products.json','utf8'));
const folder='consegna_finale/inverno-2026/pubblicazione-2026-10-17';
await fs.mkdir(folder,{recursive:true});
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(base&&service,'Publication refused: configuration missing');
const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:'return=representation'};
const slugFilter='in.('+expected.map(p=>p.slug).join(',')+')';
async function api(table,params,method='GET',body,anonymous=false){
 const url=new URL('/rest/v1/'+table,base);for(const[k,v]of Object.entries(params))url.searchParams.set(k,v);
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const response=await fetch(url,{method,headers:anonymous?{apikey:anon,Authorization:'Bearer '+anon}:headers,...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok)throw new Error(`${method} ${table}: HTTP ${response.status}`);
 return response.json();
}
const query={select:'id,slug,status,name,sku,price,origin,name_i18n,description_short_i18n,description_long_i18n,composition_i18n,product_images(image_url,is_primary,display_order),product_variants(id,size,inventory(quantity_available,quantity_reserved))',slug:slugFilter};
const before=await api('products',query);
assert.equal(before.length,3,'Expected the three named winter products');
for(const expectedProduct of expected){
 const p=before.find(p=>p.slug===expectedProduct.slug);assert.ok(p);
 assert.ok(['draft','published'].includes(p.status),'Unexpected status: '+p.slug);
 assert.equal(Number(p.price),expectedProduct.price,'Price mismatch: '+p.slug);
 for(const key of ['name_i18n','description_short_i18n','description_long_i18n','composition_i18n'])
  for(const locale of ['it','en','es','fr','de','pt','nl'])assert.ok(p[key]?.[locale]?.trim(),p.slug+': missing '+key+'/'+locale);
 assert.equal(p.product_images.filter(i=>i.is_primary).length,1,p.slug+': primary photo');
 assert.equal(p.product_images.length,p.slug.startsWith('menaggio-')?5:3,p.slug+': gallery count');
 assert.equal(p.product_variants.length,expectedProduct.sizes.length,p.slug+': sizes');
 for(const size of expectedProduct.sizes){const variant=p.product_variants.find(v=>v.size===size);assert.ok(variant,p.slug+': '+size);assert.equal(variant.inventory.length,1);assert.equal(variant.inventory[0].quantity_available,expectedProduct.stockPerSize,p.slug+': stock '+size);assert.equal(variant.inventory[0].quantity_reserved,0,p.slug+': reservations '+size);}
 console.log('VERIFIED',p.slug,p.status,Number(p.price)+' EUR',p.product_variants.map(v=>v.size+':'+v.inventory[0].quantity_available).join(' '));
}
const categoryFilter='in.('+expected.map(p=>p.key).join(',')+')';
const categories=await api('categories',{select:'id,slug,is_active',slug:categoryFilter});assert.equal(categories.length,3);
await fs.writeFile(folder+'/publication-before.json',JSON.stringify({at:new Date().toISOString(),products:before,categories},null,2)+'\n');
if(!apply){console.log('DRY RUN: verified; no database mutations.');process.exit(0);}
const activated=await api('categories',{slug:categoryFilter,is_active:'eq.false',select:'id,slug,is_active'},'PATCH',{is_active:true});
console.log('Activated winter categories:',activated.length);
const drafts=before.filter(p=>p.status==='draft');
if(drafts.length){
 const published=await api('products',{id:'in.('+drafts.map(p=>p.id).join(',')+')',status:'eq.draft',select:'id,slug,status'},'PATCH',{status:'published'});
 assert.equal(published.length,drafts.length,'Publication partially applied; inspect audit before retrying');
 console.log('Published products:',published.map(p=>p.slug).join(', '));
}else console.log('SKIP status mutation: all three products are already published.');
const after=await api('products',query);assert.ok(after.every(p=>p.status==='published'));
const publicRows=await api('products',{select:'id,slug,status,price',slug:slugFilter},'GET',null,true);
assert.equal(publicRows.length,3,'Anonymous visibility verification failed');
assert.ok(publicRows.every(p=>p.status==='published'));
const audit={at:new Date().toISOString(),authorizedBy:'Marco: verify products and publish drafts in this chat',products:after,public:publicRows,stockChanged:false,discountChanged:false,originChanged:false,paymentsCreated:0};
await fs.writeFile(folder+'/publication-result.json',JSON.stringify(audit,null,2)+'\n');
console.log('PUBLIC READ-BACK OK: three published products. Domaso remains at zero stock.');
