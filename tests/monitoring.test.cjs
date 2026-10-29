const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, file);
const { validateData, stationState, fetchMonitoring, MONITORING_URL } = require('../src/data/monitoring.ts');
const { changes } = require('../src/data/events.ts');
const { summarize, csv } = require('../src/data/research.ts');
const { evaluate } = require('../src/data/routing.ts');
const now = Date.parse('2026-10-03T00:00:00Z');
const reading = (offset=0, level=0, rain=false) => ({water_level:level,rain_detected:rain,received_at:new Date(now+offset).toISOString(),device_observed_at:new Date(now+offset-3000).toISOString(),inconsistent:false,low_wet:level>=1,mid_wet:level>=2,high_wet:level>=3,low_adc:0,mid_adc:0,high_adc:0,rain_adc:4095});
const station = (r=reading()) => ({id:'station-id',station_code:'QC-001',name:'Prototype',mode:'bench',latitude:null,longitude:null,is_active:true,maintenance:false,latest_reading:r});
const data = (s=station()) => ({mode:'bench',public_warning_eligible:false,stations:[s],readings:[],server_time:new Date(now).toISOString(),data_label:'Bench testing'});

test('invalid payload cannot silently become a normal reading',()=>{
 for(const bad of [{...data(),mode:'live'},{...data(),public_warning_eligible:true},data({...station(),latitude:14}),data(station({...reading(),water_level:2})),data(station({...reading(),rain_detected:null})),data(station({...reading(),received_at:'invalid'}))]) assert.throws(()=>validateData(bad));
 assert.equal(validateData(data(station(null))).stations[0].latest_reading,null);
});
test('fresh, stale, offline, missing, sensor error and cached-failure states',()=>{
 assert.equal(stationState(station(),now).current,true);
 assert.equal(stationState(station(reading(-61000)),now).label,'Stale');
 assert.equal(stationState(station(reading(-181000)),now).label,'Offline');
 assert.equal(stationState(station(null),now).current,false);
 assert.equal(stationState(station(),now,true).current,false);
 assert.equal(stationState(station({...reading(),device_observed_at:new Date(now-240000).toISOString()}),now).current,false);
 assert.equal(stationState(station({...reading(),device_observed_at:null}),now).current,false);
 assert.equal(stationState(station(reading(90000)),now).label,'Invalid timestamp');
 assert.equal(stationState({...station(),maintenance:true},now).current,false);
 assert.equal(stationState(station({...reading(),inconsistent:true}),now).label,'Check sensors');
 assert.equal(stationState(station({...reading(),inconsistent:true}),now).current,true);
});
test('events use IDs not array position; ignore duplicates, replay and stale catch-up',()=>{
 const a=station(reading(-10000)), b=station(reading(0,2,true));
 const ev=changes([a],[b],now,1);
 assert.deepEqual(ev.map(e=>e.kind),['water','rain']);
 assert.equal(ev[0].delivery,'In-app only');
 assert.equal(changes([b],[b],now,1).length,0);
 assert.equal(changes([b],[a],now,1).length,0);
 assert.equal(changes([station(reading(-200000))],[b],now,1).length,0);
 assert.equal(changes([{...a,id:'different'}],[b],now,1).length,0);
 assert.equal(changes([a],[b],now,3).length,1);
});
test('mid and high transitions emit notifications when hardware contacts have inconsistent true',()=>{
 const a=station(reading(-10000, 1));
 const bMid=station({...reading(0, 2, false), inconsistent: true});
 const evMid=changes([a], [bMid], now, 1);
 assert.equal(evMid.length, 1);
 assert.equal(evMid[0].kind, 'water');
 assert.equal(evMid[0].to, 2);

 const bHigh=station({...reading(0, 3, true), inconsistent: true});
 const evHigh=changes([a], [bHigh], now, 1);
 assert.equal(evHigh.length, 2);
 assert.equal(evHigh.find(e => e.kind === 'water').to, 3);
});
test('failure never produces random fallback data',async()=>{
 const original=global.fetch;
 try {global.fetch=async()=>({ok:false,status:503});await assert.rejects(fetchMonitoring(),/503/);
 global.fetch=async()=>({ok:true,json:async()=>({})}); await assert.rejects(fetchMonitoring(),/format/);
 } finally {global.fetch=original;}
});
test('research denominators exclude history, simulation, invalid and generated-only receipt',()=>{
 const trial={id:'t',savedAt:new Date(now).toISOString(),mode:'physical',condition:'Controlled fixture, not real trial',station:'QC-001',expectedLevel:0,expectedRain:false,reading:reading(),valid:true,reason:'Automated test fixture',responseSeconds:2,notification:'received'};
 const stats=summarize([trial,{...trial,id:'2',expectedLevel:1,responseSeconds:4,notification:'failed'},{...trial,id:'3',responseSeconds:null,notification:'generated'}, {...trial,mode:'historical'},{...trial,mode:'simulated'},{...trial,valid:false}]);
 assert.equal(stats.validTrials,3); assert.ok(Math.abs(stats.waterAccuracy - 200/3) < 1e-9); assert.equal(stats.rainAccuracy,100); assert.equal(stats.meanResponseSeconds,3); assert.equal(stats.notificationTests,2); assert.equal(stats.receiptRate,50);
 assert.equal(summarize([]).waterAccuracy,null);
 assert.match(csv([{condition:'=2+2',note:'a,"b"'}]),/"'=2\+2"/);
});
test('real bench station has no map node; route evaluation cannot manufacture sensor hits',()=>{
 const route={coords:[[14.7,121]],steps:[],distance:100,duration:30};
 assert.equal(evaluate(route,[]).hits.length,0);
 assert.equal(station().latitude,null);
});
test('live website read-only RPC returns the verified bench contract',async()=>{
 if(process.env.AGOS_LIVE_TEST!=='1') return;
 const d=await fetchMonitoring(); assert.equal(d.public_warning_eligible,false);assert.equal(d.stations[0].station_code,'QC-001'); assert.equal(d.stations[0].latitude,null);
 console.log('Verified RPC',MONITORING_URL,'latest received',d.stations[0].latest_reading?.received_at);
});

test('sparse route geometry still catches a nearby report; expired reports are excluded',()=>{
 const route={coords:[[14.7,121],[14.7,121.02]],steps:[],distance:2200,duration:120};
 const point={id:'CR-test',name:'Fixture',area:'Test',x:0,y:0,lat:14.7,lng:121.01,level:2,rain:null,source:'community',updated:Date.now()};
 assert.equal(evaluate(route,[point]).hits.length,1);
 assert.equal(evaluate(route,[{...point,updated:Date.now()-21600001}]).hits.length,0);
});
