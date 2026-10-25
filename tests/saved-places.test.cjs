const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {DEFAULT_SETTINGS,savedPlace}=require('../src/data/user.ts');
test('new profiles do not assume home/work; legacy names still resolve',()=>{
 assert.equal(savedPlace(DEFAULT_SETTINGS,'home'),null);assert.equal(savedPlace(DEFAULT_SETTINGS,'work'),null);
 assert.equal(savedPlace({...DEFAULT_SETTINGS,home:'San Bartolome, Novaliches'},'home').name,'San Bartolome, Novaliches');
});
test('explicit nationwide places survive settings loading; malformed coordinates do not',()=>{
 const p={name:'Cebu City',lat:10.3,lng:123.9};assert.deepEqual(savedPlace({...DEFAULT_SETTINGS,home:p.name,homePlace:p},'home'),p);
 assert.equal(savedPlace({...DEFAULT_SETTINGS,homePlace:{...p,lat:NaN}},'home'),null);
});
