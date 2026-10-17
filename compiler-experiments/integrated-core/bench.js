import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { here } from './build.js';
import { load, canonical } from './load.js';
import { workloads, materialize } from './workloads.js';
import { measure } from '../core-arithmetic/measure.js';
const runtime = process.versions.bun ? 'bun' : 'node', quick = process.argv.includes('--quick'), rounds = quick ? 3 : 7, warmups = quick ? 1 : 2;
const envs = await Promise.all(['baseline', 'candidate', 'candidate-wired'].map(load));
const fixtures = await workloads(quick), groups = [], expectedDigests = {};
const sha = x => createHash('sha256').update(x).digest('hex');
for (const fixture of fixtures) {
  const variants = envs.map(env => {
    const ir = env.parse(fixture.source), bindings = materialize(fixture.data, env.core);
    return { name: env.variant, run: () => env.run(ir, bindings) };
  });
  const expected = canonical(variants[0].run());
  expectedDigests[fixture.name] = sha(JSON.stringify(expected));
  groups.push({ name: fixture.name, metadata: fixture.dimensions, variants, check: value => assert.deepEqual(canonical(value), expected, fixture.name) });
}
console.log(`${runtime}: ${groups.length} ordinary RiX workloads, ${rounds} rounds; all paths interpreted`);
const results = await measure(groups, { rounds, warmups });
const build = JSON.parse(await readFile(resolve(here, 'tmp/build.json'), 'utf8'));
const provenance = Object.fromEntries(await Promise.all(['build.js', 'load.js', 'workloads.js', 'bench.js', '../core-arithmetic/measure.js', ...['horner','mixed-loop','division','modulo','modular-powers'].map(name => `scripts/${name}.rix`)].map(async p => [p, sha(await readFile(resolve(here, p)))])));
const report = { timestamp: new Date().toISOString(), runtime, versions: process.versions, machine: { cpu: os.cpus()[0].model, arch: os.arch(), platform: os.platform(), release: os.release() }, methodology: { rounds, warmups, targetMs: 15, order: 'rotate within workload', timed: 'ordinary RiX evaluation: fresh contexts and function bindings, all loops/calls/operators, allocations and result values', excluded: 'imports, package copying/build, parsing/lowering, fixture materialization and verification', candidates: build.changes, verification: 'every calibration/warmup/timed batch is compared to unchanged baseline, including exact result types' }, inputDigest: sha(JSON.stringify(fixtures)), expectedDigests, provenance, results };
const lines = [`# Ordinary RiX with experimental core — ${runtime}`, '', `${rounds} measured samples, ${warmups} warmups, calibrated repeats and rotated variant order. Times are ms per complete batch.`, '', '| Workload | Baseline ms | Core-only ms | Core-only speedup | Core + Integer wiring ms | Speedup |', '|---|---:|---:|---:|---:|---:|', ...results.map(g => { const [a,b,c] = g.variants; return `| ${g.name} | ${a.medianMs.toFixed(4)} | ${b.medianMs.toFixed(4)} | ${(a.medianMs/b.medianMs).toFixed(2)}× | ${c.medianMs.toFixed(4)} | ${(a.medianMs/c.medianMs).toFixed(2)}× |`; }), '', 'Core-only uses identical RiX source files and its default operator registry. Core + Integer wiring changes only the copied INTDIV/MOD/DIVMOD built-ins to use new core methods; production RiX is unchanged. No source annotations, compilation, Host math helpers, unboxed polynomial kernels or altered RiX algorithms are used. Full exact values and types match the baseline.', ''];
await writeFile(resolve(here, `results/ordinary-${runtime}${quick ? '-quick' : ''}.json`), JSON.stringify(report, null, 2) + '\n');
await writeFile(resolve(here, `results/ordinary-${runtime}${quick ? '-quick' : ''}.md`), lines.join('\n'));
console.log(lines.join('\n'));
