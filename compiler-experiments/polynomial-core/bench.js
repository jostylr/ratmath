import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { load,canonical } from './load.js';
import { paths } from './paths.js';
import { fixtures,materialize } from './fixtures.js';
import { measure } from '../core-arithmetic/measure.js';
const env = await load(), programs = await paths(env), quick = process.argv.includes('--quick');
const fs = await fixtures(quick), groups = [], expectedDigests = {};
const sha = x => createHash('sha256').update(x).digest('hex');
for (const f of fs) {
  const variants = programs.variants(materialize(f.data,env.core)), expected = canonical(variants[0].run());
  expectedDigests[f.name] = sha(JSON.stringify(expected));
  groups.push({name:f.name,metadata:f.dimensions,variants,check:value=>assert.deepEqual(canonical(value),expected,f.name)});
}
const runtime = process.versions.bun?'bun':'node', rounds = quick?3:7, warmups = quick?1:2;
console.log(`${runtime}: ${groups.length} polynomial workloads against one complete fast core`);
const results = await measure(groups,{rounds,warmups});
const provenance = Object.fromEntries(await Promise.all(['build.js','polynomial.js','rational-method.txt','load.js','paths.js','fixtures.js','bench.js','../core-arithmetic/measure.js','../integrated-core/workloads.js',
  '../integrated-core/scripts/horner.rix',...['scalar','scalar-fused','batch','batch-fused'].map(n=>`scripts/${n}.rix`)].map(async p=>[p,sha(await readFile(new URL(p,import.meta.url)))])));
const report = { timestamp:new Date().toISOString(),runtime,versions:process.versions,machine:{cpu:os.cpus()[0].model,arch:os.arch(),platform:os.platform(),release:os.release()},
  methodology:{rounds,warmups,targetMs:15,order:'Rotated within workload; runtimes run sequentially',coefficientOrder:'Descending; start at typed Integer zero, multiply then add for every coefficient',
    timed:'Fresh RiX contexts/function binding for RiX paths; all evaluation, validation, host boundaries, input access, arithmetic and full typed sequence outputs; no coefficient plans/caches',
    excluded:'Build/import, parsing/lowering, fixture materialization and verification',
    fused:'Same reduced multiply/add kernels at every Horner step; private factory boxes only final result; all-Integer BigInt loop; intervals/subclasses fall back to methods',
    verification:'Complete exact results and classes checked outside timing for every calibration/warmup/measured batch'},
  fixtureDigest:sha(JSON.stringify(fs)),expectedDigests,provenance,build:JSON.parse(await readFile(new URL('./results/build-provenance.json',import.meta.url))),results};
const lines = [`# Combined polynomial operations in fast core — ${runtime}`,'',`${rounds} rounds, ${warmups} warmups. Milliseconds per full point batch; all paths use the same copied fast core.`,''];
for (const g of results) {
  const base=g.variants[0].medianMs;
  lines.push(`## ${g.name}`,'',`Degree ${g.metadata.degree}, ${g.metadata.count} points.`,'','| Path | Median ms | Speedup vs RiX Horner |','|---|---:|---:|',
    ...g.variants.map(v=>`| ${v.name} | ${v.medianMs.toFixed(4)} | ${(base/v.medianMs).toFixed(2)}× |`),'');
}
lines.push('Combined method paths remove interpreter work inside Horner. Fused paths additionally remove intermediate Integer/Rational wrappers while using the same stepwise reduced multiply/add kernel. Batch paths remove per-point RiX traversal/calls. JS paths expose the remaining host-boundary overhead. There is no changed polynomial algorithm, delayed fraction normalization, leading-zero pruning, compilation, native code or cached preparation.','');
const suffix=runtime+(quick?'-quick':'');
await writeFile(new URL(`./results/polynomial-${suffix}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
await writeFile(new URL(`./results/polynomial-${suffix}.md`,import.meta.url),lines.join('\n'));
console.log(lines.join('\n'));
