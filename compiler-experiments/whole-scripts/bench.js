import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import os from 'node:os';
import { Integer } from '../runtime.js';
import { buildAddon } from './build.js';
import { powerBatch, scoreBigInt, scoreNumber, processJobs } from './optimized.js';
import { makePowerFixture, makeAsyncFixture, runPowerRix, runAsyncRix, createHost, integerKeys, powerSource, asyncSource, asyncSystemSetupMs } from './workloads.js';

const runtime = process.versions.bun ? 'bun' : 'node';
const quick = process.argv.includes('--quick');
const samplesFlag = process.argv.indexOf('--samples');
const samples = samplesFlag >= 0 ? Number(process.argv[samplesFlag + 1]) : quick ? 3 : 5;
if (!Number.isInteger(samples) || samples < 3 || samples > 15) throw new RangeError('Use 3..15 samples');
const outputFlag = process.argv.indexOf('--output');
const output = outputFlag >= 0 ? resolve(process.argv[outputFlag + 1]) : fileURLToPath(new URL(`./results/whole-${runtime}${quick ? '-quick' : ''}.json`, import.meta.url));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const digest = (values) => createHash('sha256').update(JSON.stringify(values)).digest('hex');
const here = new URL('./', import.meta.url);

// Record a real fresh build separately, then verify normal cache reuse.
const fresh = await buildAddon({ cacheDir: fileURLToPath(new URL(`./tmp/cold-${randomUUID()}/`, here)) });
const cached = await buildAddon();
const { addon } = cached;
const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? Number(process.argv[index + 1]) : fallback;
};
const powers = makePowerFixture({ count: argument('--count', quick ? 4 : 24), bits: argument('--bits', quick ? 1024 : 2048),
  exponentBits: argument('--exponent-bits', quick ? 256 : 1024) });
const rawExpected = powerBatch(powers.bases, powers.exponent, powers.modulus, 'binary');
const powerKeys = rawExpected.map(String);
const algorithms = ['binary', ...Array.from({ length: 6 }, (_, i) => `window-${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `montgomery-${i + 1}`)];
const tuning = Object.fromEntries(algorithms.map((algorithm) => [algorithm, []]));
for (const algorithm of algorithms) assert.deepEqual(powerBatch(powers.bases, powers.exponent, powers.modulus, algorithm), rawExpected);
for (let round = 0; round < 3; round++) {
  // Rotate the order rather than repeatedly running the favored algorithm first.
  for (let offset = 0; offset < algorithms.length; offset++) {
    const algorithm = algorithms[(offset + round * 4) % algorithms.length];
    const started = performance.now();
    const result = powerBatch(powers.bases, powers.exponent, powers.modulus, algorithm);
    tuning[algorithm].push(performance.now() - started);
    assert.deepEqual(result, rawExpected);
  }
}
const selected = algorithms.toSorted((a, b) => median(tuning[a]) - median(tuning[b]))[0];
console.log(`Selected JS ${selected}; whole RiX script, tuned JS and handwritten native programs follow.`);

async function measure(run, expected, expectedTrace) {
  const cpuStart = process.cpuUsage(), started = performance.now();
  const result = await run();
  const wallMs = performance.now() - started, cpu = process.cpuUsage(cpuStart);
  const keys = integerKeys(result.values);
  assert.deepEqual(keys, expected);
  if (expectedTrace) assert.deepEqual(result.host.trace, expectedTrace);
  return { wallMs, cpuMs: (cpu.user + cpu.system) / 1000, ...(result.host ? { host: result.host.stats() } : {}) };
}

async function compare(name, description, variants, expected, expectedTrace, input) {
  const names = Object.keys(variants), raw = Object.fromEntries(names.map((label) => [label, []]));
  for (const label of names) await measure(variants[label], expected, expectedTrace);
  for (let sample = 0; sample < samples; sample++) {
    for (let offset = 0; offset < names.length; offset++) {
      const label = names[(sample + offset) % names.length];
      raw[label].push(await measure(variants[label], expected, expectedTrace));
    }
    console.log(`${name}: verified sample ${sample + 1}/${samples}`);
  }
  const summary = Object.fromEntries(names.map((label) => [label, {
    medianMs: median(raw[label].map((s) => s.wallMs)), minMs: Math.min(...raw[label].map((s) => s.wallMs)), maxMs: Math.max(...raw[label].map((s) => s.wallMs)),
    medianCpuMs: median(raw[label].map((s) => s.cpuMs)), ...(expectedTrace ? { medianHostWaitMs: median(raw[label].map((s) => s.host.waitMs)) } : {}),
  }]));
  const result = { name, description, input, summary, samples: raw, exactResultDigest: digest(expected), traceDigest: expectedTrace ? digest(expectedTrace) : null };
  console.log(JSON.stringify({ name, mediansMs: Object.fromEntries(names.map((label) => [label, summary[label].medianMs])) }));
  return result;
}

const results = [];
results.push(await compare('modular-powers', 'All batch mapping and exponentiation execute in each implementation; inputs and Integer output class match.', {
  rix: () => ({ values: runPowerRix(powers) }),
  javascript: () => ({ values: powerBatch(powers.bases, powers.exponent, powers.modulus, selected).map((n) => new Integer(n)) }),
  native: () => ({ values: addon.powerBatch(powers.bases, powers.exponent, powers.modulus).map((n) => new Integer(n)) }),
  'js-binary-diagnostic': () => ({ values: powerBatch(powers.bases, powers.exponent, powers.modulus, 'binary').map((n) => new Integer(n)) }),
  'native-binary-diagnostic': () => ({ values: addon.binaryBatch(powers.bases, powers.exponent, powers.modulus).map((n) => new Integer(n)) }),
}, powerKeys, null, { count: powers.count, modulusBits: powers.bits, exponentBits: powers.exponentBits, seed: powers.seed, inputDigest: digest([powers.bases.map(String), String(powers.exponent), String(powers.modulus)]), selectedJsAlgorithm: selected }));

for (const [name, count, delayMs] of [
  ['async-microtasks', quick ? 64 : 2048, 0],
  ['async-host-latency', quick ? 16 : 128, 2],
]) {
  const fixture = makeAsyncFixture({ count });
  const referenceHost = createHost(fixture, { delayMs });
  const expected = integerKeys(await processJobs(fixture.jobs, fixture.bias, referenceHost, scoreBigInt));
  const wrap = (run) => async () => {
    const host = createHost(fixture, { delayMs });
    return { values: await run(host), host };
  };
  // Choose between the bounded exact Number implementation and BigInt using
  // separate training runs. Include all guards and host machinery in selection.
  const jsCandidates = { number: scoreNumber, bigint: scoreBigInt }, jsTimings = { number: [], bigint: [] };
  for (const score of Object.values(jsCandidates)) await processJobs(fixture.jobs, fixture.bias, createHost(fixture, { delayMs }), score);
  for (let round = 0; round < 3; round++) {
    for (const label of round % 2 ? ['bigint', 'number'] : ['number', 'bigint']) {
      const host = createHost(fixture, { delayMs }), started = performance.now();
      const result = await processJobs(fixture.jobs, fixture.bias, host, jsCandidates[label]);
      jsTimings[label].push(performance.now() - started);
      assert.deepEqual(integerKeys(result), expected); assert.deepEqual(host.trace, referenceHost.trace);
    }
  }
  const jsChoice = median(jsTimings.number) <= median(jsTimings.bigint) ? 'number' : 'bigint';
  results.push(await compare(name, 'Fresh lexical scopes and a captured bias in RiX; all versions preserve fetch/await/score/publish order. Native includes a C Promise state machine calling the same JS host capabilities.', {
    rix: wrap((host) => runAsyncRix(fixture, host)),
    javascript: wrap((host) => processJobs(fixture.jobs, fixture.bias, host, jsCandidates[jsChoice])),
    native: wrap((host) => addon.runWorkflow(fixture.jobs, fixture.bias.value, host.fetch, host.publish, Integer)),
    'native-hybrid-diagnostic': wrap((host) => processJobs(fixture.jobs, fixture.bias, host, addon.score)),
    'js-other-score-diagnostic': wrap((host) => processJobs(fixture.jobs, fixture.bias, host, jsCandidates[jsChoice === 'number' ? 'bigint' : 'number'])),
  }, expected, referenceHost.trace, { count, hostDelayMs: delayMs, bias: fixture.bias.value.toString(), seed: fixture.seed,
    inputDigest: digest(fixture.payloads.map((value) => value.value.toString())), deliberatelyRequestedWaitMs: count * delayMs,
    selectedJsScore: jsChoice, jsTuningSamplesMs: jsTimings }));
}

const sources = ['addon.c', 'build.js', 'optimized.js', 'workloads.js', 'bench.js', 'scripts/modular-powers.rix', 'scripts/async-scopes.rix'];
const sourceHashes = Object.fromEntries(await Promise.all(sources.map(async (path) => [path, createHash('sha256').update(await readFile(new URL(path, here))).digest('hex')])));
const parseTimes = {};
for (const [name, source] of [['modular-powers', powerSource], ['async-scopes', asyncSource]]) {
  const { rix } = await import('../runtime.js');
  const timings = [];
  for (let i = 0; i < 5; i++) { const started = performance.now(); rix.lower(rix.parse(rix.tokenize(source))); timings.push(performance.now() - started); }
  parseTimes[name] = timings;
}
const report = { timestamp: new Date().toISOString(), runtime: process.versions.bun ? `Bun ${process.versions.bun}` : `Node ${process.versions.node}`,
  versions: process.versions, machine: { platform: process.platform, arch: process.arch, osRelease: os.release(), cpu: os.cpus()[0]?.model },
  quick, timedSamplesPerVariant: samples,
  methodology: 'Complete lowered RiX scripts; fresh execution contexts, input binding and function installation timed, parsing/default host-capability setup excluded. Handwritten JS algorithm search precedes held-out samples; each power batch prepares its schedule and reduction constants inside timing. Native in-process C/GMP through Node-API; BigInt transfer and Integer reconstruction timed. Same async host callbacks, delays, error behavior and sequential effect trace. One warm run per variant; rotated order; every exact output and async trace checked outside timing; compilation measured separately in a fresh artifact cache. CPU is process-wide, sampled alongside wall time. No browser, network or production modifications.',
  builds: { fresh: fresh.build, normal: cached.build }, rixHostCapabilitySetupMs: asyncSystemSetupMs,
  jsTuning: { candidates: tuning, selected }, parseTimes, sourceHashes, workloads: results,
};
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
const lines = ['# Whole-script comparison', '', `${report.runtime}, ${report.machine.cpu}; ${samples} samples after a warm run.`, '',
  '| Workload | RiX ms | Tuned JS ms | Native ms | RiX / JS | JS / Native |', '|---|---:|---:|---:|---:|---:|'];
for (const workload of results) {
  const s = workload.summary;
  lines.push(`| ${workload.name} | ${s.rix.medianMs.toFixed(3)} | ${s.javascript.medianMs.toFixed(3)} | ${s.native.medianMs.toFixed(3)} | ${(s.rix.medianMs / s.javascript.medianMs).toFixed(2)}× | ${(s.javascript.medianMs / s.native.medianMs).toFixed(2)}× |`);
}
lines.push('', `Selected JavaScript arithmetic algorithm: ${selected}. Fresh native preparation: ${fresh.build.prepareMs.toFixed(2)} ms.`, '', 'Complete measurements, diagnostics, compilation/parse costs, source/input/result digests and host-wait timings are in the matching JSON report.', '');
await writeFile(output.replace(/\.json$/, '') + '.md', lines.join('\n'));
console.log(`Saved ${output}`);
