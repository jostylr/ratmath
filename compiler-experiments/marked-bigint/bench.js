import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { createMarkedSession } from './runner.js';
import { compileBigInt, runIntegerSequence } from '../tuned-aot/compiler.js';
import { runInterpreted } from '../tuned-aot/interpreter-fastpaths.js';
import { makePowerFixture } from '../whole-scripts/workloads.js';
import { powerBatch } from '../whole-scripts/optimized.js';
import { buildAddon } from '../whole-scripts/build.js';
import { Integer, rix } from '../runtime.js';

const runtime = process.versions.bun ? 'bun' : 'node', quick = process.argv.includes('--quick');
const algorithm = runtime === 'bun' ? 'window' : 'montgomery';
const rounds = quick ? 3 : 5, warmups = quick ? 1 : 2;
const fixture = makePowerFixture(quick ? { count: 4, bits: 256, exponentBits: 128 } : {});
const source = await readFile(new URL(`./scripts/${algorithm}.rix`, import.meta.url), 'utf8');
const session = createMarkedSession(), program = session.load(source);
const bindings = { bases: { type: 'sequence', values: fixture.integers }, exponent: fixture.exponentInteger, modulus: fixture.modulusInteger };
const expected = powerBatch(fixture.bases, fixture.exponent, fixture.modulus, 'binary');
const check = result => {
  assert.equal(result.type, 'sequence');
  assert.deepEqual(result.values.map(x => { assert.ok(x instanceof Integer); return x.value; }), expected);
};
const beforeCompile = { ...session.stats };
assert.equal(beforeCompile.builds, 0);
const coldStart = performance.now(); check(program.run({ bindings }));
const firstUse = { wallMs: performance.now() - coldStart, ...session.stats };
const aotStart = performance.now(), compiled = compileBigInt(source, { requireOddModulus: algorithm === 'montgomery' });
const aotCompileMs = performance.now() - aotStart;
const module = await import(`data:text/javascript;base64,${Buffer.from(compiled.moduleSource).toString('base64')}`);
const ir = rix.lower(rix.parse(rix.tokenize(source))), { addon, build } = await buildAddon();
const boxed = run => runIntegerSequence({ run }, fixture);
const variants = [
  ['interpreted marked RiX (ordinary interpreter)', () => runInterpreted(ir, fixture)],
  ['marked RiX, cached compilation', () => program.run({ bindings })],
  ['earlier direct BigInt AOT', () => runIntegerSequence(module, fixture)],
  ['handwritten BigInt JS', () => boxed((...args) => powerBatch(...args, algorithm === 'window' ? 'window-6' : 'montgomery-5'))],
  ['native C/GMP powm', () => boxed((...args) => addon.powerBatch(...args))],
].map(([name, run]) => ({ name, run, samples: [] }));
console.log(`${runtime}, ${algorithm}: ${fixture.count} powers, ${fixture.bits}-bit modulus, ${fixture.exponentBits}-bit exponent`);
for (const entry of variants) for (let i = 0; i < warmups; i++) check(entry.run());
console.log('Warmups checked; timing cached calls.');
for (let round = 0; round < rounds; round++) {
  for (let offset = 0; offset < variants.length; offset++) {
    const entry = variants[(offset + round) % variants.length], cpu = process.cpuUsage(), start = performance.now();
    const result = entry.run(), wallMs = performance.now() - start, used = process.cpuUsage(cpu);
    entry.samples.push({ wallMs, cpuMs: (used.user + used.system) / 1000 }); check(result);
  }
  console.log(`Checked round ${round + 1}/${rounds}`);
}
assert.equal(session.stats.builds, 1); assert.equal(session.stats.fallbacks, 0);
const sha = value => createHash('sha256').update(value).digest('hex');
const digest = value => sha(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v));
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const results = variants.map(({ name, samples }) => ({ name, medianMs: median(samples.map(s => s.wallMs)), minMs: Math.min(...samples.map(s => s.wallMs)), maxMs: Math.max(...samples.map(s => s.wallMs)), samples }));
const paths = ['runner.js', 'compiler.js', 'verify.js', 'bench.js', `scripts/${algorithm}.rix`, '../tuned-aot/compiler.js', '../whole-scripts/workloads.js', '../whole-scripts/optimized.js', '../whole-scripts/addon.c'];
const provenance = Object.fromEntries(await Promise.all(paths.map(async path => [path, sha(await readFile(new URL(path, import.meta.url)))])));
const report = { timestamp: new Date().toISOString(), runtime, versions: process.versions,
  machine: { cpu: os.cpus()[0].model, arch: os.arch(), platform: os.platform(), release: os.release() }, algorithm,
  workload: { count: fixture.count, bits: fixture.bits, exponentBits: fixture.exponentBits, seed: fixture.seed },
  methodology: { rounds, warmups, order: 'rotated', timed: 'fresh context, RiX function binding, guards, dependency fingerprint/cache lookup, unboxing, entire kernel and boxed exact outputs for marked RiX; kernel and equivalent boundaries for direct paths',
    excluded: 'parsing/lowering, fixtures, runtime initialization, first compilation, module import and native preparation; schedules/tables/Montgomery setup remain timed',
    native: 'GMP mpz_powm uses a different library algorithm; full N-API batch boundary included',
    aot: 'earlier tuned-aot compiler snapshot; marked compiler additionally preserves default constructor captures and checks live dependencies' },
  inputDigest: digest([fixture.bases, fixture.exponent, fixture.modulus]), outputDigest: digest(expected),
  beforeCompile, firstUse, finalStats: { ...session.stats }, aotCompileMs, nativeBuild: build, provenance, results };
const markdown = [`# Marked RiX compilation — ${runtime}`, '', `${algorithm}, ${fixture.count} powers, ${fixture.bits}-bit modulus, ${fixture.exponentBits}-bit exponent; ${rounds} measured rounds and ${warmups} warmups.`, '',
  '| Path | Median ms | Min–max ms | Speedup vs interpretation |', '|---|---:|---:|---:|',
  ...results.map(r => `| ${r.name} | ${r.medianMs.toFixed(3)} | ${r.minMs.toFixed(3)}–${r.maxMs.toFixed(3)} | ${(results[0].medianMs / r.medianMs).toFixed(2)}× |`), '',
  `First marked use: ${firstUse.wallMs.toFixed(3)} ms, including ${firstUse.compileMs.toFixed(3)} ms compiling and creating the function. Builds=${session.stats.builds}; compiled calls=${session.stats.compiledCalls}; cache hits=${session.stats.cacheHits}; fallbacks=${session.stats.fallbacks}.`, '',
  'Every result is checked outside timing. Parsing, initialization and native preparation are excluded. Marked calls include normal RiX argument/scope binding, input guards, current dependency fingerprints, cache lookup and exact output boxing. All kernel setup remains timed. Native uses GMP powm; direct AOT uses the earlier compiler snapshot.', ''].join('\n');
const suffix = `${runtime}${quick ? '-quick' : ''}`;
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
await writeFile(new URL(`./results/marked-${suffix}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
await writeFile(new URL(`./results/marked-${suffix}.md`, import.meta.url), markdown);
console.log(markdown);
