const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {parseSuggestions,suggestLocations}=require('../src/data/location-suggestions.ts');
const feature=(props={},geometry={type:'Point',coordinates:[121.05,14.65]})=>({properties:{countrycode:'PH',name:'Quezon City',city:'Quezon City',state:'Metro Manila',...props},geometry});
test('suggestions retain Philippine area context and discard invalid or duplicate matches',()=>{
 const rows=parseSuggestions({features:[feature(),feature(),feature({countrycode:'US'}),feature({name:''}),feature({}, {type:'Point',coordinates:[NaN,14]}),feature({name:'Quezon',state:'Bukidnon',city:'Quezon'})]});
 assert.equal(rows.length,2);assert.equal(rows[0].label,'Quezon City, Metro Manila, Philippines');assert.equal(rows[1].label,'Quezon, Bukidnon, Philippines');assert.deepEqual(rows[0].at,[14.65,121.05]);
 assert.throws(()=>parseSuggestions({}));
});
test('autocomplete failure never produces fake recommendations; cancelled requests do not run',async()=>{
 const old=global.fetch;try {let calls=0;global.fetch=async()=>{calls++;return {ok:false}};
 await assert.rejects(suggestLocations('Autocompletion failure test',new AbortController().signal),/unavailable/);
 const c=new AbortController();c.abort();await assert.rejects(suggestLocations('Quezon City',c.signal),{name:'AbortError'});assert.equal(calls,1);
 assert.deepEqual(await suggestLocations('Qu',new AbortController().signal),[]);
 }finally{global.fetch=old}
});
