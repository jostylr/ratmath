import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {load,canonical} from './load.js';
import {variants} from './build.js';
import {fixtures,prepare} from './fixtures.js';
import {measure} from '../core-arithmetic/measure.js';
const quick=process.argv.includes('--quick'),data=await fixtures(quick),groups=[],digests={};
const sha=x=>createHash('sha256').update(x).digest('hex');
for(const f of data){
 const paths=[];
 for(const variant of variants){const env=await load(variant);paths.push({name:variant,run:prepare(env,f)});}
 const expected=canonical(paths[0].run());digests[f.name]=sha(JSON.stringify(expected));
 groups.push({name:f.name,metadata:{...f.dimensions,custom:f.custom||null},variants:paths,check:r=>assert.deepEqual(canonical(r),expected,f.name)});
}
const runtime=process.versions.bun?'bun':'node',rounds=quick?3:9,warmups=quick?1:3;
console.log(`${runtime} ${process.versions.bun||process.versions.node}: ${groups.length} dispatch workloads; ${rounds} rounds, no profiling`);
const results=await measure(groups,{rounds,warmups});
const provenance=Object.fromEntries(await Promise.all(['build.js','load.js','fixtures.js','bench.js','method-keys.txt','priority.txt','../core-arithmetic/measure.js','../integrated-core/scripts/horner.rix'].map(async p=>[p,sha(await readFile(new URL(p,import.meta.url)))])));
const report={timestamp:new Date().toISOString(),runtime,versions:process.versions,machine:{cpu:os.cpus()[0].model,arch:os.arch(),platform:os.platform(),release:os.release()},methodology:{rounds,warmups,targetMs:15,order:'Rotate within workloads; runtime processes sequential',timed:'Fresh contexts/function definitions, same interpreted source, same fast core, all copies/arithmetic/result allocation and dispatch',excluded:'Build/imports, parse/lower, fixtures/custom registrations, correctness checks',correctness:'Every calibration/warmup/timed batch final output checked against base including exact classes'},inputDigest:sha(JSON.stringify(data)),expectedDigests:digests,provenance,build:JSON.parse(await readFile(new URL('./results/build-provenance.json',import.meta.url))),results};
const lines=[`# Integer dispatch — ${runtime} ${process.versions.bun||process.versions.node}`,'','Median milliseconds per full batch. Base already includes the previous Rational-copy/literal fixes.',''];
for(const g of results){const b=g.variants[0].medianMs;lines.push(`## ${g.name}`,'','| Variant | Median ms | Speedup vs base |','|---|---:|---:|',...g.variants.map(v=>`| ${v.name} | ${v.medianMs.toFixed(4)} | ${(b/v.medianMs).toFixed(2)}× |`),'');}
const suffix=runtime+(quick?'-quick':'');
await writeFile(new URL(`./results/dispatch-${suffix}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
await writeFile(new URL(`./results/dispatch-${suffix}.md`,import.meta.url),lines.join('\n'));
console.log(lines.join('\n'));
