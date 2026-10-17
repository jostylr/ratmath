import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {manifest,here} from './load.js';
const sha=s=>createHash('sha256').update(s).digest('hex');
async function inventory(dir,base=dir){const out={};for(const e of await readdir(dir,{withFileTypes:true})){if(e.name==='.DS_Store')continue;const p=resolve(dir,e.name);if(e.isDirectory())Object.assign(out,await inventory(p,base));else if(e.isFile())out[relative(base,p)]=sha(await readFile(p));}return out;}
for(const [group,path]of [['core','packages/core/src'],['rix','rix/src'],['plugins','rix/plugins']])assert.deepEqual(await inventory(resolve(manifest.sourceRoot,path)),manifest.original[group],'Production source changed');
assert.deepEqual(manifest.paths.baseline.coreSource,manifest.paths.cached.coreSource,'Identical production arithmetic required');
const a=manifest.paths.baseline.rixSource,b=manifest.paths.cached.rixSource;
const changed=[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>a[k]!==b[k]).sort();
assert.deepEqual(changed,['runtime/experimental-plugin-metadata.js','runtime/plugin-catalog.js']);
assert.equal(sha(await readFile(resolve(here,'cache-template.js'))),b['runtime/experimental-plugin-metadata.js']);
const programs={};for(const file of ['cache-template.js','../direct-loops/compiler.js','../direct-loops/engine.js','../direct-loops/bench.js','../direct-loops/linalg-probe.js','../direct-loops/scripts/kernels.rix'])programs[file]=sha(await readFile(resolve(here,file)));
const report={timestamp:new Date().toISOString(),productionUnchanged:true,identicalCore:true,changedCopiedRiXFiles:changed,programs};
await writeFile(resolve(here,'results/source-review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
