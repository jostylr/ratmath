import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {variants} from './build.js';
const build=JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
for(const v of variants.filter(v=>v!=='base')){
 let patch='';
 for(const p of ['src/runtime/methods.js','src/eval/registry.js','src/eval/functions/comparison.js']){
  const r=spawnSync('diff',['-u','-L',`a/rix/${p}`,'-L',`b/rix/${p}`,resolve(build.paths.base.rix,p),resolve(build.paths[v].rix,p)],{encoding:'utf8'});
  if(![0,1].includes(r.status))throw new Error(r.stderr);patch+=r.stdout;
 }
 await writeFile(new URL(`./patches/${v}.patch`,import.meta.url),patch);
}
console.log('Saved four interpreter diffs relative to the previous copy/literal candidate. No production patches applied.');
