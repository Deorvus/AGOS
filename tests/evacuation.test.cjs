const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const { evacuationQuery, parseSites, findEvacuationSites, searchAreas } = require('../src/data/evacuation.ts');
const at = [10.3157,123.8854];
const item=(id,tags={},extra={})=>({type:'node',id,lat:10.32,lon:123.89,tags,...extra});

test('address fragments stay source-faithful and cannot be labeled reviewed',()=>{
 const rows=parseSites({elements:[
  item(91,{name:'Evacuation Center'}),
  item(92,{name:'Evacuation Center','addr:street':'Grey'}),
  item(93,{name:'Evacuation Center','addr:street':'Example source street','addr:city':'Cebu City'})
 ]},at,25000);
 assert.deepEqual(rows.map(s=>s.addressStatus),['missing','partial','unreviewed']);
 assert.equal(rows[1].address,'Grey');
 assert.equal(rows[2].address,'Example source street, Cebu City');
});

test('evacuation search is country-constrained and rejects invalid locations/ranges',()=>{
 assert.match(evacuationQuery(at,25000),/ISO3166-1.*PH/);
 assert.match(evacuationQuery(at,25000),/area.ph/);
 for(const [pos,r] of [[[NaN,123],25000],[[40,-74],25000],[at,500000]]) assert.throws(()=>evacuationQuery(pos,r));
});
test('ordinary schools, assembly points and generic shelters cannot become evacuation centers',()=>{
 const rows=parseSites({elements:[item(1,{name:'School',amenity:'school'}),item(2,{emergency:'assembly_point'}),item(3,{social_facility:'shelter'}),item(4,{name:'Evacuation Center'}),item(5,{'emergency:social_facility':'shelter'})]},at,25000);
 assert.deepEqual(rows.map(x=>x.id),['node/4','node/5']);
 assert.equal(rows[0].address,'Address not provided on the map');
 assert.equal(rows[1].name,'Mapped emergency shelter');
});
test('mapping failures and invalid geometry cannot masquerade as complete results',()=>{
 assert.throws(()=>parseSites({elements:[],remark:'timed out'},at,25000));
 assert.throws(()=>parseSites({},at,25000));
 const rows=parseSites({elements:[item(1,{name:'Evacuation Centre'},{lat:NaN}),item(2,{name:'Evacuation Centre'},{lat:14.6,lon:121}),item(3,{name:'Evacuation Centre'}),item(3,{name:'Evacuation Centre'})]},at,25000);
 assert.equal(rows.length,1);
 assert.equal(rows[0].sourceUrl,'https://www.openstreetmap.org/node/3');
});
test('site identities distinguish node and way; results are ordered by distance',()=>{
 const rows=parseSites({elements:[item(7,{name:'Evacuation Centre'},{lat:10.4}),item(7,{'emergency:social_facility':'shelter'},{type:'way',lat:undefined,lon:undefined,center:{lat:10.316,lon:123.886}})]},at,25000);
 assert.deepEqual(rows.map(x=>x.id),['way/7','node/7']);
 assert.ok(rows[0].distance<rows[1].distance);
});
test('failed service does not invent shelters; user cancellation stops retries',async()=>{
 const old=global.fetch;
 try{
  let requests=0; global.fetch=async()=>{requests++;return {ok:false}};
  await assert.rejects(findEvacuationSites(at,10000,new AbortController().signal),/unavailable/);
  assert.equal(requests,2);
  const c=new AbortController();c.abort();requests=0;
  await assert.rejects(findEvacuationSites(at,10000,c.signal),{name:'AbortError'});
  assert.equal(requests,0);
 }finally{global.fetch=old}
});
test('manual location results must be in the Philippines, not merely similarly named',async()=>{
 const old=global.fetch;
 try{
  global.fetch=async()=>({ok:true,json:async()=>[
   {place_id:1,lat:10.3,lon:123.8,display_name:'Cebu City, Philippines',address:{country_code:'ph'}},
   {place_id:2,lat:10.3,lon:123.8,display_name:'Unverified place',address:{}},
   {place_id:3,lat:40,lon:-74,display_name:'Cebu elsewhere',address:{country_code:'us'}}
  ]});
  const rows=await searchAreas('Cebu City',new AbortController().signal);
  assert.equal(rows.length,1);
  assert.equal(rows[0].label,'Cebu City, Philippines');
 }finally{global.fetch=old}
});

test('bundled mapped-site extract supports Luzon/Visayas/Mindanao without claiming operating status',()=>{
 const path=require('node:path');const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/evacuation-sites.json'),'utf8'));
 assert.equal(snapshot.snapshotDate,'2024-07-21');
 assert.equal(snapshot.source,'OpenStreetMap');
 for(const at of [[14.6,121],[10.3157,123.8854],[7.0731,125.6128]]){
  const sites=parseSites(snapshot,at,25000);
  assert.ok(sites.length>0);
  assert.ok(sites.every(s=>s.distance<=25000 && s.sourceUrl.startsWith('https://www.openstreetmap.org/')));
  assert.ok(sites.every(s=>!('open' in s)&&!('capacity' in s)));
 }
});
