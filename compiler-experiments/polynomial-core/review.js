import { spawnSync } from 'node:child_process';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { here } from './build.js';
const base=JSON.parse(await readFile(new URL('../integrated-core/tmp/build.json',import.meta.url)));
const build=JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
const files=['index.js','src/rational.js','src/experimental-polynomial.js'];
let patch='';
for(const file of files){
  const before=file==='src/experimental-polynomial.js'?'/dev/null':resolve(base.paths.candidate.core,file);
  const result=spawnSync('diff',['-u','-L',`a/packages/core/${file}`,'-L',`b/packages/core/${file}`,before,resolve(build.core,file)],{encoding:'utf8'});
  if(result.status!==0&&result.status!==1) throw new Error(result.stderr);
  patch+=result.stdout;
}
await writeFile(resolve(here,'patches/combined-operation.patch'),patch);
console.log('Saved combined-operation diff relative to the existing fast core; nothing applied to production.');
