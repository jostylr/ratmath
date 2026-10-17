import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve,dirname } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const root=process.env.RATMATH_ROOT||resolve(here,'../..');
const build=JSON.parse(await readFile(resolve(root,'compiler-experiments/integer-dispatch/tmp/build.json')));
const sha=s=>createHash('sha256').update(s).digest('hex');
const checked={};
for(const [group,prefix] of [['rix','rix/src'],['plugins','rix/plugins']]) {
 let count=0;
 for(const [name,hash] of Object.entries(build.original[group])) {
   assert.equal(sha(await readFile(resolve(root,prefix,name))),hash,`Production source drift: ${prefix}/${name}`);count++;
 }
 checked[group]=count;
}
const loaded=[];
for(const [name,rixRoot] of [['production',resolve(root,'rix')],['experimental',build.paths.comparisons.rix]]) {
 const {pluginSources}=await import(pathToFileURL(resolve(rixRoot,'plugins/generated/rix-sources.js')));
 for(const plugin of ['poly','stats']) {
   const path=`${plugin}/${plugin}.plugin.rix`,source=await readFile(resolve(rixRoot,'plugins',path),'utf8');
   assert.equal(pluginSources[path],source,`Bundled source drift: ${name}/${path}`);
   loaded.push({variant:name,plugin,sha256:sha(source)});
 }
}
const result={timestamp:new Date().toISOString(),checked,loaded,passed:true};
await writeFile(resolve(here,'results/source-parity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
