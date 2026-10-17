import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { load,canonical } from './load.js';
import { variants } from './build.js';
import { fixtures,materialize } from '../polynomial-core/fixtures.js';
import { measure } from '../core-arithmetic/measure.js';
const envs=await Promise.all(variants.map(load)),quick=process.argv.includes('--quick'),data=await fixtures(quick);
const source=await readFile(new URL('../integrated-core/scripts/horner.rix',import.meta.url),'utf8');
// A source-level control, not an automatic rewrite: hoist invariant Len().
const hoisted=await readFile(new URL('./scripts/horner-hoisted.rix',import.meta.url),'utf8');
assert.notEqual(hoisted,source);
const sha=x=>createHash('sha256').update(x).digest('hex'),groups=[],digests={};
for(const f of data) {
  const paths=envs.map(env=>{const ir=env.parse(source),bindings=materialize(f.data,env.core);return {name:env.variant,run:()=>env.run(ir,bindings)};});
  const env=envs.at(-1),bindings=materialize(f.data,env.core),ir=env.parse(hoisted);
  paths.push({name:'literals + RiX hoisted Len',run:()=>env.run(ir,bindings)});
  const control=envs[0],c=materialize(f.data,control.core);
  paths.push({name:'JS Horner, same core methods',run:()=>control.sequence(c.points.values.map(x=>control.core.evaluatePolynomial(c.coefficients.values,x)))});
  const expected=canonical(paths[0].run());digests[f.name]=sha(JSON.stringify(expected));
  groups.push({name:f.name,metadata:f.dimensions,variants:paths,check:x=>assert.deepEqual(canonical(x),expected,f.name)});
}
const runtime=process.versions.bun?'bun':'node',rounds=quick?3:7,warmups=quick?1:2;
console.log(`${runtime}: ${groups.length} interpreter-overhead workloads; no instrumentation or profiler`);
const results=await measure(groups,{rounds,warmups});
const provenance=Object.fromEntries(await Promise.all(['build.js','load.js','copy-helper.txt','bench.js','scripts/horner-hoisted.rix','../integrated-core/scripts/horner.rix','../polynomial-core/fixtures.js','../integrated-core/workloads.js','../core-arithmetic/measure.js'].map(async p=>[p,sha(await readFile(new URL(p,import.meta.url)))])));
const report={timestamp:new Date().toISOString(),runtime,versions:process.versions,machine:{cpu:os.cpus()[0].model,arch:os.arch(),platform:os.platform(),release:os.release()},
  methodology:{rounds,warmups,targetMs:15,order:'Rotate variants within workload; runtime processes sequential',timed:'Complete output batch: fresh contexts/function binding, interpreted loops/calls, arithmetic/copy/metadata, sequence output',excluded:'Build/imports, parse/lower, fixtures, verification; profiler/counters entirely absent',core:'Byte-identical fast core in every environment',source:'Identical original Horner except explicitly labeled hoisted-Len row',verification:'Complete exact values and types checked outside timing for every calibration/warmup/timed batch'},
  inputDigest:sha(JSON.stringify(data)),expectedDigests:digests,provenance,build:JSON.parse(await readFile(new URL('./results/build-provenance.json',import.meta.url))),results};
const lines=[`# Interpreter overhead — ${runtime}`,'','Times are milliseconds per full point batch. Same fast core; original RiX source unless labeled otherwise.',''];
for(const g of results){const a=g.variants[0].medianMs;lines.push(`## ${g.name}`,'','| Path | Median ms | Speedup vs unchanged interpreter |','|---|---:|---:|',...g.variants.map(v=>`| ${v.name} | ${v.medianMs.toFixed(4)} | ${(a/v.medianMs).toFixed(2)}× |`),'');}
const suffix=runtime+(quick?'-quick':'');
await writeFile(new URL(`./results/overhead-${suffix}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
await writeFile(new URL(`./results/overhead-${suffix}.md`,import.meta.url),lines.join('\n'));
console.log(lines.join('\n'));
