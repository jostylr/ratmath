import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { patch } from './patch.js';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(process.argv.find(a=>a.startsWith('--root='))?.slice(7)||resolve(here,'../..'));
const core=resolve(root,'packages/core');
const coreRef=process.argv.find(a=>a.startsWith('--core-ref='))?.slice(11)||'b2554fb';
const experimental=resolve(root,'compiler-experiments/integer-dispatch/tmp/comparisons/packages/core');
const tmp=resolve(here,'tmp');
await rm(tmp,{recursive:true,force:true}); await mkdir(tmp,{recursive:true});
await mkdir(resolve(here,'results'),{recursive:true});
const regression=await readFile(resolve(here,'regression-test.txt'),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
const variants=[];
for(const name of ['production-worktree','experimental-fast','committed-core']) {
  const dest=resolve(tmp,name,'before'); await mkdir(dest,{recursive:true});
  if(name==='committed-core') execFileSync('tar',['-x','-C',dest],{input:execFileSync('git',['archive',coreRef,'src','tests','index.js','index.d.ts','package.json'],{cwd:core,maxBuffer:32*1024*1024})});
  else {
    const source=name==='experimental-fast'?experimental:core;
    for(const file of ['src','tests','index.js','index.d.ts','package.json']) await cp(resolve(source,file),resolve(dest,file),{recursive:true});
  }
  const source=await readFile(resolve(dest,'src/rational.js'),'utf8');
  const fixed=patch(source); const after=resolve(tmp,name,'after');
  await cp(dest,after,{recursive:true});
  await writeFile(resolve(after,'src/rational.js'),fixed);
  await writeFile(resolve(after,'tests/rational-leading-decimal.test.js'),regression);
  assert.ok(fixed.includes('fractionalPart.length > 0'));
  variants.push({name,before:dest,after,sourceHash:hash(source),fixedHash:hash(fixed),alreadyFixed:source===fixed});
}
await writeFile(resolve(tmp,'build.json'),JSON.stringify({timestamp:new Date().toISOString(),root,coreRef,coreHead:execFileSync('git',['rev-parse','HEAD'],{cwd:core,encoding:'utf8'}).trim(),variants},null,2)+'\n');
console.log('Built before/after core snapshots:',variants.map(v=>v.name).join(', '));
