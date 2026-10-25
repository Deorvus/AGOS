const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {getDeviceLocation,locationError}=require('../src/data/device-location.ts');
function fake(){let success,error;const cleared=[];return {cleared,get success(){return success},get error(){return error},watchPosition(s,e){success=s;error=e;return 42},clearWatch(id){cleared.push(id)}}}
test('one location fix stops the watch; later fixes do not alter the origin',async()=>{
 const g=fake(),c=new AbortController(),p=getDeviceLocation(c.signal,g,100);
 g.success({coords:{latitude:14.6,longitude:121}});g.success({coords:{latitude:15,longitude:122}});
 assert.deepEqual(await p,[14.6,121]);assert.deepEqual(g.cleared,[42]);
});
test('cancellation stops acquisition and ignores a late position',async()=>{
 const g=fake(),c=new AbortController(),p=getDeviceLocation(c.signal,g,100);c.abort();g.success({coords:{latitude:14,longitude:121}});
 await assert.rejects(p,{name:'AbortError'});assert.deepEqual(g.cleared,[42]);
});
test('deadline and provider failures stop watches and preserve distinct recovery messages',async()=>{
 for(const code of [1,2,3]){const g=fake(),p=getDeviceLocation(new AbortController().signal,g,100);g.error({code});await assert.rejects(p,{message:locationError(code)});assert.deepEqual(g.cleared,[42])}
 const g=fake();await assert.rejects(getDeviceLocation(new AbortController().signal,g,5),{message:locationError(3)});assert.deepEqual(g.cleared,[42]);
});
test('invalid provider coordinates cannot become a route origin',async()=>{
 const g=fake(),p=getDeviceLocation(new AbortController().signal,g,100);g.success({coords:{latitude:NaN,longitude:121}});await assert.rejects(p,{message:locationError(2)});
});
