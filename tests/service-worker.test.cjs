const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function worker(){
 const listeners={}; const calls=[];
 const context={self:{location:{origin:'http://127.0.0.1:5174'},addEventListener:(kind,fn)=>listeners[kind]=fn},URL,
 caches:{open:async()=>({addAll:async urls=>{calls.push(urls)}}),keys:async()=>[],match:async key=>({cached:true,key})},fetch:async()=>{throw Error('offline')}};
 vm.runInNewContext(fs.readFileSync('dist/sw.js','utf8'),context);
 return {listeners,calls};
}
test('production offline-shell cache refers to real built files',async()=>{
 const {listeners,calls}=worker(); let pending;
 listeners.install({waitUntil:p=>pending=p});await pending;
 assert.ok(calls[0].includes('/index.html'));
 for(const path of calls[0]) assert.ok(fs.existsSync('dist'+path),'Missing '+path);
});
test('offline navigation falls back to the shell without fabricating sensor responses',async()=>{
 const {listeners}=worker();let response;
 listeners.fetch({request:{method:'GET',url:'http://127.0.0.1:5174/',mode:'navigate'},respondWith:p=>response=p});
 assert.equal((await response).key,'/index.html');
 for(const req of [{method:'POST',url:'https://example.supabase.co/rest/v1/rpc/reading'}, {method:'GET',url:'https://tiles.example/tile'}, {method:'GET',url:'http://127.0.0.1:5174/api/sensors'}]) {
 let intercepted=false;listeners.fetch({request:req,respondWith:()=>intercepted=true});assert.equal(intercepted,false);
 }
});
