import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { emitModules } from './emit.js';
import { compileBigInt, runIntegerSequence } from './compiler.js';
import { createIntegerFastRegistry, runInterpreted } from './interpreter-fastpaths.js';
import { createManagedKernel } from './managed.js';
import { makePowerFixture, powerIR } from '../whole-scripts/workloads.js';
import { powerBatch } from '../whole-scripts/optimized.js';
import { buildAddon } from '../whole-scripts/build.js';
import { Integer, rix } from '../runtime.js';

const here = dirname(fileURLToPath(import.meta.url)), quick = process.argv.includes('--quick');
const argument = (name, fallback) => { const index = process.argv.indexOf(name); return index < 0 ? fallback : Number(process.argv[index + 1]); };
const rounds = argument('--samples', quick ? 3 : 5), warmups = quick ? 1 : 2;
if (!Number.isInteger(rounds) || rounds < 3 || rounds > 15) throw new RangeError('Use 3..15 samples');
const runtime = process.versions.bun ? 'bun' : 'node', outputIndex = process.argv.indexOf('--output');
const output = outputIndex < 0 ? resolve(here, `results/tuned-${runtime}${quick ? '-quick' : ''}.json`) : resolve(process.argv[outputIndex + 1]);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const digest = (value) => sha(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const fixture = makePowerFixture({ count: argument('--count', quick ? 4 : 24), bits: argument('--bits', quick ? 256 : 2048), exponentBits: argument('--exponent-bits', quick ? 128 : 1024) });
const emitted = await emitModules(), { addon, build } = await buildAddon();
const general = compileBigInt(emitted.montgomery.source, { powerOfTwo: false, requireOddModulus: true });
await writeFile(resolve(here, 'generated/montgomery-without-power-facts.js'), general.moduleSource);
const generalModule = await import(`data:text/javascript;base64,${Buffer.from(general.moduleSource).toString('base64')}`);
const fast = createIntegerFastRegistry();
const managed = createManagedKernel(emitted[runtime === 'bun' ? 'window' : 'montgomery'].source, { requireOddModulus: runtime !== 'bun' });
const expected = powerBatch(fixture.bases, fixture.exponent, fixture.modulus, 'binary');
const verify = (result) => {
  assert.equal(result.type, 'sequence');
  assert.deepEqual(result.values.map((n) => { assert.ok(n instanceof Integer); return n.value; }), expected);
};
const boxed = (run) => runIntegerSequence({ run }, fixture);
const variants = [
  ['interpreted binary RiX', () => runInterpreted(powerIR, fixture)],
  ['interpreted window RiX', () => runInterpreted(emitted.window.ir, fixture)],
  ['interpreted Montgomery RiX', () => runInterpreted(emitted.montgomery.ir, fixture)],
  ['binary RiX + Integer fastpaths', () => runInterpreted(powerIR, fixture, fast.registry)],
  ['window RiX + Integer fastpaths', () => runInterpreted(emitted.window.ir, fixture, fast.registry)],
  ['Montgomery RiX + Integer fastpaths', () => runInterpreted(emitted.montgomery.ir, fixture, fast.registry)],
  ['compiled window RiX', () => runIntegerSequence(emitted.window.module, fixture)],
  ['compiled Montgomery RiX', () => runIntegerSequence(emitted.montgomery.module, fixture)],
  ['handwritten window-6 JS', () => boxed((...args) => powerBatch(...args, 'window-6'))],
  ['handwritten Montgomery-5 JS', () => boxed((...args) => powerBatch(...args, 'montgomery-5'))],
  ['native C/GMP powm', () => boxed((...args) => addon.powerBatch(...args))],
  ['RiX calls cached compiled kernel', () => managed.run(fixture)],
  ['compiled Montgomery without power facts', () => runIntegerSequence(generalModule, fixture)],
].map(([name, run]) => ({ name, run, samples: [] }));
console.log(`${runtime}: ${fixture.count} powers; ${fixture.bits}-bit modulus, ${fixture.exponentBits}-bit exponent; ${rounds} rounds`);
// First invocation actually compiles/imports during evaluateAsync. Record this
// cold integration cost separately; main samples use the cached kernel.
const managedStart = performance.now(); verify(await managed.run(fixture));
const managedCold = { wallMs: performance.now() - managedStart, ...managed.stats };
for (const entry of variants) {
  for (let i = 0; i < warmups; i++) verify(await entry.run());
  console.log(`Warmup checked: ${entry.name}`);
}
for (let round = 0; round < rounds; round++) {
  for (let offset = 0; offset < variants.length; offset++) {
    const entry = variants[(offset + round) % variants.length], cpu = process.cpuUsage(), start = performance.now();
    const result = await entry.run(), wallMs = performance.now() - start, used = process.cpuUsage(cpu);
    entry.samples.push({ wallMs, cpuMs: (used.user + used.system) / 1000 }); verify(result);
  }
  console.log(`Checked timed round ${round + 1}/${rounds}`);
}
const files = ['compiler.js', 'emit.js', 'bench.js', 'managed.js', 'interpreter-fastpaths.js', 'scripts/window.rix', 'scripts/montgomery.rix', '../whole-scripts/optimized.js', '../whole-scripts/workloads.js', '../whole-scripts/addon.c'];
const provenance = Object.fromEntries(await Promise.all(files.map(async (path) => [path, sha(await readFile(resolve(here, path)))])));
const results = variants.map(({ name, samples }) => ({ name, medianMs: median(samples.map((s) => s.wallMs)), minMs: Math.min(...samples.map((s) => s.wallMs)), maxMs: Math.max(...samples.map((s) => s.wallMs)), samples }));
const setup = Object.fromEntries(Object.entries(emitted).map(([name, r]) => [name, { compileIncludingParseMs: r.compileMs, importMs: r.importMs, sourceHash: r.sourceHash, generatedHash: sha(r.moduleSource), specializations: r.specializations }]));
const report = { timestamp: new Date().toISOString(), runtime, versions: process.versions, machine: { cpu: os.cpus()[0].model, arch: os.arch(), platform: os.platform(), release: os.release() },
  methodology: { rounds, warmups, order: 'rotated', timed: 'fresh input bindings or unboxing; guards; full batch; exact Integer/sequence outputs', excluded: 'parsing, compilation, imports, input generation, shared context/registry setup, native build; schedule/table/Montgomery setup remains timed', algorithmWidths: { window: 6, montgomery: 5 }, native: 'GMP mpz_powm, different library algorithm; N-API full batch including BigInt conversion' },
  workload: { count: fixture.count, bits: fixture.bits, exponentBits: fixture.exponentBits, seed: fixture.seed }, inputDigest: digest([fixture.bases, fixture.exponent, fixture.modulus]), outputDigest: digest(expected),
  setup, managedCold, managedFinal: { ...managed.stats }, nativeBuild: build, provenance, results };
const table = ['| Path | Median ms | Min–max ms | Speedup vs binary RiX |', '|---|---:|---:|---:|', ...results.map((r) => `| ${r.name} | ${r.medianMs.toFixed(3)} | ${r.minMs.toFixed(3)}–${r.maxMs.toFixed(3)} | ${(results[0].medianMs / r.medianMs).toFixed(2)}× |`)];
const markdown = [`# Tuned RiX compilation — ${runtime}`, '', `${fixture.count} powers, ${fixture.bits}-bit modulus, ${fixture.exponentBits}-bit exponent; ${rounds} measured rounds, ${warmups} warmups.`, '', ...table, '',
  'All paths return sequences of exact RatMath Integers; every batch is checked outside timing. Exponent schedule, power tables and Montgomery state are prepared inside each call. Native uses GMP powm rather than the same window/Montgomery implementation.', '',
  `First call from RiX to the managed compiled capability: ${managedCold.wallMs.toFixed(3)} ms including compilation (${managedCold.compileMs.toFixed(3)} ms) and import (${managedCold.importMs.toFixed(3)} ms). Warm calls reuse a single compiled module. Native preparation: ${build.prepareMs.toFixed(3)} ms; cache=${build.cached}.`, ''].join('\n');
await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); await writeFile(output.replace(/\.json$/, '.md'), markdown);
console.log(markdown);
