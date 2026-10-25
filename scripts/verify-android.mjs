import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root));
const config=JSON.parse(await read('android/app/src/main/assets/capacitor.config.json'));
assert.equal(config.appId,'ph.agos.trial');
assert.equal(config.appName,'Agos Trial');
assert.equal(config.server?.url,undefined,'Trial must bundle assets, not connect to the PC');
assert.equal(config.server?.cleartext,false);
const manifest=(await read('android/app/src/main/AndroidManifest.xml')).toString();
for(const permission of ['INTERNET','ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION']) assert.ok(manifest.includes('android.permission.'+permission));
for(const permission of ['ACCESS_BACKGROUND_LOCATION','READ_CONTACTS','CAMERA','RECORD_AUDIO','POST_NOTIFICATIONS']) assert.ok(!manifest.includes('android.permission.'+permission));
assert.ok(manifest.includes('android:allowBackup="false"'));
const assets='android/app/src/main/assets/public/';
const hash=data=>createHash('sha256').update(data).digest('hex');
let count=0;
async function compare(dir='') {
 for(const file of await readdir(new URL('dist/'+dir,root),{withFileTypes:true})){
  const name=dir+file.name;
  if(file.isDirectory()){await compare(name+'/');continue}
  assert.equal(hash(await read(assets+name)),hash(await read('dist/'+name)),'Stale Android asset: '+name);count++;
 }
}
await compare();
console.log(`Android package configuration and ${count} bundled files verified against the current web build.`);
