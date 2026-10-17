import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import os from 'node:os';
import { compileBigInt, runIntegerSequence } from './compiler.js';
import { powerSource, makePowerFixture, runPowerRix } from '../whole-scripts/workloads.js';
import { powerBatch } from '../whole-scripts/optimized.js';
import { rix } from '../runtime.js';

const here = dirname(fileURLToPath(import.meta.url));
const quick = process.argv.includes('--quick'), rounds = quick ? 3 : 9, warmups = quick ? 1 : 3;
const runtime = process.versions.bun ? 'bun' : 'node';
const outputFlag = process.argv.indexOf('--output');
const output = outputFlag < 0 ? resolve(here, `results/bigint-${runtime}${quick ? '-quick' : ''}.json`) : resolve(process.argv[outputFlag + 1]);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const digest = (value) => createHash('sha256').update(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v)).digest('hex');
const input = makePowerFixture(quick ? { count: 4, bits: 256, exponentBits: 128 } : {});
const compiledModules = [], setup = [];
await mkdir(resolve(here, 'generated'), { recursive: true });
for (const peepholes of [false, true]) {
  const started = performance.now(), compiled = compileBigInt(powerSource, { peepholes });
  const compileMs = performance.now() - started;
  const path = resolve(here, `generated/modular-powers${peepholes ? '-peepholes' : ''}.js`);
  await writeFile(path, compiled.moduleSource);
  const importStarted = performance.now(), module = await import(pathToFileURL(path).href + `?hash=${digest(compiled.moduleSource)}`);
  setup.push({ peepholes, compileIncludingParseMs: compileMs, importMs: performance.now() - importStarted,
    sourceHash: compiled.sourceHash, generatedHash: digest(compiled.moduleSource), specializations: compiled.specializations });
  compiledModules.push(module);
}
const parseSamples = [];
for (let i = 0; i < 5; i++) { const start = performance.now(); rix.lower(rix.parse(rix.tokenize(powerSource))); parseSamples.push(performance.now() - start); }
const expected = powerBatch(input.bases, input.exponent, input.modulus, 'binary');
const rawVerify = (values) => assert.deepEqual(values, expected);
const boxedVerify = (sequence) => { assert.equal(sequence.type, 'sequence'); assert.deepEqual(sequence.values.map((x) => {
  assert.equal(typeof x.value, 'bigint'); return x.value;
}), expected); };
// Select the best measured handwritten candidate independently of main samples.
// Schedule and Montgomery setup stay inside every candidate invocation.
const candidates = ['binary', ...Array.from({ length: 6 }, (_, i) => `window-${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `montgomery-${i + 1}`)];
const training = candidates.map((algorithm) => ({ algorithm, ms: [] }));
for (const candidate of training) rawVerify(powerBatch(input.bases, input.exponent, input.modulus, candidate.algorithm));
for (let round = 0; round < 3; round++) for (let i = 0; i < training.length; i++) {
  const candidate = training[(i + round) % training.length], start = performance.now();
  const result = powerBatch(input.bases, input.exponent, input.modulus, candidate.algorithm);
  candidate.ms.push(performance.now() - start); rawVerify(result);
}
const selected = [...training].sort((a, b) => median(a.ms) - median(b.ms))[0].algorithm;
const hand = (algorithm) => runIntegerSequence({ run: (...args) => powerBatch(...args, algorithm) }, input);
const cases = [
  { name: 'interpreted RiX', run: () => ({ type: 'sequence', values: runPowerRix(input) }), verify: boxedVerify },
  { name: 'compiled BigInt', run: () => runIntegerSequence(compiledModules[0], input), verify: boxedVerify },
  { name: 'compiled BigInt + peepholes', run: () => runIntegerSequence(compiledModules[1], input), verify: boxedVerify },
  { name: 'handwritten binary', run: () => hand('binary'), verify: boxedVerify },
  { name: `hand-tuned ${selected}`, run: () => hand(selected), verify: boxedVerify },
  { name: 'compiled raw diagnostic', run: () => compiledModules[1].run(input.bases, input.exponent, input.modulus), verify: rawVerify },
].map((entry) => ({ ...entry, samples: [] }));
console.log(`${runtime}: ${input.count} powers, ${input.bits}-bit modulus, ${input.exponentBits}-bit exponent; selected ${selected}`);
for (const entry of cases) for (let i = 0; i < warmups; i++) entry.verify(entry.run());
console.log('Warmup completed; parsing/compilation/import are outside timed batches.');
for (let round = 0; round < rounds; round++) {
  for (let offset = 0; offset < cases.length; offset++) {
    const entry = cases[(round + offset) % cases.length], cpu = process.cpuUsage(), start = performance.now();
    const result = entry.run(), wallMs = performance.now() - start, used = process.cpuUsage(cpu);
    entry.samples.push({ wallMs, cpuMs: (used.user + used.system) / 1000 }); entry.verify(result);
  }
  console.log(`Checked timed round ${round + 1}/${rounds}`);
}
const provenanceFiles = ['compiler.js', 'bench.js', '../whole-scripts/scripts/modular-powers.rix', '../whole-scripts/optimized.js', '../whole-scripts/workloads.js'];
const provenance = Object.fromEntries(await Promise.all(provenanceFiles.map(async (path) => [path, createHash('sha256').update(await readFile(resolve(here, path))).digest('hex')])));
const results = cases.map(({ name, samples }) => ({ name, medianMs: median(samples.map((x) => x.wallMs)), minMs: Math.min(...samples.map((x) => x.wallMs)), maxMs: Math.max(...samples.map((x) => x.wallMs)), samples }));
const report = { timestamp: new Date().toISOString(), runtime, versions: process.versions, machine: { arch: os.arch(), platform: os.platform(), release: os.release(), cpu: os.cpus()[0].model },
  methodology: { rounds, warmups, order: 'rotated', timings: 'whole batch; guarded inputs, unboxing and Integer/sequence outputs except raw diagnostic', compilation: 'excluded and recorded separately', tuningRounds: 3 },
  workload: { count: input.count, bits: input.bits, exponentBits: input.exponentBits, seed: input.seed },
  inputDigest: digest([input.bases, input.exponent, input.modulus]), outputDigest: digest(expected), setup, parseSamples, training, selected, provenance, results };
const interpretedMs = results[0].medianMs, tunedMs = results[4].medianMs;
const markdown = [`# Direct BigInt compilation — ${runtime}`, '', `${input.count} powers; ${input.bits}-bit modulus; ${input.exponentBits}-bit exponent. ${rounds} rounds, ${warmups} warmups.`, '',
  '| Path | Median ms | Min–max ms | Speedup vs RiX | Relative to tuned JS |', '|---|---:|---:|---:|---:|',
  ...results.map((r) => `| ${r.name} | ${r.medianMs.toFixed(3)} | ${r.minMs.toFixed(3)}–${r.maxMs.toFixed(3)} | ${(interpretedMs / r.medianMs).toFixed(2)}× | ${(r.medianMs / tunedMs).toFixed(2)}× time |`), '',
  `Compilation including parsing: ${setup.map((s) => s.compileIncludingParseMs.toFixed(3)).join(' / ')} ms (plain / peepholes). Module import: ${setup.map((s) => s.importMs.toFixed(3)).join(' / ')} ms.`, '',
  'Input conversion, guards, output boxing and whole-batch computation are timed. Every warmup, tuning run and timed result is checked outside its timing. Raw diagnostic omits boundary conversion/boxing. See README for scope and caveats.', ''].join('\n');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n'); await writeFile(output.replace(/\.json$/, '.md'), markdown);
console.log(markdown);
